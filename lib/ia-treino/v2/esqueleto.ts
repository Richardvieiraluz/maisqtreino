// IA de treino v2 — PASSO "a": o ESQUELETO do treino (PR V2-1).
//
// PURO (sem server-only, sem banco, sem IA). A partir da família/nível/fase do
// protocolo (073/074) e da POSIÇÃO do treino que vai ser gerado (a v2 gera só o
// PRÓXIMO treino do protocolo), monta a estrutura que o código impõe: blocos,
// tipo de cada bloco, aparelho (Pilates), método, séries, nº de exercícios e as
// metas de reps/tempo já calculadas pela progressão. A IA (passo "c") só escolhe
// exercícios para os slots e escreve séries/observações dentro disso.
//
// Fonte: lib/ai-treino/prescricao.ts (tabela do Richard em dado). Vocabulários:
// lib/protocolos/familia.ts. Não é usado pela v1.1.
//
// Progressão (decisão do Richard): f = (posição − 1) / (totalTreinos − 1); toda
// faixa de CONTAGEM (blocos, exercícios, séries, reps, tempo) vira
// round(min + f·(max − min)) — treino 1 no mínimo, último no máximo. DESCANSOS
// NÃO progridem: o esqueleto repassa a FAIXA e a IA escolhe um valor dentro dela.

import {
  ativacaoFuncional, prescricaoDoProtocolo, regrasGerais,
  type EstruturaPrescricao, type Faixa, type OrigemPrescricao,
} from "../prescricao";
import { FAMILIAS_COM_NIVEL, type Familia } from "../familia";

// ── constantes (fáceis de mudar) ─────────────────────────────────────────────

/** Total de treinos do protocolo por família (a posição vai de 1 a este número). */
export const TOTAL_TREINOS_PADRAO: Readonly<Record<string, number>> = {
  pilates: 24, reformer: 24, condicionamento: 24, hipertrofia: 24, cardio_hiit: 24, extreme: 24, idoso: 24,
  reabilitacao: 16,
  protocolo_dor: 16,
  gestante: 24,
  alongamento: 24,
};

/** Funcionais: o bloco de ATIVAÇÃO conta dentro do nº de blocos da linha
 *  (confirmado pelo Richard para todas as famílias funcionais). */
export const ATIVACAO_CONTA_DENTRO = true;

/** Famílias funcionais (1º bloco = ativação). */
export const FAMILIAS_FUNCIONAIS: readonly Familia[] = ["condicionamento", "hipertrofia", "cardio_hiit", "extreme", "idoso"];

/** Quantos primeiros exercícios aceitam nível abaixo (aquecimento). A regra diz
 *  "2–3"; aqui o teto. Pilates: os 2 primeiros DE CADA aparelho. */
export const AQUECIMENTO_PRIMEIROS_FUNCIONAL = 3;
export const AQUECIMENTO_PRIMEIROS_REFORMER = 3;
export const AQUECIMENTO_PRIMEIROS_POR_APARELHO = 2;

/** Hipertrofia (v1.2, Richard 23/10): a ativação também aceita halter leve e barra
 *  leve, além dos materiais gerais da ativação (peso do corpo, mini band, elástico). */
export const MATERIAIS_ATIVACAO_HIPERTROFIA_EXTRA: readonly string[] = ["halter leve", "barra leve"];

/** Treinos de preparação para o nível seguinte (até 1/3 do nível seguinte). */
export const PREPARACAO_INICIO = 19;
export const PREPARACAO_FIM = 24;

/** Reabilitação: o bloco "outras musculaturas" é sempre deste nível. */
export const NIVEL_OUTRAS_MUSCULATURAS = "N1";

/** Mapeamento (protocolo_dor, gestante, alongamento) usa a linha pilates N1. */
const NIVEL_DO_MAPEAMENTO = 1;

// ── tipos ────────────────────────────────────────────────────────────────────

export type TipoBloco = "ativacao" | "principal" | "aparelho" | "lesao" | "outras_musculaturas";

/** Metas por tipo de exercício, já pela progressão (um número, não faixa). */
export interface Meta { reps?: number; tempoSeg?: number }
export interface Metas { geral?: Meta; carga?: Meta; pesoDoCorpo?: Meta; aparelhoCardio?: Meta }
/** As FAIXAS da prescrição (antes da progressão): a validação aceita qualquer valor dentro. */
export interface FaixaMeta { reps?: Faixa; tempoSeg?: Faixa }
export interface FaixasMetas { geral?: FaixaMeta; carga?: FaixaMeta; pesoDoCorpo?: FaixaMeta; aparelhoCardio?: FaixaMeta }

export interface BlocoEsqueleto {
  indice: number;
  tipo: TipoBloco;
  /** Pilates: aparelho do bloco (ordem fixa). */
  aparelho: string | null;
  /** Método do bloco; null quando a escolha é entre `metodosPermitidos` ("mescla"). */
  metodo: string | null;
  metodosPermitidos: string[];
  series: number;
  exercicios: number;
  metas: Metas;
  /** Metas extras pela progressão (ex.: pranchasAbdominaisTempoSeg, unilateralReps). */
  extras: Record<string, number>;
  /** Faixas da prescrição das metas e dos extras (validação V2-3). */
  faixasMetas: FaixasMetas;
  faixasExtras: Record<string, Faixa>;
  /** Faixas (não progridem; a IA escolhe dentro). */
  descansoEntreSeriesSeg: Faixa;
  descansoEntreExerciciosSeg: Faixa;
  /** null no último bloco do treino. */
  descansoAposBlocoSeg: Faixa | null;
  /** Quantos primeiros exercícios deste bloco aceitam nível abaixo (aquecimento). */
  aquecimentoPermiteNivelAbaixo: number;
  soTempo: boolean;
  /** Nível fixo do bloco (reabilitação: outras musculaturas = N1). */
  nivelFixo: string | null;
  /** Condições do bloco (reabilitação: blocos de lesão). */
  condicoes: string[];
  /** Materiais permitidos (ativação); null = os da pasta da família. */
  materiaisPermitidos: string[] | null;
  /** Orientação curta do bloco para o prompt. */
  orientacao: string | null;
}

export interface Esqueleto {
  familia: Familia;
  nivel: string | null;
  fase: string | null;
  condicoes: string[];
  posicao: number;
  totalTreinos: number;
  /** f da progressão (0 no treino 1, 1 no último). */
  fator: number;
  origemPrescricao: OrigemPrescricao;
  /** Nível base (".1" → base). null em reabilitação. */
  nivelBase: number | null;
  blocos: BlocoEsqueleto[];
  totalExercicios: number;
  preparacaoNivelSeguinte: boolean;
  /** floor(total de exercícios / 3) quando há preparação; 0 sem preparação. */
  cotaNivelSeguinte: number;
  ladoHipertrofia: "inferior" | "superior" | null;
  formatoExtremeOpcional: boolean;
  /** 2/3 em reabilitação mob_sm; null fora. */
  proporcaoSensorioMotor: number | null;
  soAlongamentoMobilidade: boolean;
  unilateralOcupa2Posicoes: boolean;
  soTempo: boolean;
  regrasParaPrompt: string[];
  /** Avisos que não impedem a geração (ex.: protocolo já completo). */
  avisos: string[];
}

export interface EntradaEsqueleto {
  familia: string | null | undefined;
  nivel: string | null | undefined;
  fase: string | null | undefined;
  condicoes?: readonly string[] | null;
  posicao: number;
  totalTreinos?: number;
}

// ── helpers puros ────────────────────────────────────────────────────────────

/** round(min + f·(max − min)). */
export function progredir(faixa: Faixa, f: number): number {
  const [min, max] = faixa;
  return Math.round(min + f * (max - min));
}

/** "N1.1" → 1; "N3" → 3; inválido → null. */
export function nivelBaseDe(nivel: string | null | undefined): number | null {
  const m = String(nivel ?? "").match(/^N(\d)(?:\.1)?$/);
  return m ? Number(m[1]) : null;
}

function progredirMetas(reps: EstruturaPrescricao["reps"], f: number): Metas {
  const out: Metas = {};
  for (const k of ["geral", "carga", "pesoDoCorpo", "aparelhoCardio"] as const) {
    const r = reps[k];
    if (!r) continue;
    const m: Meta = {};
    if (r.reps) m.reps = progredir(r.reps, f);
    if (r.tempoSeg) m.tempoSeg = progredir(r.tempoSeg, f);
    out[k] = m;
  }
  return out;
}

function progredirExtras(extras: Record<string, Faixa> | undefined, f: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(extras ?? {})) out[k] = progredir(v, f);
  return out;
}

const faixaDe = (f: Faixa): Faixa => [f[0], f[1]];

function faixasDasMetas(reps: EstruturaPrescricao["reps"]): FaixasMetas {
  const out: FaixasMetas = {};
  for (const k of ["geral", "carga", "pesoDoCorpo", "aparelhoCardio"] as const) {
    const r = reps[k];
    if (!r) continue;
    out[k] = { ...(r.reps ? { reps: faixaDe(r.reps) } : {}), ...(r.tempoSeg ? { tempoSeg: faixaDe(r.tempoSeg) } : {}) };
  }
  return out;
}

// ── montarEsqueleto ──────────────────────────────────────────────────────────

export function montarEsqueleto(e: EntradaEsqueleto): { ok: true; esqueleto: Esqueleto } | { ok: false; motivo: string } {
  const familia = (e.familia ?? null) as Familia | null;
  const p = prescricaoDoProtocolo({ familia: e.familia, nivel: e.nivel, fase: e.fase });
  if (!p.ok) return { ok: false, motivo: p.motivo };
  if (!familia) return { ok: false, motivo: "protocolo sem família definida" };

  const totalTreinos = e.totalTreinos ?? TOTAL_TREINOS_PADRAO[familia];
  if (!Number.isInteger(totalTreinos) || totalTreinos < 1) return { ok: false, motivo: `total de treinos inválido para ${familia}` };
  if (!Number.isInteger(e.posicao) || e.posicao < 1) return { ok: false, motivo: "posição do treino inválida" };
  // Protocolo completo (Richard, 23/10): não recusa; gera com aviso e progressão no máximo.
  const avisos: string[] = [];
  if (e.posicao > totalTreinos) avisos.push(`o protocolo já tem ${e.posicao - 1} treinos (padrão: ${totalTreinos})`);

  const f = totalTreinos === 1 ? 0 : Math.min(1, (e.posicao - 1) / (totalTreinos - 1));
  const linha = p.linha;
  const rg = regrasGerais();
  const condicoes = [...(e.condicoes ?? [])];
  const comNivel = FAMILIAS_COM_NIVEL.includes(familia);
  const nivelBase = familia === "reabilitacao" ? null : comNivel ? nivelBaseDe(e.nivel) : NIVEL_DO_MAPEAMENTO;
  const ehFuncional = FAMILIAS_FUNCIONAIS.includes(familia);
  const ehPilatesLike = familia === "pilates" || p.origem === "mapeamento";
  const soTempoLinha = !!linha.reps.soTempo;

  const regras: string[] = [rg.progressao, rg.carga, rg.descansos, rg.tempoEstimado, rg.faixasIguaisEmTodosOsNiveis];
  const blocos: BlocoEsqueleto[] = [];
  const base = (indice: number, tipo: TipoBloco, est: EstruturaPrescricao, nExercicios: number): BlocoEsqueleto => ({
    indice, tipo, aparelho: null,
    metodo: est.metodo === "mescla" ? null : est.metodo,
    metodosPermitidos: est.metodo === "mescla" ? [...rg.hipertrofia.metodoN2emDiante] : [est.metodo],
    series: progredir(est.series, f),
    exercicios: nExercicios,
    metas: progredirMetas(est.reps, f),
    extras: progredirExtras(est.extras, f),
    faixasMetas: faixasDasMetas(est.reps),
    faixasExtras: Object.fromEntries(Object.entries(est.extras ?? {}).map(([k, v]) => [k, faixaDe(v)])),
    descansoEntreSeriesSeg: faixaDe(est.descansoEntreSeriesSeg),
    descansoEntreExerciciosSeg: faixaDe(est.descansoEntreExerciciosSeg),
    descansoAposBlocoSeg: faixaDe(est.descansoEntreBlocosSeg),
    aquecimentoPermiteNivelAbaixo: 0,
    soTempo: !!est.reps.soTempo,
    nivelFixo: null, condicoes: [], materiaisPermitidos: null, orientacao: null,
  });

  let ladoHipertrofia: Esqueleto["ladoHipertrofia"] = null;

  if (ehPilatesLike) {
    // Pilates (e protocolo_dor/gestante/alongamento pela linha pilates N1):
    // 4 blocos de aparelho na ordem fixa, sem pular.
    const nPorAparelho = progredir(linha.exerciciosPorAparelho ?? [0, 0], f);
    rg.pilates.aparelhos.forEach((ap, i) => {
      blocos.push({
        ...base(i, "aparelho", linha, nPorAparelho),
        aparelho: ap,
        aquecimentoPermiteNivelAbaixo: Math.min(AQUECIMENTO_PRIMEIROS_POR_APARELHO, nPorAparelho),
        condicoes: familia === "protocolo_dor" || familia === "gestante" ? condicoes : [],
      });
    });
    regras.push("Pilates: sequência fixa cadillac → chair → barrel → reformer, sem pular aparelho; sem molas no texto.");
    if (familia === "alongamento") regras.push("Alongamento: só exercícios com categorias apenas alongamento e/ou mobilidade.");
  } else if (familia === "reformer") {
    const nBlocos = progredir(linha.blocos ?? [0, 0], f);
    const nEx = progredir(linha.exerciciosPorBloco ?? [0, 0], f);
    for (let i = 0; i < nBlocos; i++) {
      blocos.push({ ...base(i, "principal", linha, nEx), soTempo: true, aquecimentoPermiteNivelAbaixo: i === 0 ? Math.min(AQUECIMENTO_PRIMEIROS_REFORMER, nEx) : 0 });
    }
    regras.push(`Reformer: ${rg.reformer.blocos} blocos × ${rg.reformer.exerciciosPorBloco} posições; sempre por tempo; exercício unilateral ocupa 2 posições (lado direito e esquerdo em sequência).`);
  } else if (familia === "reabilitacao") {
    // 3 blocos: 2 de lesão (com as condições) + 1 de outras musculaturas (N1).
    const nEx = progredir(linha.exerciciosPorBloco ?? [0, 0], f);
    blocos.push({ ...base(0, "lesao", linha, nEx), condicoes });
    blocos.push({ ...base(1, "lesao", linha, nEx), condicoes });
    blocos.push({ ...base(2, "outras_musculaturas", linha, nEx), nivelFixo: NIVEL_OUTRAS_MUSCULATURAS, orientacao: "Outras musculaturas (fora da lesão), nível N1; todas as modalidades menos mqpilates/pilates/mqreformer/idoso." });
    if (e.fase === "mob_sm") regras.push("Reabilitação mobilidade + sensório motor: 2/3 dos exercícios de sensório motor.");
  } else if (ehFuncional) {
    // 1º bloco = ATIVAÇÃO (linha ativacaoFuncional), dentro do nº de blocos da linha.
    const at = ativacaoFuncional();
    const nBlocos = progredir(linha.blocos ?? [0, 0], f);
    const nEx = progredir(linha.exerciciosPorBloco ?? [0, 0], f);
    const nAt = progredir(at.exerciciosPorBloco ?? [1, 1], f);
    if (familia === "hipertrofia") ladoHipertrofia = e.posicao % 2 === 1 ? "inferior" : "superior";
    blocos.push({
      ...base(0, "ativacao", at, nAt),
      aquecimentoPermiteNivelAbaixo: Math.min(AQUECIMENTO_PRIMEIROS_FUNCIONAL, nAt),
      // Hipertrofia: união com halter leve e barra leve; nas outras funcionais, só os da ativação.
      materiaisPermitidos: familia === "hipertrofia"
        ? [...new Set([...at.materiais, ...MATERIAIS_ATIVACAO_HIPERTROFIA_EXTRA])]
        : [...at.materiais],
      orientacao: familia === "hipertrofia"
        ? `Ativação do lado ${ladoHipertrofia} (mesmo membro do treino); core só aqui. ${rg.hipertrofia.ativacao}`
        : rg.funcional.blocoAtivacao,
    });
    const nPrincipais = ATIVACAO_CONTA_DENTRO ? Math.max(0, nBlocos - 1) : nBlocos;
    for (let i = 0; i < nPrincipais; i++) {
      const b = base(i + 1, "principal", linha, nEx);
      if (familia === "hipertrofia") {
        const baixo = (nivelBase ?? 0) <= 1; // N0, N1 e N1.1 → Bi-Set sempre
        b.metodo = baixo ? "Bi-Set" : null;
        b.metodosPermitidos = baixo ? ["Bi-Set"] : [...rg.hipertrofia.metodoN2emDiante];
      }
      blocos.push(b);
    }
    if (familia === "hipertrofia") {
      regras.push(rg.hipertrofia.alternanciaAB, `Lado deste treino: ${ladoHipertrofia}.`, `Core: ${rg.hipertrofia.core}`, `Método convencional: ${rg.hipertrofia.convencional}`);
      if (rg.hipertrofia.semTriSet) regras.push("Hipertrofia: sem tri-set.");
    }
    if (familia === "condicionamento") regras.push(rg.funcional.condicionamento);
    if (familia === "cardio_hiit") regras.push(rg.funcional.cardioHiit);
    if (familia === "extreme" && linha.obs && (nivelBase ?? 0) >= 3) regras.push(linha.obs); // AMRAP/EMOM/HYROX: só onde é permitido (N3+)
  } else {
    return { ok: false, motivo: `família sem esqueleto: ${familia}` };
  }

  // Descanso após o ÚLTIMO bloco: null.
  if (blocos.length) blocos[blocos.length - 1].descansoAposBlocoSeg = null;

  const totalExercicios = blocos.reduce((s, b) => s + b.exercicios, 0);
  const preparacaoNivelSeguinte = comNivel && familia !== "reabilitacao"
    && e.posicao >= PREPARACAO_INICIO && e.posicao <= PREPARACAO_FIM
    && nivelBase !== null && nivelBase < 5;
  if (preparacaoNivelSeguinte) regras.push(`Treino ${e.posicao}: preparação para o N${(nivelBase ?? 0) + 1}; até ${Math.floor(totalExercicios / 3)} exercício(s) do nível seguinte.`);
  const formatoExtremeOpcional = familia === "extreme" && (nivelBase ?? 0) >= 3;

  return {
    ok: true,
    esqueleto: {
      familia, nivel: e.nivel ?? null, fase: e.fase ?? null, condicoes,
      posicao: e.posicao, totalTreinos, fator: f, origemPrescricao: p.origem,
      nivelBase, blocos, totalExercicios,
      preparacaoNivelSeguinte,
      cotaNivelSeguinte: preparacaoNivelSeguinte ? Math.floor(totalExercicios / 3) : 0,
      ladoHipertrofia,
      formatoExtremeOpcional,
      proporcaoSensorioMotor: familia === "reabilitacao" && e.fase === "mob_sm" ? 2 / 3 : null,
      soAlongamentoMobilidade: familia === "alongamento",
      unilateralOcupa2Posicoes: familia === "reformer" && rg.reformer.unilateralOcupa2Posicoes,
      soTempo: familia === "reformer" ? true : soTempoLinha,
      regrasParaPrompt: regras.filter((r) => !!r && r.trim() !== ""),
      avisos,
    },
  };
}
