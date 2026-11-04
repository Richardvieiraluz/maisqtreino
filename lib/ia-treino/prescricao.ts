// Prescrição da IA v2: a tabela de prescrição do Richard em dado (PR E).
//
// PURO (sem server-only). A fonte da verdade é lib/ai-treino/prescricao-v1.json,
// gerado da planilha "Tabela_nova_de_prescricao_v2.xlsx" (22/10/2026) e das
// decisões registradas — copiado SEM alteração. Este módulo só tipa, valida na
// carga (falha alto se o JSON estiver malformado) e resolve qual linha vale para
// um protocolo (família + nível + fase, migration 073/074).
//
// Ninguém consome ainda: a IA v2 vai usar depois. NÃO está ligado à IA v1.1 nem
// a nenhuma tela.

import { z } from "zod";
import dados from "./prescricao-v1.json";
import {
  FAMILIAS_COM_NIVEL, NIVEIS_PROTOCOLO, VALORES_FASES_PROTOCOLO, VALORES_FAMILIAS,
  type Familia, type FaseProtocolo, type NivelProtocolo,
} from "./familia";
import { METODOS_BLOCO } from "./editor";

// ── esquema ──────────────────────────────────────────────────────────────────

/** Faixa [min, max] de inteiros >= 0, com min <= max. */
const faixa = z.tuple([z.number().int().min(0), z.number().int().min(0)])
  .refine(([min, max]) => min <= max, { message: "faixa com min > max" });
/** Descansos e tempos: dentro de 0–600 s. */
const faixaSeg = faixa.refine(([, max]) => max <= 600, { message: "segundos fora de 0–600" });

const repsFaixas = z.strictObject({ reps: faixa.optional(), tempoSeg: faixaSeg.optional() });

const estrutura = {
  /** Método do bloco (enum do banco) ou "mescla" (hipertrofia N2+: lista em regrasGerais). */
  metodo: z.string().refine((m) => (METODOS_BLOCO as readonly string[]).includes(m) || m === "mescla", { message: "método fora do enum e diferente de 'mescla'" }),
  series: faixa,
  descansoEntreSeriesSeg: faixaSeg,
  descansoEntreBlocosSeg: faixaSeg,
  descansoEntreExerciciosSeg: faixaSeg,
  textoOriginal: z.strictObject({ blocos: z.string(), reps: z.string(), obs: z.string() }),
  /** Ausente no Pilates, que se organiza por aparelho (aparelhos × exerciciosPorAparelho). */
  blocos: faixa.optional(),
  exerciciosPorBloco: faixa.optional(),
  aparelhos: z.number().int().min(1).optional(),
  exerciciosPorAparelho: faixa.optional(),
  reps: z.strictObject({
    geral: repsFaixas.optional(),
    carga: repsFaixas.optional(),
    pesoDoCorpo: repsFaixas.optional(),
    aparelhoCardio: repsFaixas.optional(),
    /** Reformer: sempre por tempo. */
    soTempo: z.boolean().optional(),
  }),
  /** Faixas extras por tipo de exercício (ex.: pranchasAbdominaisTempoSeg, unilateralReps). */
  extras: z.record(z.string(), faixa).optional(),
  obs: z.string().optional(),
  obsEstrutura: z.string().optional(),
};

const linhaSchema = z.strictObject({
  ...estrutura,
  familia: z.string().refine((f) => FAMILIAS_COM_NIVEL.includes(f as Familia), { message: "família sem nível ou fora do vocabulário" }),
  nivel: z.enum(NIVEIS_PROTOCOLO),
});

const prescricaoSchema = z.strictObject({
  versao: z.string(),
  fonte: z.string(),
  duracaoMin: z.strictObject({ reformer: z.number().int(), pilates: z.number().int(), funcional: z.number().int(), obs: z.string() }),
  regrasGerais: z.strictObject({
    progressao: z.string(),
    carga: z.string(),
    hipertrofia: z.strictObject({
      alternanciaAB: z.string(),
      metodoN0aN1_1: z.string(),
      metodoN2emDiante: z.array(z.string().refine((m) => (METODOS_BLOCO as readonly string[]).includes(m), { message: "método fora do enum" })),
      semTriSet: z.boolean(),
      convencional: z.string(),
      core: z.string(),
      ativacao: z.string(),
      /** v1.2: todos os níveis têm 7 blocos (1 ativação + 6 principais × 2). */
      blocosTodosNiveis: z.string(),
    }),
    funcional: z.strictObject({ blocoAtivacao: z.string(), condicionamento: z.string(), cardioHiit: z.string() }),
    pilates: z.strictObject({ aparelhos: z.array(z.string()), semPularAparelho: z.boolean(), semMolas: z.boolean() }),
    reformer: z.strictObject({ blocos: z.number().int(), exerciciosPorBloco: z.number().int(), unilateralOcupa2Posicoes: z.boolean(), soTempo: z.boolean() }),
    tempoEstimado: z.string(),
    descansos: z.string(),
    /** v1.1: faixa igual em todos os níveis = faixa TOTAL (começa perto do mínimo e sobe com o nível). */
    faixasIguaisEmTodosOsNiveis: z.string(),
  }),
  linhas: z.array(linhaSchema),
  ativacaoFuncional: z.strictObject({ ...estrutura, materiais: z.array(z.string()) }),
  reabilitacao: z.strictObject({ agudo: z.strictObject(estrutura), cronico: z.strictObject(estrutura), mob_sm: z.strictObject(estrutura) }),
  mapeamentoSemNivel: z.record(z.string(), z.string()),
});

// ── tipos ────────────────────────────────────────────────────────────────────

export type Faixa = [number, number];
export type Prescricao = z.infer<typeof prescricaoSchema>;
export type LinhaPrescricao = z.infer<typeof linhaSchema>;
/** Estrutura comum (linha, ativação, reabilitação). */
export type EstruturaPrescricao = Omit<LinhaPrescricao, "familia" | "nivel">;
export type AtivacaoFuncional = Prescricao["ativacaoFuncional"];
export type RegrasGerais = Prescricao["regrasGerais"];

// ── carga e validação (falha alto) ───────────────────────────────────────────

function carregar(): Prescricao {
  const r = prescricaoSchema.safeParse(dados);
  if (!r.success) {
    throw new Error(`prescricao-v1.json malformado: ${r.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ")}`);
  }
  const p = r.data;
  const chaves = new Set<string>();
  for (const l of p.linhas) {
    const k = `${l.familia}|${l.nivel}`;
    if (chaves.has(k)) throw new Error(`prescricao-v1.json malformado: linha duplicada ${k}`);
    chaves.add(k);
  }
  // As fases da reabilitação são as do vocabulário da 073 (o schema já exige as 3).
  for (const f of VALORES_FASES_PROTOCOLO) if (!(f in p.reabilitacao)) throw new Error(`prescricao-v1.json malformado: reabilitacao sem a fase ${f}`);
  // O mapeamento cita só famílias do vocabulário.
  for (const f of Object.keys(p.mapeamentoSemNivel)) if (!VALORES_FAMILIAS.includes(f as Familia)) throw new Error(`prescricao-v1.json malformado: mapeamentoSemNivel com família desconhecida ${f}`);
  return p;
}

const PRESCRICAO: Prescricao = carregar();

/** A prescrição inteira (somente leitura). */
export function prescricao(): Readonly<Prescricao> { return PRESCRICAO; }
export function regrasGerais(): Readonly<RegrasGerais> { return PRESCRICAO.regrasGerais; }
export function ativacaoFuncional(): Readonly<AtivacaoFuncional> { return PRESCRICAO.ativacaoFuncional; }

// ── resolução por protocolo ──────────────────────────────────────────────────

/** De onde veio a estrutura: linha da família+nível, tabela da reabilitação, ou
 *  mapeamento (protocolo de dor, gestante e alongamento usam a linha pilates N1). */
export type OrigemPrescricao = "linha" | "reabilitacao" | "mapeamento";

/** Famílias sem nível que usam a linha pilates N1 (mapeamentoSemNivel do JSON). */
const MAPEADAS_PARA_PILATES_N1: readonly Familia[] = ["protocolo_dor", "gestante", "alongamento"];

export function prescricaoDoProtocolo(p: { familia: string | null | undefined; nivel: string | null | undefined; fase: string | null | undefined }):
  | { ok: true; linha: Readonly<EstruturaPrescricao>; origem: OrigemPrescricao }
  | { ok: false; motivo: string } {
  const familia = (p.familia ?? null) as Familia | null;
  if (!familia) return { ok: false, motivo: "protocolo sem família definida" };
  if (familia === "fora_da_ia") return { ok: false, motivo: "protocolo fora da IA" };

  if (FAMILIAS_COM_NIVEL.includes(familia)) {
    if (!p.nivel) return { ok: false, motivo: "protocolo sem nível definido" };
    const linha = PRESCRICAO.linhas.find((l) => l.familia === familia && l.nivel === p.nivel);
    return linha ? { ok: true, linha, origem: "linha" } : { ok: false, motivo: `não há prescrição para ${familia} ${p.nivel}` };
  }

  if (familia === "reabilitacao") {
    if (!p.fase) return { ok: false, motivo: "reabilitação sem fase: a master precisa definir a fase" };
    const linha = PRESCRICAO.reabilitacao[p.fase as FaseProtocolo];
    return linha ? { ok: true, linha, origem: "reabilitacao" } : { ok: false, motivo: `fase de reabilitação desconhecida: ${p.fase}` };
  }

  if (MAPEADAS_PARA_PILATES_N1.includes(familia)) {
    const linha = PRESCRICAO.linhas.find((l) => l.familia === "pilates" && l.nivel === ("N1" satisfies NivelProtocolo));
    return linha ? { ok: true, linha, origem: "mapeamento" } : { ok: false, motivo: "linha pilates N1 ausente na prescrição" };
  }

  return { ok: false, motivo: `família sem prescrição: ${familia}` };
}
