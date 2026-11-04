// IA de treino v2 — PASTAS por família e bloco (PR V2-2). PURO.
//
// Substitui a lógica de pastas da v1.1 SÓ para a v2 (lib/ai-treino/pastas.ts da
// v1.1 continua intacto). Valores EXATOS lidos do banco em 23/10/2026 (SELECT):
//   exercises.modality: "abdominal", "alongamento", "aparelhos cardio", "combinados",
//     "funcional", "idosos", "mobilidade", "mqpilates", "mqreformer", "musculação",
//     "pilates", "prevenção de lesão", "reabilitação"
//   material em "funcional": … "agilidade", "caixote", "corda", "corda naval", "jump",
//     "step", "mini band", "elástico extensor", "kettlebell", "peso do corpo" …
//     (NÃO existe "elástico" puro em funcional)
//   material em "musculação": "barra", "halter", "máquina", "tornozeleira"
//   material em "prevenção de lesão": … "elástico" …
//   material em "reabilitação" = a fase: "agudo", "crônico", "mobilidade", "sensório motor"
//   mqpilates: muscular_group "live"; aparelhos "cadillac", "chair", "barrel", "reformer"
//   exercise_classificacao.fase: "agudo", "crônico", "mobilidade", "sensório motor" (ou null)

import type { BlocoEsqueleto, Esqueleto } from "./esqueleto";

// ── vocabulário exato ────────────────────────────────────────────────────────

export const MOD = {
  abdominal: "abdominal",
  aparelhosCardio: "aparelhos cardio",
  combinados: "combinados",
  funcional: "funcional",
  musculacao: "musculação",
  prevencao: "prevenção de lesão",
  reabilitacao: "reabilitação",
  mqpilates: "mqpilates",
  pilates: "pilates",
  mqreformer: "mqreformer",
  idosos: "idosos",
} as const;

export const GRUPO_LIVE = "live";
export const APARELHOS_PILATES = ["cadillac", "chair", "barrel", "reformer"] as const;

export const MATERIAIS_HIPERTROFIA = ["barra", "halter", "máquina", "tornozeleira"] as const;
export const MATERIAIS_CARDIO_HIIT_FUNCIONAL = ["agilidade", "caixote", "corda", "corda naval", "jump", "step"] as const;
export const MODALITIES_CONDICIONAMENTO = [MOD.abdominal, MOD.aparelhosCardio, MOD.combinados, MOD.funcional, MOD.musculacao] as const;

/** Ativação (decisão do Richard, 23/10): modality "funcional" com estes materiais +
 *  modality "abdominal" com "peso do corpo". Combinados e o "elástico" de prevenção de
 *  lesão NÃO entram. */
export const ATIVACAO_PESO_DO_CORPO = "peso do corpo";
export const ATIVACAO_MATERIAIS_FUNCIONAL = ["agilidade", "corda", "elástico extensor", "jump", "mini band", "peso do corpo", "trx"] as const;
/** Hipertrofia: a ativação também aceita barra e halter (o "leve" é orientação). */
export const ATIVACAO_EXTRA_HIPERTROFIA = ["barra", "halter"] as const;

/** Reabilitação: pastas base. */
export const PASTAS_BASE_REABILITACAO = [MOD.prevencao, MOD.reabilitacao] as const;
/** Fases do protocolo (073) → fase da classificação. */
export const FASE_CLASSIFICACAO: Readonly<Record<string, readonly string[]>> = {
  agudo: ["agudo"],
  cronico: ["crônico"],
  mob_sm: ["mobilidade", "sensório motor"],
};
export const FASE_SENSORIO_MOTOR = "sensório motor";
export const FASE_MOBILIDADE = "mobilidade";

/** Bloco "outras musculaturas": todas as modalities MENOS estas. */
export const FORA_DE_OUTRAS_MUSCULATURAS = [MOD.mqpilates, MOD.pilates, MOD.mqreformer, MOD.idosos] as const;

/** Mapa aprovado condição → músculos (reabilitação). */
export const MUSCULOS_DA_CONDICAO: Readonly<Record<string, readonly string[]>> = {
  ombro: ["deltoide", "manguito rotador", "escápula (estabilizadores)"],
  cervical: ["cervical/pescoço", "trapézio"],
  lombar: ["lombar", "abdômen", "oblíquos", "glúteo"],
  quadril: ["glúteo", "flexores de quadril", "adutores", "abdutores"],
  joelho: ["quadríceps", "posterior de coxa"],
  tornozelo: ["tornozelo/pé", "panturrilha", "tibial anterior"],
  dorsal: ["dorsal", "trapézio", "escápula (estabilizadores)"],
};

/** Hipertrofia A/B pelos músculos da classificação. */
export const MUSCULOS_INFERIOR = ["glúteo", "quadríceps", "posterior de coxa", "adutores", "abdutores", "flexores de quadril", "panturrilha", "tibial anterior", "tornozelo/pé"] as const;
export const MUSCULOS_SUPERIOR = ["peitoral", "dorsal", "trapézio", "deltoide", "manguito rotador", "escápula (estabilizadores)", "bíceps", "tríceps", "antebraço/punho"] as const;
export const MUSCULOS_CORE = ["abdômen", "oblíquos", "lombar"] as const;

/** Idoso (Richard, 23/10): marcados idoso de qualquer modality MENOS as de Pilates. */
export const IDOSO_MODALITIES_FORA = [MOD.mqpilates, MOD.mqreformer, MOD.pilates] as const;
/** Idoso: por segurança, fora estas categorias e impacto diferente de "sem". */
export const IDOSO_CATEGORIAS_PROIBIDAS = ["salto/pliometria", "deslocamento", "arranque"] as const;
export const IDOSO_IMPACTO = "sem";

export const CATEGORIAS_LIVRES = ["alongamento", "mobilidade"] as const;

/** Famílias cujos candidatos são mqpilates (aparelhos): recebem posição, acessórios,
 *  o filtro de posição avançada e a sequência por posição/acessório (V2-4). */
export const FAMILIAS_MQPILATES = ["reformer", "pilates", "protocolo_dor", "gestante", "alongamento"] as const;
export const ehFamiliaMqpilates = (familia: string) => (FAMILIAS_MQPILATES as readonly string[]).includes(familia);
/** Rodada 11 (Richard, 26/10): a regra da MOLA (até 2 sem mola no início do bloco, marca
 *  SM, aviso "começa com mola") só vale no Cadillac. Reformer/Chair/Barrel ficam sem ela;
 *  o dado usa_mola continua no banco. */
export const APARELHO_REGRA_MOLA = "cadillac";
export const regraMolaAplica = (material: string) => material === APARELHO_REGRA_MOLA;
/** Rodada 11: no Reformer, os exercícios com alça (de mão ou de pé) vêm DEPOIS dos sem alça. */
export const APARELHO_REGRA_ALCA = "reformer";
export const ACESSORIOS_ALCA = ["alça de mão", "alça de pé"] as const;
export const temAlcaReformer = (x: { material: string; acessorios: readonly string[] }) =>
  x.material === APARELHO_REGRA_ALCA && x.acessorios.some((a) => (ACESSORIOS_ALCA as readonly string[]).includes(a));
/** Posições que só entram a partir do N3 (nível BASE: N2.1 não entra, N3 entra). Sem nível
 *  (protocolo_dor, gestante, alongamento) = não entram (Richard, 23/10). */
export const POSICOES_AVANCADAS = ["suspenso/invertido", "misto"] as const;
export const NIVEL_MIN_POSICAO_AVANCADA = 3;
export function posicaoPermitida(posicao: string, nivelBase: number | null): boolean {
  if (!(POSICOES_AVANCADAS as readonly string[]).includes(posicao)) return true;
  return nivelBase !== null && nivelBase >= NIVEL_MIN_POSICAO_AVANCADA;
}

// ── item do catálogo (o que a camada de dados entrega) ───────────────────────

export interface ItemCatalogo {
  id: string;
  nome: string;
  modality: string;
  material: string;
  muscularGroup: string;
  /** exercises.video_url ("" se não houver). */
  videoUrl: string;
  /** exercise_classificacao.posicao (V2-4). */
  posicao: string;
  /** exercise_classificacao.acessorios (075; mqpilates). */
  acessorios: string[];
  /** exercise_classificacao.usa_mola (076; mqpilates). null = coluna ainda não existe. */
  usaMola: boolean | null;
  niveis: number[];
  categorias: string[];
  musculos: string[];
  padroes: string[];
  unilateral: boolean | null;
  fase: string | null;
  indicacoes: string[];
  idoso: boolean;
  impacto: string;
  /** origem 'manual' e não revisado. */
  pendente: boolean;
  arquivado: boolean;
}

// ── predicados puros ─────────────────────────────────────────────────────────

const inclui = (lista: readonly string[], v: string) => lista.includes(v);
const algum = (a: readonly string[], b: readonly string[]) => a.some((x) => b.includes(x));

/** Nunca entram: pendentes e arquivados. */
export function disponivel(x: ItemCatalogo): boolean { return !x.pendente && !x.arquivado; }

/** Livre de nível: categorias só alongamento e/ou mobilidade, ou pasta aparelhos cardio. */
export function ehLivre(x: ItemCatalogo): boolean {
  return (x.categorias.length > 0 && x.categorias.every((c) => inclui(CATEGORIAS_LIVRES, c))) || x.modality === MOD.aparelhosCardio;
}

/** Condicionamento (Richard, 25/10): todo bloco depois da ativação tem pelo menos 1
 *  musculação → máquina. Barra, halter e tornozeleira entram, mas não contam. */
export const MATERIAL_MAQUINA = "máquina";
export const FAMILIA_COM_MAQUINA = "condicionamento";
export function ehMaquina(x: { modality: string; material: string }): boolean {
  return x.modality === MOD.musculacao && x.material === MATERIAL_MAQUINA;
}

export type LadoMusculos = "inferior" | "superior" | "ambos" | "core" | "nenhum";
/** Lado A/B pelos músculos. A classificação guarda os músculos em ordem canônica do
 *  vocabulário (sem "principal"), então quem mistura inferior e superior é "ambos". */
export function ladoPelosMusculos(musculos: readonly string[]): LadoMusculos {
  const inf = algum(musculos, MUSCULOS_INFERIOR), sup = algum(musculos, MUSCULOS_SUPERIOR);
  if (inf && sup) return "ambos";
  if (inf) return "inferior";
  if (sup) return "superior";
  return algum(musculos, MUSCULOS_CORE) ? "core" : "nenhum";
}

function ehPastaPilates(x: ItemCatalogo, aparelho: string | null): boolean {
  return x.modality === MOD.mqpilates && x.muscularGroup === GRUPO_LIVE && (aparelho ? x.material === aparelho : inclui(APARELHOS_PILATES, x.material));
}

function ehAtivacao(x: ItemCatalogo, hipertrofia: boolean): boolean {
  if (x.modality === MOD.funcional && inclui(ATIVACAO_MATERIAIS_FUNCIONAL, x.material)) return true;
  if (x.modality === MOD.abdominal && x.material === ATIVACAO_PESO_DO_CORPO) return true;
  if (hipertrofia && x.modality === MOD.musculacao && inclui(ATIVACAO_EXTRA_HIPERTROFIA, x.material)) return true;
  return false;
}

function idosoSeguro(x: ItemCatalogo): boolean {
  return x.idoso && !inclui(IDOSO_MODALITIES_FORA, x.modality) && !algum(x.categorias, IDOSO_CATEGORIAS_PROIBIDAS) && x.impacto === IDOSO_IMPACTO;
}

function pastaPrincipalFuncional(x: ItemCatalogo, familia: string): boolean {
  switch (familia) {
    case "hipertrofia": return x.modality === MOD.musculacao && inclui(MATERIAIS_HIPERTROFIA, x.material);
    case "condicionamento":
    case "extreme": return inclui(MODALITIES_CONDICIONAMENTO, x.modality);
    case "cardio_hiit": return x.modality === MOD.aparelhosCardio || x.modality === MOD.combinados || (x.modality === MOD.funcional && inclui(MATERIAIS_CARDIO_HIIT_FUNCIONAL, x.material));
    case "idoso": return true; // qualquer modality menos as de Pilates: o filtro é idosoSeguro
    default: return false;
  }
}

export function musculosDasCondicoes(condicoes: readonly string[]): string[] {
  return [...new Set(condicoes.flatMap((c) => MUSCULOS_DA_CONDICAO[c] ?? []))];
}

/** Reabilitação, bloco de lesão: pastas base com a condição em indicacoes OU músculo
 *  do mapa; fora das pastas base, SÓ os marcados com a condição.
 *  - agudo e crônico: base = prevenção de lesão (todas as fases) + reabilitação da fase;
 *  - mob_sm (Richard, 23/10): base = só reabilitação (sensório motor e mobilidade); a
 *    prevenção de lesão NÃO entra nos blocos de lesão (nem marcada) — ela pode ir para
 *    "outras musculaturas". */
function ehLesao(x: ItemCatalogo, fase: string | null, condicoes: readonly string[]): boolean {
  const marcado = algum(x.indicacoes, condicoes);
  const fasesOk = FASE_CLASSIFICACAO[fase ?? ""] ?? [];
  if (fase === "mob_sm" && x.modality === MOD.prevencao) return false;
  const naBase = (x.modality === MOD.prevencao && fase !== "mob_sm") || (x.modality === MOD.reabilitacao && x.fase !== null && fasesOk.includes(x.fase));
  if (naBase) return marcado || algum(x.musculos, musculosDasCondicoes(condicoes));
  return marcado;
}

/** Reabilitação, outras musculaturas: fora de mqpilates/pilates/mqreformer/idosos e sem
 *  nenhum músculo do mapa da condição (o N1 é regra de nível, em niveis.ts). */
function ehOutrasMusculaturas(x: ItemCatalogo, condicoes: readonly string[]): boolean {
  if (inclui(FORA_DE_OUTRAS_MUSCULATURAS, x.modality)) return false;
  return !algum(x.musculos, musculosDasCondicoes(condicoes));
}

/** O exercício pertence à pasta deste bloco do esqueleto? (sem regra de nível) */
export function naPastaDoBloco(x: ItemCatalogo, e: Esqueleto, b: BlocoEsqueleto): boolean {
  if (!disponivel(x)) return false;
  const f = e.familia;
  // V2-4: posição avançada (suspenso/invertido, misto) só a partir do N3 nas famílias mqpilates.
  if (ehFamiliaMqpilates(f) && !posicaoPermitida(x.posicao, e.nivelBase)) return false;
  if (f === "pilates" || f === "gestante" || f === "protocolo_dor" || f === "alongamento") {
    if (!ehPastaPilates(x, b.aparelho)) return false;
    if (f === "alongamento") return x.categorias.length > 0 && x.categorias.every((c) => inclui(CATEGORIAS_LIVRES, c));
    if (f === "gestante" || f === "protocolo_dor") return algum(x.indicacoes, e.condicoes);
    return true;
  }
  if (f === "reformer") return ehPastaPilates(x, "reformer");
  if (f === "reabilitacao") {
    if (b.tipo === "lesao") return ehLesao(x, e.fase, e.condicoes);
    if (b.tipo === "outras_musculaturas") return ehOutrasMusculaturas(x, e.condicoes);
    return false;
  }
  // funcionais
  if (f === "idoso" && !idosoSeguro(x)) return false;
  const lado = ladoPelosMusculos(x.musculos);
  if (b.tipo === "ativacao") {
    if (!ehAtivacao(x, f === "hipertrofia")) return false;
    // Hipertrofia: mesmo membro do treino (A/B); core só aqui.
    if (f === "hipertrofia") return lado === "core" || lado === "ambos" || lado === e.ladoHipertrofia;
    return true;
  }
  if (b.tipo === "principal") {
    if (!pastaPrincipalFuncional(x, f)) return false;
    if (f === "hipertrofia") return lado === "ambos" || lado === e.ladoHipertrofia; // core só na ativação
    return true;
  }
  return false;
}
