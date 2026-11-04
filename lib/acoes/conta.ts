"use server";

import { getSessao } from "../auth";
import type { RespostasQuiz } from "../quiz";
import { prepararProtocolo } from "../dados/treinos";
import { createAdminClient } from "../supabase/admin";

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
export async function registrarSessaoAction(d: { protocoloTreinoId: string; duracaoSeg: number; avaliacao: string | null; teveDor: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  const sessao = await getSessao();
  if (!sessao) return { ok: false, error: "sem sessão" };
  const db = createAdminClient();
  const id = String(d.protocoloTreinoId ?? "").slice(0, 64);
  const { data: t } = await db.from("protocolo_treinos").select("id, status, protocolos!inner(aluno_id, ativo)").eq("id", id).maybeSingle();
  const dono = t?.protocolos as unknown as { aluno_id: string; ativo: boolean } | undefined;
  if (!t || t.status !== "pronto" || dono?.aluno_id !== sessao.id) return { ok: false, error: "treino não encontrado" };
  // Mesmo treino concluído duas vezes (voltou e terminou de novo) conta uma vez só no dia.
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  const { data: ja } = await db.from("sessoes").select("id").eq("aluno_id", sessao.id).eq("protocolo_treino_id", id).gte("concluida_em", `${hoje}T03:00:00Z`).limit(1);
  if (ja?.length) return { ok: true };
  const duracao = Math.max(0, Math.min(6 * 3600, Math.round(Number(d.duracaoSeg) || 0)));
  const avaliacao = ["facil", "ideal", "dificil"].includes(String(d.avaliacao)) ? d.avaliacao : null;
  const agora = new Date();
  const { error } = await db.from("sessoes").insert({
    aluno_id: sessao.id,
    protocolo_treino_id: id,
    iniciada_em: new Date(agora.getTime() - duracao * 1000).toISOString(),
    concluida_em: agora.toISOString(),
    duracao_seg: duracao,
    avaliacao,
    teve_dor: !!d.teveDor,
  });
  if (error) {
    console.error("[sessao] gravação falhou", { code: error.code });
    return { ok: false, error: "falha ao gravar" };
  }
  return { ok: true };
}
