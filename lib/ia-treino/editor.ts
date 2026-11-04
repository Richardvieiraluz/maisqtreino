// Regras do editor de treinos da master (PR D2). PURO (sem server-only): usado
// pelo editor (WorkoutsClient), pelas actions (normalização antes de gravar) e
// pela camada de dados (leitura das séries).
//
// Os treinos são COMPARTILHADOS pela rede inteira: tudo que o editor grava vale
// para todos os protocolos, franquias e alunos que usam o treino.

import { sanitize } from "./apoio";

/** Métodos do bloco = valores do enum public.workout_block_method (018:23 + 073).
 *  Ordem da tela: Pirâmide Decrescente logo depois da Crescente. */
export const METODOS_BLOCO = ["Circuito", "Bi-Set", "Convencional", "Pirâmide Crescente", "Pirâmide Decrescente", "Drop-Set"] as const;
export type MetodoBloco = (typeof METODOS_BLOCO)[number];

/** Tipos da série = valores do enum public.workout_series_type (018:27). */
export const TIPOS_SERIE = ["repetition", "time"] as const;
export type TipoSerie = (typeof TIPOS_SERIE)[number];

export const DESCANSO_APOS_BLOCO_MIN = 0;
export const DESCANSO_APOS_BLOCO_MAX = 600;
export const OBS_BLOCO_MAX = 200;
export const OBS_EXERCICIO_MAX = 500;
export const TEXTO_SERIE_MAX = 60;

/** Tipo da série lido do JSON: só "time" é tempo; o resto (inclusive ausente) é repetição. */
export function tipoDaSerie(raw: unknown): TipoSerie {
  return raw === "time" ? "time" : "repetition";
}

export interface SerieNormalizada { serie: number; type: TipoSerie; target: string; weight: string }

/** Séries do JSONB nos DOIS formatos do banco — {type, serie, target, weight} (gravado
 *  pelo editor) e {type, serie, typeValue, typeString, weight} (import) — com o TYPE
 *  preservado. Antes o editor descartava o type e regravava tudo como repetição. */
export function normalizarSeries(raw: unknown): SerieNormalizada[] {
  if (typeof raw === "string") {
    try { return normalizarSeries(JSON.parse(raw)); } catch { return []; }
  }
  if (!Array.isArray(raw)) return [];
  return (raw as Array<Record<string, unknown>>).map((s, i) => ({
    serie:  typeof s.serie === "number" ? s.serie : i + 1,
    type:   tipoDaSerie(s.type),
    target: String(s.target ?? s.typeString ?? (s.typeValue ?? "")),
    weight: String(s.weight ?? ""),
  }));
}

/** Descanso após o bloco: vazio/null → null; inteiro 0–600 → número; o resto → erro. */
export function parseDescansoAposBloco(v: unknown): { ok: true; valor: number | null } | { ok: false; erro: string } {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return { ok: true, valor: null };
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isInteger(n) || n < DESCANSO_APOS_BLOCO_MIN || n > DESCANSO_APOS_BLOCO_MAX) {
    return { ok: false, erro: `Descanso após o bloco precisa ser um número inteiro de ${DESCANSO_APOS_BLOCO_MIN} a ${DESCANSO_APOS_BLOCO_MAX} segundos.` };
  }
  return { ok: true, valor: n };
}

export interface BlocoNormalizado {
  method: MetodoBloco;
  numberSeries: number;
  restBetweenSeriesSec: number;
  /** Sempre null no último bloco (não há bloco depois dele). */
  restAfterBlockSec: number | null;
  /** Observação do bloco ("AMRAP 10 min"); null = vazia. */
  comments: string | null;
  orderIndex: number;
  exercises: Array<{
    exerciseId: string;
    series: SerieNormalizada[];
    restSec: number;
    comments?: string;
    orderIndex: number;
  }>;
}

const inteiro = (v: unknown, padrao: number, min: number, max: number) => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : padrao;
};

/** Blocos vindos do editor (JSON do FormData) → prontos para gravar: método e tipo
 *  de série do enum, textos sanitizados e cortados, descanso após o bloco validado
 *  (0–600) e NULL no último bloco. A ordem é a do array. */
export function normalizarBlocos(raw: unknown): { ok: true; valor: BlocoNormalizado[] } | { ok: false; erro: string } {
  if (!Array.isArray(raw)) return { ok: false, erro: "Blocos inválidos." };
  const out: BlocoNormalizado[] = [];
  for (let bi = 0; bi < raw.length; bi++) {
    const b = (raw[bi] ?? {}) as Record<string, unknown>;
    const method = String(b.method ?? "");
    if (!(METODOS_BLOCO as readonly string[]).includes(method)) return { ok: false, erro: `Bloco ${bi + 1}: método inválido "${sanitize(method)}".` };
    const ultimo = bi === raw.length - 1;
    const d = parseDescansoAposBloco(b.restAfterBlockSec);
    if (!d.ok) return { ok: false, erro: `Bloco ${bi + 1}: ${d.erro}` };
    const obs = sanitize(String(b.comments ?? "")).slice(0, OBS_BLOCO_MAX);
    const exs = Array.isArray(b.exercises) ? (b.exercises as Array<Record<string, unknown>>) : [];
    const exercises: BlocoNormalizado["exercises"] = [];
    for (let ei = 0; ei < exs.length; ei++) {
      const e = exs[ei];
      const exerciseId = sanitize(String(e.exerciseId ?? ""));
      if (!exerciseId) return { ok: false, erro: "Todos os exercícios precisam ser selecionados do banco." };
      const series = (Array.isArray(e.series) ? (e.series as Array<Record<string, unknown>>) : []).map((s, si) => {
        const type = String(s.type ?? "repetition");
        return { serie: si + 1, type: type as TipoSerie, target: sanitize(String(s.target ?? "")).slice(0, TEXTO_SERIE_MAX), weight: sanitize(String(s.weight ?? "")).slice(0, TEXTO_SERIE_MAX) };
      });
      const tipoRuim = series.find((s) => !(TIPOS_SERIE as readonly string[]).includes(s.type));
      if (tipoRuim) return { ok: false, erro: `Bloco ${bi + 1}: tipo de série inválido "${sanitize(tipoRuim.type)}".` };
      const comentario = sanitize(String(e.comments ?? "")).slice(0, OBS_EXERCICIO_MAX);
      exercises.push({ exerciseId, series, restSec: inteiro(e.restSec, 0, 0, 3600), ...(comentario ? { comments: comentario } : {}), orderIndex: ei });
    }
    out.push({
      method: method as MetodoBloco,
      numberSeries: inteiro(b.numberSeries, 1, 1, 20),
      restBetweenSeriesSec: inteiro(b.restBetweenSeriesSec, 30, 0, 3600),
      restAfterBlockSec: ultimo ? null : d.valor,
      comments: obs || null,
      orderIndex: bi,
      exercises,
    });
  }
  return { ok: true, valor: out };
}
