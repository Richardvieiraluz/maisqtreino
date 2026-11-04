// IA de treino v2 — TEMPO ESTIMADO da aula no rascunho (Richard, 25/10/2026). PURO.
//
// Regra da prescrição (regrasGerais.tempoEstimado, prescricao-v1.json): "3 s por
// repetição, unilateral em dobro, exercício por tempo usa o próprio tempo" — mais os
// descansos (entre exercícios, entre séries e após o bloco). SÓ INFORMATIVO: não limita
// a montagem nem corta exercício; a duração da aula é a referência duracaoMin da
// prescrição (reformer 50, pilates 60, funcional 60).
//
// Conta: bloco = Σ séries [ Σ exercícios (tempo da série + descanso do exercício) ]
//              + (nº de séries − 1) × descanso entre séries + descanso após o bloco.
// Unilateral: fora do Reformer é 1 linha ("12 do lado direito e 12 do lado esquerdo"),
// então a série conta em dobro; no Reformer já são 2 linhas (lado direito e esquerdo),
// cada uma conta uma vez. Alvo sem número legível conta 0 e entra em `semDado`.

import { prescricao } from "../prescricao";
import { repsDoAlvo, segundosDoAlvo } from "./validar";

export const SEGUNDOS_POR_REP = 3;

export interface SerieTempo { type: "repetition" | "time"; target: string }
export interface LinhaTempo { exerciseId: string; series: readonly SerieTempo[]; restSec: number }
export interface BlocoTempo { numberSeries: number; restBetweenSeriesSec: number; restAfterBlockSec: number | null; exercises: readonly LinhaTempo[] }

const media = (ns: readonly number[]) => Math.round(ns.reduce((s, n) => s + n, 0) / ns.length);

/** Segundos de UMA série. null = alvo sem número (não dá para estimar). */
export function segundosDaSerie(s: SerieTempo, unilateralEmDobro: boolean): number | null {
  let base: number | null;
  if (s.type === "time") { const seg = segundosDoAlvo(s.target); base = seg && seg.length ? media(seg) : null; }
  else { const reps = repsDoAlvo(s.target); base = reps.length ? media(reps) * SEGUNDOS_POR_REP : null; }
  if (base === null) return null;
  return unilateralEmDobro ? base * 2 : base;
}

export interface TempoEstimado { totalSeg: number; porBlocoSeg: number[]; semDado: number }

export function tempoEstimadoSeg(blocks: readonly BlocoTempo[], unilateral: Readonly<Record<string, boolean>>, familia: string): TempoEstimado {
  let semDado = 0;
  const porBlocoSeg = blocks.map((b, bi) => {
    const n = Math.max(0, Math.floor(b.numberSeries));
    let t = 0;
    for (let si = 0; si < n; si++) {
      for (const x of b.exercises) {
        const s = x.series[si] ?? x.series[x.series.length - 1];
        if (!s) continue;
        const seg = segundosDaSerie(s, familia !== "reformer" && unilateral[x.exerciseId] === true);
        if (seg === null) semDado++; else t += seg;
        t += Math.max(0, x.restSec);
      }
    }
    if (n > 1) t += (n - 1) * Math.max(0, b.restBetweenSeriesSec);
    if (bi < blocks.length - 1 && b.restAfterBlockSec) t += Math.max(0, b.restAfterBlockSec);
    return t;
  });
  return { totalSeg: porBlocoSeg.reduce((s, x) => s + x, 0), porBlocoSeg, semDado };
}

/** Duração da aula de referência (prescrição): Reformer 50; famílias de aparelho 60; funcionais 60. */
export function duracaoAulaMin(familia: string): number {
  const d = prescricao().duracaoMin;
  if (familia === "reformer") return d.reformer;
  if (familia === "pilates" || familia === "protocolo_dor" || familia === "gestante" || familia === "alongamento") return d.pilates;
  return d.funcional;
}

export const textoTempoEstimado = (totalSeg: number, aulaMin: number) => `≈ ${Math.round(totalSeg / 60)} min (aula: ${aulaMin} min)`;
export const DETALHE_TEMPO_ESTIMADO = `Só informativo: ${SEGUNDOS_POR_REP} s por repetição, unilateral em dobro, exercício por tempo usa o próprio tempo, mais os descansos. Não corta exercício.`;
