import "server-only";
import { criaConta, mudancaDoAcesso, type AvisoLido, type Periodo } from "../eduzz";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";

// Aplica um aviso da Eduzz no banco. Erro de banco vira exceção (o webhook responde 500 e a Eduzz
// tenta de novo); o que não tem conserto (produto não cadastrado, aluno inexistente) fica registrado
// em eventos_eduzz.erro e responde 200.

export class ErroTemporario extends Error {}

export type Resultado = { situacao: "repetido" | "ignorado" | "aplicado"; detalhe: string };

async function acharOuCriarAluno(db: SupabaseClient, email: string, nome: string, podeCriar: boolean, endereco: string): Promise<{ id: string; criado: boolean } | null> {
  const { data, error } = await db.from("perfis").select("id").eq("email", email).maybeSingle();
  if (error) throw new ErroTemporario(`perfis: ${error.code}`);
  if (data) return { id: data.id, criado: false };
  if (!podeCriar) return null;
  // Conta nova: a pessoa recebe o e-mail para criar a senha.
  const convite = await db.auth.admin.inviteUserByEmail(email, { data: { nome }, redirectTo: `${endereco}/entrar/senha` });
  if (convite.data.user) return { id: convite.data.user.id, criado: true };
  // Corrida: outro aviso criou a conta ao mesmo tempo.
  const deNovo = await db.from("perfis").select("id").eq("email", email).maybeSingle();
  if (deNovo.data) return { id: deNovo.data.id, criado: false };
  throw new ErroTemporario(`convite: ${convite.error?.status ?? "?"} ${convite.error?.code ?? ""}`);
}

/** db só é passado nos testes (banco em memória); no app é sempre a chave de serviço. */
export async function aplicarAviso(aviso: AvisoLido, endereco: string, db: SupabaseClient = createAdminClient()): Promise<Resultado> {

  // Registro e proteção contra aviso repetido: a chave é única.
  const { data: ja } = await db.from("eventos_eduzz").select("id, processado_em").eq("chave", aviso.chave).maybeSingle();
  if (ja?.processado_em) return { situacao: "repetido", detalhe: "aviso já aplicado" };
  if (!ja) {
    const { error } = await db.from("eventos_eduzz").insert({ chave: aviso.chave, tipo: aviso.evento, email: aviso.email, payload: aviso.resumo });
    if (error && error.code !== "23505") throw new ErroTemporario(`eventos_eduzz: ${error.code}`);
  }
  const concluir = async (erro: string | null) => {
    const { error } = await db.from("eventos_eduzz").update({ processado_em: new Date().toISOString(), erro }).eq("chave", aviso.chave);
    if (error) throw new ErroTemporario(`eventos_eduzz update: ${error.code}`);
  };

  if (!aviso.fato || !aviso.produtos.length) {
    await concluir(null);
    return { situacao: "ignorado", detalhe: "evento sem efeito no acesso" };
  }
  if (!aviso.email) {
    await concluir("aviso sem e-mail");
    return { situacao: "ignorado", detalhe: "sem e-mail" };
  }

  const { data: produtos, error: erroProdutos } = await db.from("produtos").select("id, periodo, eduzz_produto_id").in("eduzz_produto_id", aviso.produtos);
  if (erroProdutos) throw new ErroTemporario(`produtos: ${erroProdutos.code}`);
  const conhecidos = produtos ?? [];
  const desconhecidos = aviso.produtos.filter((p) => !conhecidos.some((c) => c.eduzz_produto_id === p));
  if (!conhecidos.length) {
    await concluir(`produto da Eduzz não cadastrado: ${desconhecidos.join(", ")}`);
    return { situacao: "ignorado", detalhe: "produto não cadastrado" };
  }

  const aluno = await acharOuCriarAluno(db, aviso.email, aviso.nome, criaConta(aviso.fato), endereco);
  if (!aluno) {
    await concluir("aluno sem conta (o aviso não cria conta)");
    return { situacao: "ignorado", detalhe: "aluno sem conta" };
  }
  if (aluno.criado && aviso.nome) await db.from("perfis").update({ nome: aviso.nome }).eq("id", aluno.id);

  const feitos: string[] = [];
  for (const p of conhecidos) {
    const mudanca = mudancaDoAcesso(p.periodo as Periodo, aviso.fato);
    if (!mudanca) continue;
    const { data: atual, error: erroAtual } = await db.from("acessos").select("id").eq("aluno_id", aluno.id).eq("produto_id", p.id).maybeSingle();
    if (erroAtual) throw new ErroTemporario(`acessos: ${erroAtual.code}`);
    const campos: Record<string, unknown> = {
      status: mudanca.status,
      liberado_por: "eduzz",
      ...(mudanca.validoAte !== undefined ? { valido_ate: mudanca.validoAte } : {}),
      ...(aviso.contratoId ? { eduzz_contrato_id: aviso.contratoId } : {}),
      ...(aviso.faturaId ? { eduzz_fatura_id: aviso.faturaId } : {}),
    };
    if (atual) {
      const { error } = await db.from("acessos").update(campos).eq("id", atual.id);
      if (error) throw new ErroTemporario(`acessos update: ${error.code}`);
    } else {
      // Só fatos que dão acesso criam a linha; pausar ou reembolsar o que não existe não faz nada.
      if (mudanca.status !== "ativo") continue;
      const { error } = await db.from("acessos").insert({ aluno_id: aluno.id, produto_id: p.id, ...campos });
      if (error) throw new ErroTemporario(`acessos insert: ${error.code}`);
    }
    feitos.push(`${p.id}: ${mudanca.status}`);
  }

  await concluir(desconhecidos.length ? `produto da Eduzz não cadastrado: ${desconhecidos.join(", ")}` : null);
  return { situacao: "aplicado", detalhe: feitos.join("; ") || "nada a mudar" };
}
