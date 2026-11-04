// IA de treino v2 — aplicar a TROCA de um exercício no rascunho do editor (Richard,
// 25/10/2026). PURO (sem React, sem banco): usado pelo WorkoutsClient e pelo teste.
//
// O que a troca mantém: séries (tipo, alvo, carga), descanso do exercício e a posição
// na lista. O que muda: exercício (id, nome, vídeo) e a observação — a observação da
// IA era sobre o exercício que saiu, então não vai junto; o código reescreve só o que
// é dele: "lado direito"/"lado esquerdo" na dupla do Reformer e "N do lado direito e
// N do lado esquerdo" no unilateral de 1 linha (Pilates e outras famílias).
//
// Reformer: o unilateral são 2 linhas SEGUIDAS do mesmo exercício; a troca pega as duas
// (unilateral por unilateral é regra dos substitutos, então o nº de posições não muda).

import { LADO_DIREITO, LADO_ESQUERDO, observacaoDosLados } from "./rascunho";

export interface LinhaTroca {
  localId: string;
  exerciseId: string;
  exerciseName: string;
  videoUrl?: string;
  series: Array<{ type: "repetition" | "time"; target: string; weight: string }>;
  restSec: number;
  comments: string;
}
export interface BlocoTroca<L extends LinhaTroca = LinhaTroca> { localId: string; exercises: L[] }

export interface NovoExercicio { exerciseId: string; nome: string; videoUrl: string; unilateral: boolean }

/** Linhas que a troca substitui no bloco: a própria e, no Reformer, a vizinha da dupla
 *  (mesmo exerciseId logo antes ou logo depois). */
export function linhasDaTroca(exercises: readonly LinhaTroca[], exLocalId: string, familia: string): number[] {
  const i = exercises.findIndex((x) => x.localId === exLocalId);
  if (i < 0) return [];
  if (familia !== "reformer") return [i];
  const id = exercises[i].exerciseId;
  if (i + 1 < exercises.length && exercises[i + 1].exerciseId === id) return [i, i + 1];
  if (i > 0 && exercises[i - 1].exerciseId === id) return [i - 1, i];
  return [i];
}

/** Observação nova da linha trocada (só o que o código escreve; a da IA não vai junto). */
export function observacaoDaTroca(novo: NovoExercicio, linha: LinhaTroca, familia: string, posNaDupla: 0 | 1 | null): string {
  if (familia === "reformer") return posNaDupla === null ? "" : posNaDupla === 0 ? LADO_DIREITO : LADO_ESQUERDO;
  if (!novo.unilateral) return "";
  const s = linha.series[0];
  return s ? observacaoDosLados({ tipo: s.type, alvo: s.target }) : "";
}

/** Rascunho com o exercício trocado. Mesmas referências onde nada muda. */
export function aplicarTroca<L extends LinhaTroca, B extends BlocoTroca<L>>(blocks: readonly B[], blocoLocalId: string, exLocalId: string, novo: NovoExercicio, familia: string): B[] {
  return blocks.map((b) => {
    if (b.localId !== blocoLocalId) return b;
    const idx = linhasDaTroca(b.exercises, exLocalId, familia);
    if (!idx.length) return b;
    const dupla = idx.length === 2;
    return {
      ...b,
      exercises: b.exercises.map((x, i) => {
        const k = idx.indexOf(i);
        if (k < 0) return x;
        return {
          ...x,
          exerciseId: novo.exerciseId,
          exerciseName: novo.nome,
          videoUrl: novo.videoUrl || undefined,
          comments: observacaoDaTroca(novo, x, familia, dupla ? (k as 0 | 1) : null),
        };
      }),
    };
  });
}
