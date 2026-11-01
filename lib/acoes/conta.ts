"use server";

import { getSessao } from "../auth";
import type { RespostasQuiz } from "../quiz";
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

/** Cada vez que o quiz (ou parte dele, como local e equipamentos) muda, grava uma versão nova. */
export async function salvarQuizAction(bruto: RespostasQuiz): Promise<{ ok: true } | { ok: false; error: string }> {
  const sessao = await getSessao();
  if (!sessao) return { ok: false, error: "sem sessão" };
  const respostas = limparQuiz(bruto);
  if (!respostas) return { ok: false, error: "respostas inválidas" };
  const { error } = await createAdminClient().from("respostas_quiz").insert({ aluno_id: sessao.id, respostas });
  if (error) {
    console.error("[quiz] gravação falhou", { code: error.code });
    return { ok: false, error: "falha ao gravar" };
  }
  return { ok: true };
}
