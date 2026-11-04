// IA de treino v2 — SCHEMA da resposta do modelo (PR V2-3). PURO.
//
// O schema muda por treino: um objeto com UMA chave por bloco ("bloco_1",
// "bloco_2"…), cada uma com o enum dos refs DAQUELE bloco, o método permitido, as
// faixas de descanso e o nº exato de séries por exercício. Objeto com chaves fixas
// (e não tupla) porque a saída estruturada aceita melhor objetos; normalizarResposta
// devolve a forma em array que a validação e o rascunho usam.
// O que o JSON Schema da rede não expressa (faixas numéricas, tamanho de array) o zod
// valida localmente; validar.ts reconfere tudo e ainda checa as regras de negócio.
//
// Tamanho (25/10): a Hipertrofia (7 blocos) voltava HTTP 400 — o schema com uma forma
// por bloco (16 KB, 14 $defs) passava do limite da gramática compilada da API. Blocos
// com o MESMO grupo de candidatos e a mesma estrutura reaproveitam a MESMA instância
// zod: o zodOutputFormat (reused: 'ref') gera 1 $def por grupo, não 1 por bloco.

import { z } from "zod";
import type { Esqueleto } from "./esqueleto";
import type { ResultadoCandidatos } from "./candidatos";

export const TIPOS_SERIE_V2 = ["repetition", "time"] as const;
export const OBS_BLOCO_MAX_V2 = 120;
export const OBS_EXERCICIO_MAX_V2 = 80;
export const ALVO_MAX_V2 = 40;
export const JUSTIFICATIVA_MAX_V2 = 400;

// ── forma normalizada (array) ────────────────────────────────────────────────

export interface SerieResposta { tipo: "repetition" | "time"; alvo: string }
export interface ExercicioResposta { ref: string; series: SerieResposta[]; observacao: string }
export interface BlocoResposta {
  metodo: string;
  descansoEntreSeriesSeg: number;
  descansoEntreExerciciosSeg: number;
  /** null no último bloco. */
  descansoAposBlocoSeg: number | null;
  /** Só quando o esqueleto permite (Extreme a partir do N3); senão "". */
  observacaoBloco: string;
  exercicios: ExercicioResposta[];
}
export interface RespostaV2 { justificativa: string; blocos: BlocoResposta[] }

export const chaveBloco = (i: number) => `bloco_${i + 1}`;

/** Objeto do schema → array na ordem dos blocos. */
export function normalizarResposta(obj: { justificativa: string; blocos: Record<string, BlocoResposta> }, nBlocos: number): RespostaV2 {
  return { justificativa: obj.justificativa, blocos: Array.from({ length: nBlocos }, (_, i) => obj.blocos[chaveBloco(i)]) };
}

/** Array → objeto do schema (para testes e para reenviar a resposta na correção). */
export function paraObjetoSchema(r: RespostaV2): { justificativa: string; blocos: Record<string, BlocoResposta> } {
  return { justificativa: r.justificativa, blocos: Object.fromEntries(r.blocos.map((b, i) => [chaveBloco(i), b])) };
}

// ── schema ───────────────────────────────────────────────────────────────────

export function montarSchemaV2(e: Esqueleto, c: ResultadoCandidatos):
  | { ok: true; schema: z.ZodType<{ justificativa: string; blocos: Record<string, BlocoResposta> }> }
  | { ok: false; motivo: string } {
  const formas: Record<string, z.ZodType<BlocoResposta>> = {};
  // Uma instância por grupo de candidatos + estrutura do bloco (a mesma instância em
  // dois blocos vira $ref para 1 $def).
  const porGrupo = new Map<string, z.ZodType<BlocoResposta>>();
  for (const [i, b] of e.blocos.entries()) {
    const cb = c.blocos[i];
    const refs = cb?.candidatos.map((x) => x.ref) ?? [];
    if (refs.length === 0) return { ok: false, motivo: `bloco ${i + 1} sem candidatos` };
    const metodos = (b.metodo ? [b.metodo] : b.metodosPermitidos) as [string, ...string[]];
    const ultimo = i === e.blocos.length - 1;
    const chave = `${cb!.grupo}|${JSON.stringify([metodos, b.series, b.exercicios, b.descansoEntreSeriesSeg, b.descansoEntreExerciciosSeg, ultimo || !b.descansoAposBlocoSeg ? null : b.descansoAposBlocoSeg])}`;
    const pronta = porGrupo.get(chave);
    if (pronta) { formas[chaveBloco(i)] = pronta; continue; }
    const faixaInt = (f: readonly [number, number], o: string) => z.number().int().min(f[0]).max(f[1]).describe(`${o}: de ${f[0]} a ${f[1]} s; escolha um valor dentro.`);
    const exercicio = z.object({
      ref: z.enum(refs as [string, ...string[]]).describe("Ref de um candidato DESTE bloco."),
      series: z.array(z.object({
        tipo: z.enum(TIPOS_SERIE_V2).describe('"time" quando a meta é tempo; "repetition" quando é repetição.'),
        alvo: z.string().max(ALVO_MAX_V2).describe('Texto curto: "12", "12 cada lado", "40 s".'),
      })).length(b.series).describe(`Exatamente ${b.series} série(s).`),
      observacao: z.string().max(OBS_EXERCICIO_MAX_V2).describe('Observação curta ("cada lado" no unilateral); "" se não houver.'),
    });
    // Reformer: o nº de EXERCÍCIOS varia (unilateral ocupa 2 posições). Rodada 12: a
    // conta é do código (ajustarPosicoesReformer corta o excesso / avisa a falta), então
    // o schema só barra o absurdo — 1 a mais é aceito para o código cortar.
    const exercicios = e.familia === "reformer"
      ? z.array(exercicio).min(1).max(b.exercicios + 1).describe(`Exercícios para ${b.exercicios} posições (unilateral conta 2).`)
      : z.array(exercicio).length(b.exercicios).describe(`Exatamente ${b.exercicios} exercício(s).`);
    formas[chaveBloco(i)] = z.object({
      metodo: z.enum(metodos).describe(`Método do bloco: ${metodos.join(" | ")}.`),
      descansoEntreSeriesSeg: faixaInt(b.descansoEntreSeriesSeg, "Descanso entre séries"),
      descansoEntreExerciciosSeg: faixaInt(b.descansoEntreExerciciosSeg, "Descanso entre exercícios"),
      descansoAposBlocoSeg: ultimo || !b.descansoAposBlocoSeg ? z.null().describe("Último bloco: null.") : faixaInt(b.descansoAposBlocoSeg, "Descanso após o bloco"),
      observacaoBloco: e.formatoExtremeOpcional
        ? z.string().max(OBS_BLOCO_MAX_V2).describe('Opcional: formato AMRAP/EMOM/HYROX do bloco; "" se não usar.')
        : z.literal("").describe('Sempre "".'),
      exercicios,
    }) as z.ZodType<BlocoResposta>;
    porGrupo.set(chave, formas[chaveBloco(i)]);
  }
  const schema = z.object({
    justificativa: z.string().max(JUSTIFICATIVA_MAX_V2).describe("Até 3 linhas: por que este treino, nesta ordem."),
    blocos: z.object(formas),
  }) as unknown as z.ZodType<{ justificativa: string; blocos: Record<string, BlocoResposta> }>;
  return { ok: true, schema };
}
