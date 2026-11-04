// IA de treino v2 — PASSO "b": candidatos por bloco do esqueleto (PR V2-2). PURO.
//
// Entrada: o esqueleto do PRÓXIMO treino (esqueleto.ts), o catálogo (classificação +
// exercises, já carregado em lote pela camada de dados) e o histórico do protocolo
// (recentes = exercícios dos 6 treinos anteriores; anterior = os do treino anterior).
// Saída: por bloco, a lista de candidatos (com marcas de nível e de recente), as
// contagens e os avisos. A IA (V2-3) só escolhe dentro desta lista.
//
// Regras de nível (decisão do Richard):
// - fora do aquecimento: níveis do exercício incluem o nível do bloco (base do
//   esqueleto, ou o nível fixo do bloco);
// - LIVRES em qualquer nível: alongamento/mobilidade puros e aparelhos cardio;
// - aquecimento (os N primeiros do bloco): aceita também nível − 1 (marcado soAquecimento);
// - preparação (treinos 19–24): nível + 1 entra marcado nivelSeguinte (cota no esqueleto);
// - EXCEÇÃO DE ESTOQUE: se os inéditos do nível não cobrem 2/3 dos exercícios do bloco
//   com folga (FOLGA_ESTOQUE), amplia para nível − 1 (Reformer N3/N4 até − 2; hipertrofia
//   HIPERTROFIA_DESCER_NIVEIS), marcando nivelAbaixo.
// - CONDICIONAMENTO, blocos principais (Richard, 25/10): cota de MÁQUINAS reservada
//   antes da amostra (até nº de blocos principais + 2), com nível ≤ o do protocolo.
//   Máquina sem o nível do protocolo entra marcada maquinaAbaixo (NÃO é exceção de
//   estoque; a validação aceita no máximo 1 por bloco).

import type { BlocoEsqueleto, Esqueleto } from "./esqueleto";
import { ehFamiliaMqpilates, ehLivre, ehMaquina, ladoPelosMusculos, naPastaDoBloco, regraMolaAplica, FAMILIA_COM_MAQUINA, FASE_MOBILIDADE, FASE_SENSORIO_MOTOR, MOD, type ItemCatalogo } from "./pastas";
import { menosTrabalhados, pontuacaoVariedade, type MenosTrabalhados } from "./variedade";

// ── constantes ───────────────────────────────────────────────────────────────

/** Folga da exceção de estoque: inéditos do nível precisam cobrir 2/3 × folga. */
export const FOLGA_ESTOQUE = 1.5;
/** Profundidade da exceção de estoque. */
export const DESCER_NIVEIS_PADRAO = 1;
/** Reformer N3/N4: pode descer até 2 níveis. */
export const REFORMER_DESCER_NIVEIS_N3_N4 = 2;
/** Hipertrofia: A DECIDIR depois da revisão do Richard. */
export const HIPERTROFIA_DESCER_NIVEIS = 1;
/** Máximo de candidatos por bloco enviados à IA. */
export const LIMITE_CANDIDATOS_POR_BLOCO = 40;
/** Fração dos inéditos exigida no treino (regra dos 2/3). */
export const FRACAO_INEDITOS = 2 / 3;
/** Condicionamento: máquinas reservadas = nº de blocos principais + este extra. */
export const MAQUINAS_EXTRA_NA_COTA = 2;
/** Cardio/HIIT (Richard, 25/10): aparelho cardio "não é obrigatório, mas pode ter". Nos
 *  blocos principais, até este nº de exercícios da pasta "aparelhos cardio" é reservado
 *  ANTES da amostra proporcional, só para a IA PODER escolher. Sem validação, sem erro,
 *  sem aviso; nada muda nas outras famílias. */
export const RESERVA_APARELHO_CARDIO = 3;
export const FAMILIA_CARDIO_HIIT = "cardio_hiit";

// ── tipos ────────────────────────────────────────────────────────────────────

export interface Historico {
  /** Exercícios usados nos 6 treinos anteriores do protocolo. */
  recentes: ReadonlySet<string>;
  /** Exercícios do treino imediatamente anterior (validação "não igual ao anterior", V2-3). */
  anterior: readonly string[];
  /** Quantos treinos o protocolo já tem (a v2 gera o de posição total + 1). */
  totalAnteriores: number;
  /** Variedade (Richard, 25/10): exercícios dos últimos 12 treinos, um por treino, com
   *  repetição entre treinos. Ausente/vazio = a amostra e o prompt ficam como sempre. */
  usoUltimos12?: readonly string[];
}

export interface Candidato {
  ref: string;
  exerciseId: string;
  nome: string;
  modality: string;
  material: string;
  videoUrl: string;
  musculos: string[];
  padroes: string[];
  niveis: number[];
  unilateral: boolean | null;
  fase: string | null;
  /** V2-4: posição e acessórios do aparelho (sequência do bloco e prompt do Pilates/Reformer). */
  posicao: string;
  acessorios: string[];
  /** 076: usa mola? Só nas famílias mqpilates (null nas outras ou sem a coluna). */
  usaMola: boolean | null;
  recente: boolean;
  livre: boolean;
  /** Nível + 1 (preparação). */
  nivelSeguinte: boolean;
  /** Abaixo do nível pela EXCEÇÃO DE ESTOQUE. */
  nivelAbaixo: boolean;
  /** Nível − 1 aceito só nos primeiros exercícios do bloco (aquecimento). */
  soAquecimento: boolean;
  /** Condicionamento: máquina reservada SEM o nível do protocolo (nível abaixo pela
   *  regra da máquina; máx. 1 por bloco). Ausente nas outras famílias. */
  maquinaAbaixo?: boolean;
}

export interface ContagensBloco {
  elegiveis: number;
  ineditos: number;
  /** Elegíveis por nível do exercício (um exercício conta em cada nível que tem). */
  porNivel: Record<string, number>;
  porMarca: { base: number; livre: number; aquecimento: number; nivelSeguinte: number; nivelAbaixo: number };
  /** mob_sm: elegíveis por fase da classificação. */
  porFase?: Record<string, number>;
}

export interface CandidatosBloco {
  indice: number;
  tipo: BlocoEsqueleto["tipo"];
  aparelho: string | null;
  /** Blocos com a mesma pasta e o mesmo nível compartilham a lista (ex.: os 6 principais da hipertrofia). */
  grupo: string;
  candidatos: Candidato[];
  contagens: ContagensBloco;
  excecaoEstoque: { usada: boolean; desceu: number };
  /** mob_sm: quantos slots do bloco são de sensório motor e de mobilidade. */
  cotaFase: { sensorioMotor: number; mobilidade: number } | null;
  /** Condicionamento, blocos principais: a cota de máquinas (ausente nas outras famílias). */
  cotaMaquina?: CotaMaquina;
  /** Cardio/HIIT, blocos principais: aparelhos cardio reservados na lista (só diagnóstico). */
  reservaCardio?: { reservados: number; disponiveis: number };
  avisos: string[];
}

export interface CotaMaquina {
  /** Blocos principais do treino (precisam de 1 máquina cada). */
  blocos: number;
  /** Máquinas reservadas na lista de candidatos. */
  reservadas: number;
  /** Destas, quantas são de nível abaixo (maquinaAbaixo). */
  abaixo: number;
  /** Máquinas da pasta com nível ≤ o do protocolo (o estoque na hora de gerar). */
  disponiveis: number;
}

export interface ResultadoCandidatos {
  blocos: CandidatosBloco[];
  /** Índices dos blocos onde a exceção de estoque foi usada. */
  excecaoUsadaEm: number[];
  avisos: string[];
  /** Variedade: músculos/padrões menos trabalhados nos últimos 12 treinos (null = sem preferência). */
  variedade?: MenosTrabalhados | null;
}

// ── amostra (cópia pura dos helpers da v1.1, que está em módulo server-only) ──

/** mulberry32: gerador pequeno e determinístico. */
export function criarRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(itens: readonly T[], rng: () => number): T[] {
  const a = [...itens];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Amostra estratificada proporcional (maiores restos). Puro dado o rng. `prioridade`
 *  (variedade): dentro de cada estrato, os de pontuação maior entram primeiro; o rng
 *  continua desempatando (embaralha antes, ordenação estável depois). Sem ela, igual a sempre. */
export function amostraEstratificada<T>(itens: readonly T[], estrato: (x: T) => string, teto: number, rng: () => number, prioridade?: (x: T) => number): T[] {
  if (itens.length <= teto) return [...itens];
  const grupos = new Map<string, T[]>();
  for (const x of itens) { const k = estrato(x); const g = grupos.get(k); if (g) g.push(x); else grupos.set(k, [x]); }
  const total = itens.length;
  const chaves = [...grupos.keys()].sort();
  const cotas = chaves.map((k) => { const exato = (teto * grupos.get(k)!.length) / total; return { k, base: Math.floor(exato), resto: exato - Math.floor(exato) }; });
  let sobra = teto - cotas.reduce((s, c) => s + c.base, 0);
  for (const c of [...cotas].sort((x, y) => y.resto - x.resto || x.k.localeCompare(y.k))) { if (sobra <= 0) break; c.base++; sobra--; }
  const out: T[] = [];
  for (const c of cotas) {
    const grupo = embaralhar(grupos.get(c.k)!, rng);
    if (prioridade) grupo.sort((a, b) => prioridade(b) - prioridade(a));
    out.push(...grupo.slice(0, c.base));
  }
  return out;
}

/** Até `limite`, SEMPRE com os inéditos em maioria (recentes < inéditos). */
export function amostraComIneditosEmMaioria<T extends { recente: boolean }>(itens: readonly T[], estrato: (x: T) => string, limite: number, rng: () => number, prioridade?: (x: T) => number): T[] {
  const ineditos = itens.filter((x) => !x.recente);
  const recentes = itens.filter((x) => x.recente);
  const nIn = Math.min(ineditos.length, limite);
  const nRec = Math.min(recentes.length, limite - nIn, Math.max(0, nIn - 1));
  return [...amostraEstratificada(ineditos, estrato, nIn, rng, prioridade), ...amostraEstratificada(recentes, estrato, nRec, rng, prioridade)];
}

// ── níveis ───────────────────────────────────────────────────────────────────

function nivelDoBloco(e: Esqueleto, b: BlocoEsqueleto): number | null {
  if (b.nivelFixo) { const m = b.nivelFixo.match(/^N(\d)/); return m ? Number(m[1]) : null; }
  if (b.tipo === "lesao") return null; // reabilitação: os blocos de lesão não filtram por nível
  return e.nivelBase;
}

function profundidadeExcecao(e: Esqueleto): number {
  if (e.familia === "reformer" && (e.nivelBase === 3 || e.nivelBase === 4)) return REFORMER_DESCER_NIVEIS_N3_N4;
  if (e.familia === "hipertrofia") return HIPERTROFIA_DESCER_NIVEIS;
  return DESCER_NIVEIS_PADRAO;
}

type Marca = "base" | "livre" | "aquecimento" | "nivelSeguinte" | "nivelAbaixo";

// ── máquinas (condicionamento) ───────────────────────────────────────────────

/** O bloco recebe a cota de máquinas? Só condicionamento, só blocos principais. */
export function usaCotaMaquina(e: Esqueleto, b: BlocoEsqueleto): boolean {
  return e.familia === FAMILIA_COM_MAQUINA && b.tipo === "principal";
}

/** Máquinas da pasta do bloco (não arquivadas, não pendentes) com algum nível ≤ o nível
 *  base do protocolo. É o estoque da regra; lido do catálogo na hora de gerar. */
export function maquinasAteNivel(e: Esqueleto, b: BlocoEsqueleto, catalogo: readonly ItemCatalogo[]): ItemCatalogo[] {
  const alvo = e.nivelBase;
  if (alvo === null) return [];
  return catalogo.filter((x) => ehMaquina(x) && naPastaDoBloco(x, e, b) && x.niveis.some((n) => n <= alvo));
}

/** Escolhe até `teto` máquinas: primeiro as que já são elegíveis pelo nível (base/livre/
 *  exceção de estoque), depois as de nível abaixo; dentro disso, inéditas antes das
 *  recentes; e, dentro da mesma camada, alterna inferior/superior pelos músculos. */
export function reservarMaquinas(
  pool: readonly ItemCatalogo[], elegivelPeloNivel: (x: ItemCatalogo) => boolean,
  recentes: ReadonlySet<string>, teto: number, rng: () => number,
): Array<{ x: ItemCatalogo; abaixo: boolean }> {
  const camada = (x: ItemCatalogo) => (elegivelPeloNivel(x) ? 0 : 2) + (recentes.has(x.id) ? 1 : 0);
  const resto = embaralhar(pool, rng).sort((a, b) => camada(a) - camada(b));
  const out: Array<{ x: ItemCatalogo; abaixo: boolean }> = [];
  let inf = 0, sup = 0;
  while (out.length < teto && resto.length) {
    const c0 = camada(resto[0]);
    const falta = inf < sup ? "inferior" : sup < inf ? "superior" : null;
    const j = falta ? resto.findIndex((x) => camada(x) === c0 && ladoPelosMusculos(x.musculos) === falta) : -1;
    const [x] = resto.splice(Math.max(j, 0), 1);
    const lado = ladoPelosMusculos(x.musculos);
    if (lado === "inferior" || lado === "ambos") inf++;
    if (lado === "superior" || lado === "ambos") sup++;
    out.push({ x, abaixo: !elegivelPeloNivel(x) });
  }
  return out;
}

// ── aparelho cardio (cardio/hiit) ────────────────────────────────────────────

/** Aparelho cardio FORA da regra dos 2/3 (decisão do Richard, 25/10/2026): em qualquer
 *  família, um exercício da pasta "aparelhos cardio" nunca recebe a marca R (recente),
 *  mesmo que esteja nos 6 treinos anteriores. A validação também o deixa fora da conta
 *  (validar.ts). São 4 aparelhos (bike, remo, esteira, elíptico): com a marca R eles
 *  viravam "usados" em todo protocolo que os usa e a IA parava de escolhê-los. */
export function ehAparelhoCardio(x: Pick<ItemCatalogo, "modality">): boolean {
  return x.modality === MOD.aparelhosCardio;
}
export function ehRecenteParaOsDoisTercos(x: Pick<ItemCatalogo, "id" | "modality">, recentes: ReadonlySet<string>): boolean {
  return recentes.has(x.id) && !ehAparelhoCardio(x);
}

/** O bloco reserva aparelhos cardio? Só cardio_hiit, só blocos principais. */
export function usaReservaCardio(e: Esqueleto, b: BlocoEsqueleto): boolean {
  return e.familia === FAMILIA_CARDIO_HIIT && b.tipo === "principal";
}

/** Até `teto` aparelhos cardio dentre os elegíveis do bloco: inéditos antes dos recentes,
 *  embaralhados pelo rng. Eles já são livres de nível (ehLivre), então não há marca nova. */
export function reservarAparelhosCardio(elegiveis: readonly ItemCatalogo[], recentes: ReadonlySet<string>, teto: number, rng: () => number): ItemCatalogo[] {
  const pool = elegiveis.filter((x) => x.modality === MOD.aparelhosCardio);
  return embaralhar(pool, rng).sort((a, b) => Number(recentes.has(a.id)) - Number(recentes.has(b.id))).slice(0, Math.max(0, teto));
}

// ── função principal ─────────────────────────────────────────────────────────

export function candidatosPorBloco(
  e: Esqueleto,
  catalogo: readonly ItemCatalogo[],
  historico: Historico,
  opcoes: {
    seed?: number; limite?: number;
    /** TODOS os elegíveis, sem amostra nem teto (editor: "Trocar" e painel de regras —
     *  precisa enxergar qualquer exercício que a IA pôde escolher, inclusive recentes). */
    todos?: boolean;
  } = {},
): ResultadoCandidatos {
  const limite = opcoes.limite ?? LIMITE_CANDIDATOS_POR_BLOCO;
  const rng = criarRng(opcoes.seed ?? 1);
  // Variedade (Richard, 25/10): prioridade suave dentro de cada estrato da amostra; null = igual a sempre.
  const variedade = menosTrabalhados(e, catalogo, historico);
  const prioridade = variedade ? (c: { x: ItemCatalogo }) => pontuacaoVariedade(c.x, variedade) : undefined;
  const refs = new Map<string, string>();
  const refDe = (id: string) => { let r = refs.get(id); if (!r) { r = `E${refs.size + 1}`; refs.set(id, r); } return r; };
  const profundidade = profundidadeExcecao(e);

  // Grupos de blocos com a mesma pasta e o mesmo nível: a exceção de estoque olha a
  // soma dos exercícios do grupo (6 blocos de hipertrofia disputam a mesma pasta).
  const chaveGrupo = (b: BlocoEsqueleto) => `${b.tipo}|${b.aparelho ?? ""}|${nivelDoBloco(e, b) ?? "-"}`;
  const exerciciosDoGrupo = new Map<string, number>();
  for (const b of e.blocos) exerciciosDoGrupo.set(chaveGrupo(b), (exerciciosDoGrupo.get(chaveGrupo(b)) ?? 0) + b.exercicios);
  const cache = new Map<string, Omit<CandidatosBloco, "indice" | "tipo" | "aparelho" | "cotaFase">>();

  const blocos: CandidatosBloco[] = [];
  for (const b of e.blocos) {
    const grupo = chaveGrupo(b);
    let r = cache.get(grupo);
    if (!r) {
      const alvo = nivelDoBloco(e, b);
      const pasta = catalogo.filter((x) => naPastaDoBloco(x, e, b));
      const marcas = new Map<string, Marca>();
      const preparacao = e.preparacaoNivelSeguinte && (b.tipo === "principal" || b.tipo === "aparelho");
      for (const x of pasta) {
        if (alvo === null) { marcas.set(x.id, ehLivre(x) ? "livre" : "base"); continue; }
        if (x.niveis.includes(alvo)) marcas.set(x.id, "base");
        else if (ehLivre(x)) marcas.set(x.id, "livre");
        else if (preparacao && x.niveis.includes(alvo + 1)) marcas.set(x.id, "nivelSeguinte");
        else if (b.aquecimentoPermiteNivelAbaixo > 0 && x.niveis.includes(alvo - 1)) marcas.set(x.id, "aquecimento");
      }
      // Exceção de estoque (só onde há nível a descer; o bloco de nível fixo não desce).
      const necessario = Math.ceil(FRACAO_INEDITOS * (exerciciosDoGrupo.get(grupo) ?? b.exercicios));
      const ineditosDoNivel = () => pasta.filter((x) => { const m = marcas.get(x.id); return (m === "base" || m === "livre" || m === "nivelAbaixo") && !historico.recentes.has(x.id); }).length;
      let desceu = 0;
      if (alvo !== null && !b.nivelFixo) {
        while (ineditosDoNivel() < necessario * FOLGA_ESTOQUE && desceu < profundidade && alvo - desceu - 1 >= 0) {
          desceu++;
          const nivelNovo = alvo - desceu;
          for (const x of pasta) {
            const m = marcas.get(x.id);
            if ((m === undefined || m === "aquecimento") && x.niveis.includes(nivelNovo)) marcas.set(x.id, "nivelAbaixo");
          }
        }
      }
      const elegiveis = pasta.filter((x) => marcas.has(x.id));
      const avisos: string[] = [];
      if (desceu > 0) avisos.push(`exceção de estoque: desceu ${desceu} nível(is) (N${(alvo ?? 0) - desceu})`);
      const ineditos = elegiveis.filter((x) => !historico.recentes.has(x.id) && marcas.get(x.id) !== "aquecimento" && marcas.get(x.id) !== "nivelSeguinte").length;
      if (ineditos < necessario) avisos.push(`estoque insuficiente: ${ineditos} inédito(s) para ${necessario} necessários (2/3 de ${exerciciosDoGrupo.get(grupo)} exercício(s))`);

      const porNivel: Record<string, number> = {};
      for (const x of elegiveis) for (const n of x.niveis) porNivel[`N${n}`] = (porNivel[`N${n}`] ?? 0) + 1;
      const porMarca = { base: 0, livre: 0, aquecimento: 0, nivelSeguinte: 0, nivelAbaixo: 0 };
      for (const x of elegiveis) porMarca[marcas.get(x.id)!]++;
      const porFase: Record<string, number> | undefined = e.fase === "mob_sm" && b.tipo === "lesao" ? {} : undefined;
      if (porFase) for (const x of elegiveis) { const k = x.fase ?? "sem fase"; porFase[k] = (porFase[k] ?? 0) + 1; }

      // Condicionamento: cota de máquinas ANTES da amostra proporcional.
      let reservadas: Array<{ x: ItemCatalogo; abaixo: boolean }> = [];
      let cotaMaquina: CotaMaquina | undefined;
      if (usaCotaMaquina(e, b)) {
        const pool = maquinasAteNivel(e, b, catalogo);
        const nBlocos = e.blocos.filter((bb) => usaCotaMaquina(e, bb)).length;
        const elegivelPeloNivel = (x: ItemCatalogo) => { const m = marcas.get(x.id); return m === "base" || m === "livre" || m === "nivelAbaixo"; };
        reservadas = reservarMaquinas(pool, elegivelPeloNivel, historico.recentes, Math.min(limite, nBlocos + MAQUINAS_EXTRA_NA_COTA), rng);
        cotaMaquina = { blocos: nBlocos, reservadas: reservadas.length, abaixo: reservadas.filter((r) => r.abaixo).length, disponiveis: pool.length };
        if (reservadas.length < nBlocos) avisos.push(`estoque de máquina: ${reservadas.length} para ${nBlocos} blocos`);
      }
      // Cardio/HIIT: até 3 aparelhos cardio reservados ANTES da amostra (opcional para a IA).
      let reservaCardio: CandidatosBloco["reservaCardio"];
      let cardioReservados: ItemCatalogo[] = [];
      if (usaReservaCardio(e, b)) {
        cardioReservados = reservarAparelhosCardio(elegiveis, historico.recentes, Math.min(limite, RESERVA_APARELHO_CARDIO), rng);
        reservaCardio = { reservados: cardioReservados.length, disponiveis: elegiveis.filter((x) => x.modality === MOD.aparelhosCardio).length };
      }
      const idsReservados = new Set([...reservadas.map((r) => r.x.id), ...cardioReservados.map((x) => x.id)]);
      const recente = (x: ItemCatalogo) => ehRecenteParaOsDoisTercos(x, historico.recentes);
      const marcados = elegiveis.filter((x) => !idsReservados.has(x.id)).map((x) => ({ x, marca: marcas.get(x.id)! as Marca | "maquinaAbaixo", recente: recente(x) }));
      const amostra = [
        ...reservadas.map(({ x, abaixo }) => ({ x, marca: abaixo ? "maquinaAbaixo" as const : marcas.get(x.id)!, recente: recente(x) })),
        ...cardioReservados.map((x) => ({ x, marca: marcas.get(x.id)!, recente: recente(x) })),
        ...(opcoes.todos ? marcados : amostraComIneditosEmMaioria(marcados, (c) => `${c.marca}|${c.x.material}|${c.x.fase ?? ""}`, limite - reservadas.length - cardioReservados.length, rng, prioridade)),
      ];
      const candidatos: Candidato[] = amostra.map(({ x, marca, recente }) => ({
        ref: refDe(x.id), exerciseId: x.id, nome: x.nome, modality: x.modality, material: x.material, videoUrl: x.videoUrl,
        musculos: [...x.musculos], padroes: [...x.padroes], niveis: [...x.niveis], unilateral: x.unilateral, fase: x.fase, posicao: x.posicao, acessorios: [...x.acessorios],
        // Rodada 11: mola só no Cadillac (nos outros aparelhos fica null = sem regra)
        usaMola: ehFamiliaMqpilates(e.familia) && regraMolaAplica(x.material) ? x.usaMola : null,
        recente, livre: marca === "livre",
        nivelSeguinte: marca === "nivelSeguinte", nivelAbaixo: marca === "nivelAbaixo", soAquecimento: marca === "aquecimento",
        ...(marca === "maquinaAbaixo" ? { maquinaAbaixo: true } : {}),
      }));
      r = { grupo, candidatos, contagens: { elegiveis: elegiveis.length, ineditos, porNivel, porMarca, ...(porFase ? { porFase } : {}) }, excecaoEstoque: { usada: desceu > 0, desceu }, ...(cotaMaquina ? { cotaMaquina } : {}), ...(reservaCardio ? { reservaCardio } : {}), avisos };
      cache.set(grupo, r);
    }
    const sm = e.proporcaoSensorioMotor !== null && b.tipo === "lesao" ? Math.round(e.proporcaoSensorioMotor * b.exercicios) : null;
    blocos.push({
      indice: b.indice, tipo: b.tipo, aparelho: b.aparelho, ...r,
      cotaFase: sm === null ? null : { sensorioMotor: sm, mobilidade: b.exercicios - sm },
    });
  }
  const excecaoUsadaEm = blocos.filter((b) => b.excecaoEstoque.usada).map((b) => b.indice);
  // Um aviso por grupo de pasta (os blocos de um grupo compartilham a mesma lista).
  const vistos = new Map<string, number[]>();
  for (const b of blocos) vistos.set(b.grupo, [...(vistos.get(b.grupo) ?? []), b.indice + 1]);
  const avisos = [...vistos].flatMap(([g, idx]) => {
    const b = blocos.find((x) => x.grupo === g)!;
    const rotulo = idx.length === 1 ? `bloco ${idx[0]}` : `blocos ${idx.join(", ")}`;
    return b.avisos.map((a) => `${rotulo}: ${a}`);
  });
  return { blocos, excecaoUsadaEm, avisos, variedade };
}

/** Rótulos das fases da classificação usadas no mob_sm (para o prompt/validação). */
export const FASES_MOB_SM = { sensorioMotor: FASE_SENSORIO_MOTOR, mobilidade: FASE_MOBILIDADE } as const;
