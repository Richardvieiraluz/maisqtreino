"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSessao } from "../auth";
import { createAdminClient } from "../supabase/admin";
import { supabaseConfigurado } from "../supabase/env";

// Ações do Master. Cada uma confere o papel de novo: uma Server Action pode ser chamada direto,
// sem passar pela tela.

type Resultado = { ok: true; msg: string } | { ok: false; error: string };
const DIA = 86_400_000;
const texto = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function exigirMaster(): Promise<string | null> {
  if (!supabaseConfigurado()) return "Disponível quando o banco estiver ligado.";
  const s = await getSessao();
  return s?.papel === "master" ? null : "Só o Master pode fazer isso.";
}

async function enderecoDoApp() {
  const h = await headers();
  return h.get("origin") ?? process.env.APP_BASE_URL ?? "https://maisqtreino.vercel.app";
}

/** Acesso dado pelo Master: assinatura vale 30 ou 365 dias; programa é vitalício. */
async function gravarAcesso(alunoId: string, produtoId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data: produto } = await db.from("produtos").select("id, nome, periodo").eq("id", produtoId).maybeSingle();
  if (!produto) return "Produto não encontrado.";
  const dias = produto.periodo === "mensal" ? 30 : produto.periodo === "anual" ? 365 : null;
  const { error } = await db.from("acessos").upsert(
    {
      aluno_id: alunoId,
      produto_id: produto.id,
      status: "ativo",
      inicio: new Date().toISOString(),
      valido_ate: dias ? new Date(Date.now() + dias * DIA).toISOString() : null,
      liberado_por: "master",
    },
    { onConflict: "aluno_id,produto_id" },
  );
  if (error) {
    console.error("[master] liberar acesso falhou", { code: error.code });
    return "Não deu para liberar o acesso.";
  }
  return null;
}

export async function convidarAlunoAction(nomeBruto: string, emailBruto: string, produtoId: string): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const nome = texto(nomeBruto, 80);
  const email = texto(emailBruto, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "E-mail inválido." };

  const db = createAdminClient();
  const convite = await db.auth.admin.inviteUserByEmail(email, { data: { nome }, redirectTo: `${await enderecoDoApp()}/entrar/senha` });
  let id = convite.data.user?.id ?? "";
  let jaTinhaConta = false;
  if (!id) {
    // Já tem conta: só libera o acesso (o login dele continua o mesmo).
    const { data } = await db.from("perfis").select("id").eq("email", email).maybeSingle();
    if (!data) {
      console.error("[master] convite falhou", { status: convite.error?.status, code: convite.error?.code });
      return { ok: false, error: convite.error?.status === 429 ? "Limite de e-mails do Supabase atingido. Tente mais tarde." : "Não deu para enviar o convite." };
    }
    id = data.id;
    jaTinhaConta = true;
  }
  if (nome) await db.from("perfis").update({ nome }).eq("id", id);
  if (produtoId) {
    const erro = await gravarAcesso(id, produtoId);
    if (erro) return { ok: false, error: erro };
  }
  revalidatePath("/master", "layout");
  return { ok: true, msg: jaTinhaConta ? "Essa pessoa já tinha conta. Acesso liberado." : `Convite enviado para ${email}.` };
}

export async function liberarAcessoAction(alunoId: string, produtoId: string): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const erro = await gravarAcesso(texto(alunoId, 64), texto(produtoId, 64));
  if (erro) return { ok: false, error: erro };
  revalidatePath("/master", "layout");
  return { ok: true, msg: "Acesso liberado." };
}

export async function reenviarLoginAction(alunoId: string): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const db = createAdminClient();
  const { data } = await db.from("perfis").select("email").eq("id", texto(alunoId, 64)).maybeSingle();
  if (!data) return { ok: false, error: "Aluno não encontrado." };
  const { error } = await db.auth.resetPasswordForEmail(data.email, { redirectTo: `${await enderecoDoApp()}/entrar/senha` });
  if (error) return { ok: false, error: error.status === 429 ? "Limite de e-mails do Supabase atingido. Tente mais tarde." : "Não deu para enviar." };
  return { ok: true, msg: `Link para criar senha enviado para ${data.email}.` };
}

// ── Protocolos: auditoria ───────────────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function auditarProtocoloAction(protocoloId: string, aprovado: boolean, notaBruta = ""): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  if (!UUID.test(String(protocoloId))) return { ok: false, error: "Protocolo inválido." };
  const nota = texto(notaBruta, 1000);
  if (!aprovado && !nota) return { ok: false, error: "Descreva o problema." };
  const { error } = await createAdminClient()
    .from("protocolos")
    .update({ auditoria: aprovado ? "aprovado" : "problema", auditoria_nota: aprovado ? null : nota })
    .eq("id", protocoloId);
  if (error) return { ok: false, error: "Não deu para salvar." };
  revalidatePath("/master/protocolos");
  return { ok: true, msg: aprovado ? "Aprovado. Próxima amostra." : "Problema anotado. O protocolo fica marcado para revisão." };
}

// ── Explicações ─────────────────────────────────────────────────────────────

export async function salvarExplicacaoAction(d: { exercicioId: string; posicao: string; movimento: string; cuidado: string }): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  if (!UUID.test(String(d.exercicioId))) return { ok: false, error: "Exercício inválido." };
  const campos = { posicao_inicial: texto(d.posicao, 300), movimento: texto(d.movimento, 400), cuidado: texto(d.cuidado, 300) };
  if (!campos.posicao_inicial || !campos.movimento || !campos.cuidado) return { ok: false, error: "Preencha os três campos." };
  // Texto mudou: volta a pendente se já tinha áudio (o áudio era do texto antigo).
  const { error } = await createAdminClient().from("explicacoes").update({ ...campos, status: "aprovado", aprovado_em: new Date().toISOString(), audio_url: null }).eq("exercicio_id", d.exercicioId);
  if (error) return { ok: false, error: "Não deu para salvar." };
  revalidatePath("/master/explicacoes");
  return { ok: true, msg: "Salvo e aprovado." };
}

export async function aprovarExplicacoesAction(ids: string[]): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const validos = (Array.isArray(ids) ? ids : []).filter((x) => UUID.test(String(x))).slice(0, 100);
  if (!validos.length) return { ok: false, error: "Nada para aprovar." };
  const { error } = await createAdminClient().from("explicacoes").update({ status: "aprovado", aprovado_em: new Date().toISOString() }).in("exercicio_id", validos).eq("status", "pendente");
  if (error) return { ok: false, error: "Não deu para aprovar." };
  revalidatePath("/master/explicacoes");
  return { ok: true, msg: validos.length === 1 ? "Aprovada." : `${validos.length} aprovadas.` };
}

/** Gera a explicação dos próximos exercícios sem texto. Primeiro os que já estão em treinos gerados. */
export async function gerarExplicacoesAction(quantos = 8): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const { iaConfigurada, pedirJson } = await import("../ia-treino/modelo");
  if (!iaConfigurada()) return { ok: false, error: "Falta a chave da IA (ANTHROPIC_API_KEY) na Vercel." };
  const { SISTEMA_EXPLICACOES, SCHEMA_EXPLICACOES, pedidoExplicacoes, lerExplicacoes } = await import("../ia-treino/explicacoes");
  const db = createAdminClient();
  const feitos = new Set<string>();
  for (let de = 0; ; de += 1000) {
    const { data } = await db.from("explicacoes").select("exercicio_id").order("exercicio_id").range(de, de + 999);
    (data ?? []).forEach((x) => feitos.add(x.exercicio_id));
    if (!data || data.length < 1000) break;
  }
  // Exercícios dos treinos gerados mais recentes vêm na frente.
  const { data: recentes } = await db.from("protocolo_treinos").select("conteudo").eq("status", "pronto").order("gerado_em", { ascending: false }).limit(60);
  const prioridade: string[] = [];
  for (const t of recentes ?? [])
    for (const b of (t.conteudo as { blocks?: { exercises?: { exerciseId?: string }[] }[] })?.blocks ?? [])
      for (const x of b.exercises ?? []) if (x.exerciseId && !feitos.has(x.exerciseId) && !prioridade.includes(x.exerciseId)) prioridade.push(x.exerciseId);
  const n = Math.max(1, Math.min(12, Math.round(quantos)));
  let ids = prioridade.slice(0, n);
  if (ids.length < n) {
    for (let de = 0; ids.length < n; de += 1000) {
      const { data } = await db.from("exercicios").select("id").eq("ativo", true).order("nome").range(de, de + 999);
      for (const x of data ?? []) if (!feitos.has(x.id) && !ids.includes(x.id) && ids.length < n) ids.push(x.id);
      if (!data || data.length < 1000) break;
    }
  }
  if (!ids.length) return { ok: true, msg: "Todos os exercícios já têm explicação." };
  const { data: exercicios } = await db.from("exercicios").select("id, nome, modalidade, material, equipamentos, posicao, musculos, padroes, unilateral").in("id", ids);
  ids = (exercicios ?? []).map((x) => x.id);
  let textos;
  try {
    const saida = await pedirJson(SISTEMA_EXPLICACOES, pedidoExplicacoes(exercicios ?? []), SCHEMA_EXPLICACOES as unknown as Record<string, unknown>);
    textos = lerExplicacoes(saida, new Set(ids));
  } catch (e) {
    console.error("[explicacoes] IA falhou", e instanceof Error ? e.message : "erro");
    return { ok: false, error: "A IA não respondeu. Tente de novo em instantes." };
  }
  if (!textos.length) return { ok: false, error: "A IA não devolveu textos válidos. Tente de novo." };
  const { error } = await db.from("explicacoes").upsert(
    textos.map((t) => ({ exercicio_id: t.id, posicao_inicial: t.posicaoInicial, movimento: t.movimento, cuidado: t.cuidado, status: "pendente" })),
    { onConflict: "exercicio_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: "Não deu para gravar os textos." };
  revalidatePath("/master/explicacoes");
  return { ok: true, msg: `${textos.length} explicações novas para revisar.` };
}

// ── Vitrine ─────────────────────────────────────────────────────────────────

export async function publicarVitrineAction(fileiras: { titulo: string; estilo: string; visivel: boolean }[]): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const lista = (Array.isArray(fileiras) ? fileiras : []).slice(0, 30).map((f, i) => ({
    titulo: texto(f?.titulo, 80),
    estilo: ["cards", "tiles", "automatica"].includes(f?.estilo) ? f.estilo : "cards",
    visivel: f?.visivel !== false,
    ordem: i,
  }));
  if (!lista.length || lista.some((f) => !f.titulo)) return { ok: false, error: "Vitrine inválida." };
  const db = createAdminClient();
  // Troca a vitrine inteira: apaga e grava na ordem nova.
  const { error: e1 } = await db.from("fileiras_vitrine").delete().gte("ordem", -32768);
  if (e1) return { ok: false, error: "Não deu para publicar." };
  const { error } = await db.from("fileiras_vitrine").insert(lista);
  if (error) return { ok: false, error: "Não deu para publicar." };
  revalidatePath("/", "layout");
  return { ok: true, msg: "Vitrine publicada. Os alunos veem a nova ordem ao abrir o app." };
}
