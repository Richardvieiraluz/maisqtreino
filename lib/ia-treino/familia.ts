// Família, nível, fase e condições do protocolo da master (migration 073).
//
// PURO (sem server-only): usado pela tela de protocolos da master, pela action
// (validação única) e por scripts/preencher-protocolos.mts (proposta a partir do
// nome). Os valores são os mesmos dos CHECK da 073 — o teste sem banco confere.
//
// Por que existe: até aqui o nível do protocolo só vinha do NOME ("Nível 1.1 (N1.1)",
// "Extreme N3"), e 24 dos 73 protocolos não têm nível no nome. Estes campos tornam
// isso dado — sem mexer nas colunas antigas master_protocols.level e
// workout_trainings.level.

import { INDICACOES, parseIndicacoes, normalizarTexto, type Indicacao } from "./apoio";

export const FAMILIAS = [
  { valor: "pilates",         rotulo: "Pilates" },
  // 074 (decisão do Richard, 22/10/2026). Sem nível, sem fase, sem condições.
  // Regra para a IA v2: só exercícios da pasta Pilates (mqpilates · live · os 4
  // aparelhos) cujas categorias sejam APENAS alongamento e/ou mobilidade; a
  // estrutura é a de um treino normal de Pilates.
  { valor: "alongamento",     rotulo: "Alongamento (Pilates)" },
  { valor: "reformer",        rotulo: "Reformer" },
  { valor: "condicionamento", rotulo: "Condicionamento" },
  { valor: "hipertrofia",     rotulo: "Hipertrofia" },
  { valor: "cardio_hiit",     rotulo: "Cardio/HIIT" },
  { valor: "extreme",         rotulo: "Extreme" },
  { valor: "idoso",           rotulo: "Idoso" },
  { valor: "reabilitacao",    rotulo: "Reabilitação" },
  { valor: "protocolo_dor",   rotulo: "Protocolo de dor (Pilates)" },
  { valor: "gestante",        rotulo: "Gestante" },
  { valor: "fora_da_ia",      rotulo: "Fora da IA" },
] as const;
export type Familia = (typeof FAMILIAS)[number]["valor"];
export const VALORES_FAMILIAS: readonly Familia[] = FAMILIAS.map((f) => f.valor);

export const NIVEIS_PROTOCOLO = ["N0", "N1", "N1.1", "N2", "N2.1", "N3", "N3.1", "N4", "N4.1", "N5", "N5.1"] as const;
export type NivelProtocolo = (typeof NIVEIS_PROTOCOLO)[number];

export const FASES_PROTOCOLO = [
  { valor: "agudo",   rotulo: "Agudo" },
  { valor: "cronico", rotulo: "Crônico" },
  { valor: "mob_sm",  rotulo: "Mobilidade + sensório motor" },
] as const;
export type FaseProtocolo = (typeof FASES_PROTOCOLO)[number]["valor"];
export const VALORES_FASES_PROTOCOLO: readonly FaseProtocolo[] = FASES_PROTOCOLO.map((f) => f.valor);

/** Condições = o mesmo vocabulário das indicações do exercício (gestante, cervical, ombro…). */
export const CONDICOES = INDICACOES;

/** Famílias que têm nível (o campo Nível só aparece nelas). */
export const FAMILIAS_COM_NIVEL: readonly Familia[] = ["pilates", "reformer", "condicionamento", "hipertrofia", "cardio_hiit", "extreme", "idoso"];
/** Famílias que têm condições (o campo Condições só aparece nelas). */
export const FAMILIAS_COM_CONDICOES: readonly Familia[] = ["reabilitacao", "protocolo_dor", "gestante"];
/** Só reabilitação tem fase (também é CHECK de coerência na 073). */
export const FAMILIA_COM_FASE: Familia = "reabilitacao";

export interface CamposProtocolo {
  familia: Familia | null;
  nivel: NivelProtocolo | null;
  fase: FaseProtocolo | null;
  condicoes: Indicacao[];
}

export const CAMPOS_VAZIOS: CamposProtocolo = { familia: null, nivel: null, fase: null, condicoes: [] };

/** Validação ÚNICA (action e script). Campo que não vale para a família escolhida é
 *  descartado (a tela nem mostra), não vira erro; valor fora do vocabulário é erro. */
export function validarCamposProtocolo(cru: {
  familia?: string | null; nivel?: string | null; fase?: string | null; condicoes?: readonly string[] | null;
}): { ok: true; valor: CamposProtocolo } | { ok: false; erro: string } {
  const familiaCru = String(cru.familia ?? "").trim();
  if (!familiaCru) return { ok: true, valor: { ...CAMPOS_VAZIOS } };
  if (!VALORES_FAMILIAS.includes(familiaCru as Familia)) return { ok: false, erro: `Família inválida: ${familiaCru}.` };
  const familia = familiaCru as Familia;

  let nivel: NivelProtocolo | null = null;
  if (FAMILIAS_COM_NIVEL.includes(familia)) {
    const n = String(cru.nivel ?? "").trim();
    if (n) {
      if (!(NIVEIS_PROTOCOLO as readonly string[]).includes(n)) return { ok: false, erro: `Nível inválido: ${n}.` };
      nivel = n as NivelProtocolo;
    }
  }

  let fase: FaseProtocolo | null = null;
  if (familia === FAMILIA_COM_FASE) {
    const f = String(cru.fase ?? "").trim();
    if (f) {
      if (!VALORES_FASES_PROTOCOLO.includes(f as FaseProtocolo)) return { ok: false, erro: `Fase inválida: ${f}.` };
      fase = f as FaseProtocolo;
    }
  }

  let condicoes: Indicacao[] = [];
  if (FAMILIAS_COM_CONDICOES.includes(familia)) {
    const r = parseIndicacoes(cru.condicoes ?? []);
    if (!r.ok) return { ok: false, erro: r.erro };
    condicoes = r.valor;
  }

  return { ok: true, valor: { familia, nivel, fase, condicoes } };
}

// ── proposta a partir do nome (scripts/preencher-protocolos.mts) ─────────────

const RE_NIVEL = /\bN(\d)(\.1)?\b/;
function nivelDoNome(nome: string): NivelProtocolo | null {
  const m = nome.match(RE_NIVEL);
  if (!m) return null;
  const n = `N${m[1]}${m[2] ?? ""}`;
  return (NIVEIS_PROTOCOLO as readonly string[]).includes(n) ? (n as NivelProtocolo) : null;
}

/** Condições pelas palavras do nome ("Joelho e Quadril" → joelho, quadril). */
function condicoesDoNome(nome: string): Indicacao[] {
  const t = normalizarTexto(nome);
  const achadas: string[] = [];
  if (/\bcervical\b/.test(t)) achadas.push("cervical");
  if (/\bombros?\b/.test(t)) achadas.push("ombro");
  if (/\bdorsal\b/.test(t)) achadas.push("dorsal");
  if (/\blombar\b/.test(t)) achadas.push("lombar");
  if (/\bquadril\b/.test(t)) achadas.push("quadril");
  if (/\bjoelhos?\b/.test(t)) achadas.push("joelho");
  if (/\btornozelos?\b/.test(t)) achadas.push("tornozelo");
  const r = parseIndicacoes(achadas);
  return r.ok ? r.valor : [];
}

const FAMILIA_FUNCIONAL_PELO_INICIO: ReadonlyArray<[RegExp, Familia]> = [
  [/^condicionamento\b/, "condicionamento"],
  [/^hipertrofia\b/, "hipertrofia"],
  [/^cardio\s*\/?\s*-?\s*hiit\b/, "cardio_hiit"],
  [/^extreme\b/, "extreme"],
  [/^idoso\b/, "idoso"],
];

/** Proposta de família/nível/fase/condições pelo nome + modalidade + category.
 *  Não chuta: o que não encaixa numa regra volta null ("sem proposta"). */
export function proporCamposProtocolo(p: { name: string; modality: string | null; category: string | null }): CamposProtocolo | null {
  const nome = String(p.name ?? "").trim();
  const t = normalizarTexto(nome);
  const modality = String(p.modality ?? "").trim().toLowerCase();
  const category = String(p.category ?? "").trim().toLowerCase();
  const so = (familia: Familia, extra: Partial<CamposProtocolo> = {}): CamposProtocolo => ({ ...CAMPOS_VAZIOS, familia, ...extra });

  // Fora da IA: experimentais (vem ANTES de tudo: "Aula Experimental - Alongamentos"
  // continua fora), plataformas de parceria, dor pontual.
  if (category === "experimental") return so("fora_da_ia");
  if (/wellhub|totalpass|classpass/.test(t)) return so("fora_da_ia");
  if (category === "dor_pontual" || t === "dor pontual") return so("fora_da_ia");
  // "Alongamentos" do Pilates → família alongamento (074). Em outra modalidade, não chuta.
  if (t === "alongamentos") return modality === "pilates" ? so("alongamento") : null;

  const nivel = nivelDoNome(nome);

  // Pilates "Nível 1 (N1)", "Nível 1.1 (N1.1)"…
  if (modality === "pilates" && /^nivel \d/.test(t)) return nivel ? so("pilates", { nivel }) : null;
  // Reformer N1/N2
  if (modality === "reformer" && /^reformer\b/.test(t)) return nivel ? so("reformer", { nivel }) : null;
  // Funcional: Condicionamento / Hipertrofia / Cardio-HIIT / Extreme / Idoso + nível
  if (modality === "funcional") {
    for (const [re, familia] of FAMILIA_FUNCIONAL_PELO_INICIO) {
      if (re.test(t)) return nivel ? so(familia, { nivel }) : null;
    }
  }
  // Reabilitação <região>: fase fica NULL (a master define)
  if (/^reabilitacao\b/.test(t)) {
    const condicoes = condicoesDoNome(nome);
    return condicoes.length ? so("reabilitacao", { condicoes }) : null;
  }
  // Protocolo <região> (Pilates): protocolo de dor
  if (/^protocolo\b/.test(t)) {
    const condicoes = condicoesDoNome(nome);
    return condicoes.length ? so("protocolo_dor", { condicoes }) : null;
  }
  // Gestante (3º ao 6º mês) / (6º ao 9º mês)
  if (/^gestante\b/.test(t)) {
    if (/\b3\D+6\b/.test(t)) return so("gestante", { condicoes: ["gestante_3_6"] });
    if (/\b6\D+9\b/.test(t)) return so("gestante", { condicoes: ["gestante_6_9"] });
    return null;
  }
  return null;
}

export const rotuloFamilia = (v: string | null | undefined) => FAMILIAS.find((f) => f.valor === v)?.rotulo ?? "—";
export const rotuloFase = (v: string | null | undefined) => FASES_PROTOCOLO.find((f) => f.valor === v)?.rotulo ?? "—";
