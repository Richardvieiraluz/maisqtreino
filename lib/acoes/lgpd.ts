"use server";

import { getSessao } from "../auth";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { supabaseConfigurado } from "../supabase/env";

// LGPD do aluno logado: baixar os dados do servidor, revogar o uso dos dados de saúde e excluir a
// conta. O id vem sempre da sessão. Fotos do corpo nunca sobem: ficam só no aparelho.

type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; error: string };

export async function baixarMeusDadosAction(): Promise<Resultado<Record<string, unknown>>> {
  if (!supabaseConfigurado()) return { ok: true, dados: {} };
  const s = await getSessao();
  if (!s) return { ok: false, error: "Entre na sua conta de novo." };
  const db = createAdminClient();
  const [perfil, acessos, quiz, consent, protocolos, sessoes, trocas] = await Promise.all([
    db.from("perfis").select("nome, email, telefone, criado_em").eq("id", s.id).maybeSingle(),
    db.from("acessos").select("produto_id, status, inicio, valido_ate, criado_em").eq("aluno_id", s.id),
    db.from("respostas_quiz").select("respostas, criado_em").eq("aluno_id", s.id).order("criado_em"),
    db.from("consentimentos").select("tipo, versao, prontidao, aceito_em, revogado_em").eq("aluno_id", s.id).order("aceito_em"),
    db.from("protocolos").select("id, local, nivel, ativo, criado_em, protocolo_treinos(posicao, titulo, status, gerado_em)").eq("aluno_id", s.id).order("criado_em"),
    db.from("sessoes").select("iniciada_em, concluida_em, duracao_seg, avaliacao, teve_dor, series").eq("aluno_id", s.id).order("iniciada_em"),
    db.from("trocas_exercicio").select("exercicio_de, exercicio_para, motivo, criado_em").eq("aluno_id", s.id).order("criado_em"),
  ]);
  return {
    ok: true,
    dados: {
      geradoEm: new Date().toISOString(),
      conta: perfil.data,
      acessos: acessos.data ?? [],
      quiz: quiz.data ?? [],
      consentimentos: consent.data ?? [],
      protocolos: protocolos.data ?? [],
      treinosFeitos: sessoes.data ?? [],
      trocasDeExercicio: trocas.data ?? [],
    },
  };
}

export async function revogarDadosSaudeAction(): Promise<Resultado> {
  if (!supabaseConfigurado()) return { ok: true };
  const s = await getSessao();
  if (!s) return { ok: false, error: "Entre na sua conta de novo." };
  const { error } = await createAdminClient()
    .from("consentimentos")
    .update({ revogado_em: new Date().toISOString() })
    .eq("aluno_id", s.id)
    .eq("tipo", "dados_saude")
    .is("revogado_em", null);
  if (error) return { ok: false, error: "Não deu para registrar. Tente de novo." };
  return { ok: true };
}

/** Apaga a conta e tudo que depende dela (perfil, quiz, protocolos, treinos feitos, trocas). */
export async function excluirContaAction(confirmacao: string): Promise<Resultado> {
  if (!supabaseConfigurado()) return { ok: true };
  if (confirmacao !== "EXCLUIR") return { ok: false, error: "Confirmação inválida." };
  const s = await getSessao();
  if (!s) return { ok: false, error: "Entre na sua conta de novo." };
  if (s.papel === "master") return { ok: false, error: "A conta Master não pode ser excluída por aqui." };
  const { error } = await createAdminClient().auth.admin.deleteUser(s.id);
  if (error) {
    console.error("[lgpd] exclusão falhou", { status: error.status });
    return { ok: false, error: "Não deu para excluir agora. Tente de novo ou fale com o suporte." };
  }
  await (await createClient()).auth.signOut().catch(() => undefined);
  return { ok: true };
}
