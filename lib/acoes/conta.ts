"use server";

import { getSessao } from "../auth";
import type { RespostasQuiz } from "../quiz";
import { prepararProtocolo } from "../dados/treinos";
import { createAdminClient } from "../supabase/admin";
import { prontoBloqueado } from "../treinos-prontos";

// Ações do aluno logado. O id vem sempre da sessão, nunca do navegador.

const CAMPOS_TEXTO = ["sexo", "idade", "objetivo", "nivel", "local", "equip", "dias", "tempo"] as const;
const CAMPOS_LISTA = ["equipamentos", "regioes", "dores"] as const;

/** Só os campos conhecidos do quiz, com tamanho limitado. */
function limparQuiz(bruto: unknown): RespostasQuiz | null {
  if (!bruto || typeof bruto !== "object") return null;
  const b = bruto as Record<string, unknown>;
  const r: RespostasQuiz = {};
  for (const k of CAMPOS_TEXTO) if (typeof b[k] === "string") r[k] = (b[k] as string).slice(0, 80);
  for (const k of CAMPOS_LISTA)
    if (Array.isArray(b[k])) r[k] = (b[k] as unknown[]).filter((v): v is string => typeof v === "string").slice(0, 30).map((v) => v.slice(0, 60));
  return r;
}

const quizCompleto = (r: RespostasQuiz) => !!(r.objetivo && r.nivel && r.local && r.equip && r.dias && r.tempo);

/** Cada vez que o quiz (ou parte dele, como local e equipamentos) muda, grava uma versão nova. */
export async function salvarQuizAction(bruto: RespostasQuiz): Promise<{ ok: true } | { ok: false; error: string }> {
  const sessao = await getSessao();
  if (!sessao) return { ok: false, error: "sem sessão" };
  const respostas = limparQuiz(bruto);
  if (!respostas) return { ok: false, error: "respostas inválidas" };
  const { data, error } = await createAdminClient().from("respostas_quiz").insert({ aluno_id: sessao.id, respostas }).select("id").single();
  if (error) {
    console.error("[quiz] gravação falhou", { code: error.code });
    return { ok: false, error: "falha ao gravar" };
  }
  // Quiz completo: protocolo (novo só se o perfil mudou), com a primeira leva de treinos na fila.
  if (sessao.papel === "aluno" && quizCompleto(respostas)) {
    try {
      await prepararProtocolo(sessao.id, data.id, respostas);
    } catch (e) {
      console.error("[quiz] protocolo não foi criado", e instanceof Error ? e.message : "erro");
    }
  }
  return { ok: true };
}

/** Treino concluído: grava a sessão (só de treino pronto do protocolo ativo do próprio aluno). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const numero = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v * 10) / 10 : undefined);

/** Séries vindas do navegador: só os campos conhecidos, com limites. */
function limparSeries(bruto: unknown) {
  if (!Array.isArray(bruto)) return [];
  return bruto.slice(0, 300).flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const b = x as Record<string, unknown>;
    if (typeof b.exercicioId !== "string" || !UUID.test(b.exercicioId)) return [];
    const reps = numero(b.reps, 500), segundos = numero(b.segundos, 3600), carga = numero(b.carga, 500), serie = numero(b.serie, 50);
    const dor = b.dor === "leve" || b.dor === "forte" ? b.dor : undefined;
    return [{ exercicioId: b.exercicioId, nome: String(b.nome ?? "").slice(0, 120), serie: dor ? 0 : (serie ?? 1), ...(reps !== undefined && !dor && { reps }), ...(segundos !== undefined && !dor && { segundos }), ...(carga && !dor ? { carga } : {}), ...(dor && { dor }) }];
  });
}

function limparTrocas(bruto: unknown) {
  if (!Array.isArray(bruto)) return [];
  return bruto.slice(0, 40).flatMap((x) => {
    const b = (x ?? {}) as Record<string, unknown>;
    if (typeof b.de !== "string" || typeof b.para !== "string" || !UUID.test(b.de) || !UUID.test(b.para) || b.de === b.para) return [];
    return [{ de: b.de, para: b.para, motivo: b.motivo === "dor" ? "dor" : "dificil" }];
  });
}

export async function registrarSessaoAction(d: {
  /** Treino do protocolo do aluno, ou... */
  protocoloTreinoId?: string;
  /** ...treino pronto da vitrine (publicado e liberado para o aluno). */
  treinoId?: string;
  duracaoSeg: number;
  avaliacao: string | null;
  teveDor: boolean;
  series?: unknown;
  trocas?: unknown;
  /** Saiu no meio (dor): grava sem concluir, para não contar como treino feito. */
  interrompida?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sessao = await getSessao();
  if (!sessao) return { ok: false, error: "sem sessão" };
  const db = createAdminClient();
  const pronto = d.treinoId ? String(d.treinoId).slice(0, 40) : null;
  const id = pronto ? "" : String(d.protocoloTreinoId ?? "").slice(0, 64);
  const coluna = pronto ? "treino_id" : "protocolo_treino_id";
  if (pronto) {
    const { data: tp } = await db.from("treinos").select("id, tipo, produto_id, publicado").eq("id", pronto).maybeSingle();
    if (!tp || (!tp.publicado && sessao.papel !== "master") || (sessao.papel !== "master" && prontoBloqueado({ tipo: tp.tipo, produtoId: tp.produto_id }, sessao.estado, sessao.programas))) return { ok: false, error: "treino não encontrado" };
  } else {
    const { data: t } = await db.from("protocolo_treinos").select("id, status, protocolos!inner(aluno_id, ativo)").eq("id", id).maybeSingle();
    const dono = t?.protocolos as unknown as { aluno_id: string; ativo: boolean } | undefined;
    if (!t || t.status !== "pronto" || dono?.aluno_id !== sessao.id) return { ok: false, error: "treino não encontrado" };
  }
  // Mesmo treino concluído duas vezes (voltou e terminou de novo) conta uma vez só no dia.
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  const interrompida = d.interrompida === true;
  const { data: ja } = interrompida ? { data: null } : await db.from("sessoes").select("id").eq("aluno_id", sessao.id).eq(coluna, pronto ?? id).gte("concluida_em", `${hoje}T03:00:00Z`).limit(1);
  if (ja?.length) return { ok: true };
  const duracao = Math.max(0, Math.min(6 * 3600, Math.round(Number(d.duracaoSeg) || 0)));
  const avaliacao = ["facil", "ideal", "dificil"].includes(String(d.avaliacao)) ? d.avaliacao : null;
  const agora = new Date();
  const { data: nova, error } = await db.from("sessoes").insert({
    aluno_id: sessao.id,
    protocolo_treino_id: pronto ? null : id,
    treino_id: pronto,
    iniciada_em: new Date(agora.getTime() - duracao * 1000).toISOString(),
    concluida_em: interrompida ? null : agora.toISOString(),
    duracao_seg: duracao,
    avaliacao,
    teve_dor: !!d.teveDor,
    series: limparSeries(d.series),
  }).select("id").single();
  if (error) {
    console.error("[sessao] gravação falhou", { code: error.code });
    return { ok: false, error: "falha ao gravar" };
  }
  // Trocas: alimentam "Mais trocados" do Master. Falha aqui não desfaz o treino.
  const trocas = limparTrocas(d.trocas);
  if (trocas.length) {
    const { error: e2 } = await db.from("trocas_exercicio").insert(trocas.map((t) => ({ aluno_id: sessao.id, sessao_id: nova.id, exercicio_de: t.de, exercicio_para: t.para, motivo: t.motivo })));
    if (e2) console.error("[troca] gravação falhou", { code: e2.code });
  }
  return { ok: true };
}
