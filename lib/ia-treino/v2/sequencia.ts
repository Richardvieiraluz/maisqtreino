// IA de treino v2 — SEQUÊNCIA dentro do bloco (PR V2-4). PURO.
//
// Aplicada pelo CÓDIGO depois da validação, nas famílias mqpilates (reformer,
// pilates, protocolo_dor, gestante, alongamento). O prompt também pede essa ordem,
// mas quem garante é aqui; ordem nunca gasta nova tentativa (Richard, 23/10).
//
// 1. Unidade: itens SEGUIDOS com o mesmo exercício (a dupla unilateral do Reformer,
//    direita → esquerda) andam juntos e nunca se separam.
// 2. N0, N1 e N1.1 (e famílias sem nível: protocolo_dor, gestante, alongamento):
//    POSIÇÃO PRIMEIRO (deitado → sentado → ajoelhado → quatro apoios → em pé →
//    suspenso/misto). Dentro de cada posição, agrupa por ACESSÓRIO (chave = acessórios
//    ordenados; vazio = "sem acessório"), grupos na ordem da IA, exceto:
//    - 1º: o grupo igual ao acessório do último exercício da posição anterior;
//    - último: o grupo igual ao acessório do primeiro exercício da próxima posição
//      (se não for o 1º). Como a próxima posição começa pelo acessório com que esta
//      termina, vale o grupo que também existe na próxima posição (empate: o que
//      aparece antes lá, na ordem da IA).
//    Dentro do grupo, ordem da IA. (Richard, 24/10: deitado → ajoelhado → deitado não.)
// 3. N2 em diante: só agrupa por acessório (grupos na ordem em que aparecem na
//    resposta da IA) e mantém a ordem da IA dentro de cada grupo (pode mesclar posições).
// 4. ALÇAS NO REFORMER (Richard, 26/10, rodada 11): ANTES de 2/3, o bloco se divide em
//    dois grupos — primeiro TODOS os sem alça, depois TODOS com "alça de mão"/"alça de
//    pé" — e 2/3 valem dentro de cada grupo (N0–N1.1: posição e acessório; N2+: só
//    acessório). A dupla unilateral não se separa. Bloco do Reformer só com alça →
//    aviso (avisosSoAlca), sem recusar.
// 5. SEM MOLA NA FRENTE (076; só CADILLAC desde a rodada 11 — nos outros aparelhos o
//    candidato chega com usaMola null), depois de 2/3: os sem mola, na ordem já
//    calculada, vão para o início do bloco até somar no máximo 2 posições. O que não
//    cabe fica onde está. Bloco com Cadillac sem nenhum sem mola → aviso no rascunho
//    (avisosSemMola), sem recusar nem gastar nova tentativa.

import type { Esqueleto } from "./esqueleto";
import type { Candidato, ResultadoCandidatos } from "./candidatos";
import type { RespostaV2 } from "./schema";
import { ehFamiliaMqpilates, temAlcaReformer, APARELHO_REGRA_ALCA } from "./pastas";

/** Posição → ordem (deitado 1 → sentado 2 → ajoelhado 3 → quatro apoios 4 → em pé 5;
 *  suspenso/invertido e misto, só N3+, por último = 6). Desconhecida = 6. */
export const ORDEM_POSICAO: Readonly<Record<string, number>> = {
  "deitado (supino)": 1, "deitado (prono)": 1, "deitado (lateral)": 1,
  "sentado": 2,
  "ajoelhado": 3,
  "quatro apoios": 4,
  "em pé": 5, "em pé no aparelho": 5,
  "suspenso/invertido": 6, "misto": 6,
};
export const ordemDaPosicao = (posicao: string) => ORDEM_POSICAO[posicao] ?? 6;
export const SEM_ACESSORIO = "sem acessório";
export const chaveAcessorios = (acessorios: readonly string[]) => (acessorios.length ? [...acessorios].sort().join(" + ") : SEM_ACESSORIO);
/** Até este nível base (N0, N1, N1.1) a posição vem primeiro. */
export const NIVEL_MAX_ORDENA_POSICAO = 1;

/** Sem mola na frente: no máximo estas posições no início do bloco. */
export const MAX_POSICOES_SEM_MOLA_NO_INICIO = 2;

export interface InfoSequencia {
  id: string; posicao: string; acessorios: readonly string[];
  /** 076: false = sem mola; null/ausente = sem dado (não vai para a frente). */
  usaMola?: boolean | null;
  /** Posições que o item ocupa (Reformer unilateral na resposta = 2). Padrão 1. */
  posicoes?: number;
  /** Rodada 11: Reformer com alça de mão/pé (vai para o 2º grupo). Padrão false. */
  comAlca?: boolean;
}

type Unidade<T> = { itens: T[]; pos: number; chave: string; semMola: boolean; posicoes: number; comAlca: boolean };

/** Grupos por chave de acessório, na ordem de aparição. */
function gruposPorAcessorio<T>(us: readonly Unidade<T>[]): Unidade<T>[][] {
  const grupos = new Map<string, Unidade<T>[]>();
  for (const u of us) grupos.set(u.chave, [...(grupos.get(u.chave) ?? []), u]);
  return [...grupos.values()];
}

/** Regra 4: sem mola (na ordem dada) para o início até MAX posições; o que não cabe fica. */
function semMolaNaFrente<T>(us: readonly Unidade<T>[]): Unidade<T>[] {
  const frente: Unidade<T>[] = [];
  let livres = MAX_POSICOES_SEM_MOLA_NO_INICIO;
  for (const u of us) if (u.semMola && u.posicoes <= livres) { frente.push(u); livres -= u.posicoes; }
  return [...frente, ...us.filter((u) => !frente.includes(u))];
}

export function ordenarSequenciaBloco<T>(itens: readonly T[], info: (x: T) => InfoSequencia, nivelBase: number | null): T[] {
  // unidades: itens seguidos com o mesmo id
  const unidades: Unidade<T>[] = [];
  let idUlt: string | null = null;
  for (const x of itens) {
    const i = info(x);
    if (i.id === idUlt) { const u = unidades[unidades.length - 1]; u.itens.push(x); u.posicoes += i.posicoes ?? 1; continue; }
    unidades.push({ itens: [x], pos: ordemDaPosicao(i.posicao), chave: chaveAcessorios(i.acessorios), semMola: i.usaMola === false, posicoes: i.posicoes ?? 1, comAlca: i.comAlca === true });
    idUlt = i.id;
  }
  // regra 4: sem alça, depois com alça; 2/3 dentro de cada grupo
  const ordenadas = [false, true].flatMap((alca) => ordenarUnidades(unidades.filter((u) => u.comAlca === alca), nivelBase));
  return semMolaNaFrente(ordenadas).flatMap((u) => u.itens);
}

/** Regras 2 e 3 (posição/acessório), sobre as unidades. */
function ordenarUnidades<T>(unidades: Unidade<T>[], nivelBase: number | null): Unidade<T>[] {
  if (nivelBase !== null && nivelBase > NIVEL_MAX_ORDENA_POSICAO) return gruposPorAcessorio(unidades).flat();

  // posição primeiro; dentro de cada posição, grupos por acessório
  const posicoes = [...new Set(unidades.map((u) => u.pos))].sort((a, b) => a - b)
    .map((p) => gruposPorAcessorio(unidades.filter((u) => u.pos === p)));
  const saida: Unidade<T>[][] = [];
  let chaveAnterior: string | null = null;
  posicoes.forEach((grupos, k) => {
    const gs = [...grupos];
    // 1º: o acessório com que a posição anterior terminou
    const iPrim = gs.findIndex((g) => g[0].chave === chaveAnterior);
    if (iPrim > 0) gs.unshift(...gs.splice(iPrim, 1));
    // último: um acessório que também existe na próxima posição (o que vem antes lá)
    const proxima = posicoes[k + 1]?.map((g) => g[0].chave) ?? [];
    let iUlt = -1;
    for (let j = iPrim >= 0 ? 1 : 0; j < gs.length; j++) {
      const r = proxima.indexOf(gs[j][0].chave);
      if (r >= 0 && (iUlt < 0 || r < proxima.indexOf(gs[iUlt][0].chave))) iUlt = j;
    }
    if (iUlt >= 0) gs.push(...gs.splice(iUlt, 1));
    saida.push(...gs);
    chaveAnterior = gs[gs.length - 1][0].chave;
  });
  return saida.flat();
}

/** Ordena os exercícios de cada bloco da resposta (só famílias mqpilates). */
export function ordenarRespostaV2(r: RespostaV2, e: Esqueleto, c: ResultadoCandidatos): RespostaV2 {
  if (!ehFamiliaMqpilates(e.familia)) return r;
  return {
    ...r,
    blocos: r.blocos.map((b, i) => {
      const porRef = new Map<string, Candidato>(c.blocos[i].candidatos.map((k) => [k.ref, k]));
      const info = (x: { ref: string }): InfoSequencia => {
        const k = porRef.get(x.ref);
        return {
          id: k?.exerciseId ?? x.ref, posicao: k?.posicao ?? "", acessorios: k?.acessorios ?? [], usaMola: k?.usaMola ?? null,
          // na resposta o unilateral do Reformer vem UMA vez (o rascunho duplica): ocupa 2
          posicoes: e.familia === "reformer" && k?.unilateral ? 2 : 1,
          comAlca: !!k && temAlcaReformer(k),
        };
      };
      return { ...b, exercicios: ordenarSequenciaBloco(b.exercicios, info, e.nivelBase) };
    }),
  };
}

/** 076: aviso por bloco sem nenhum exercício sem mola (só famílias mqpilates; só o
 *  Cadillac tem usaMola — nos outros aparelhos e sem a coluna é null e não há aviso). */
export function avisosSemMola(r: RespostaV2, e: Esqueleto, c: ResultadoCandidatos): string[] {
  if (!ehFamiliaMqpilates(e.familia)) return [];
  return r.blocos.flatMap((b, i) => {
    const porRef = new Map<string, Candidato>(c.blocos[i].candidatos.map((k) => [k.ref, k]));
    const molas = b.exercicios.map((x) => porRef.get(x.ref)?.usaMola ?? null);
    return molas.some((m) => m !== null) && !molas.includes(false) ? [avisoComecaComMola(i)] : [];
  });
}
export const avisoComecaComMola = (i: number) => `bloco ${i + 1} começa com mola`;
const RE_AVISO_MOLA = /^bloco \d+ começa com mola$/;

/** Rodada 11: aviso por bloco cujos exercícios do Reformer são TODOS com alça (não recusa). */
export function avisosSoAlca(r: RespostaV2, e: Esqueleto, c: ResultadoCandidatos): string[] {
  if (!ehFamiliaMqpilates(e.familia)) return [];
  return r.blocos.flatMap((b, i) => {
    const porRef = new Map<string, Candidato>(c.blocos[i].candidatos.map((k) => [k.ref, k]));
    const doReformer = b.exercicios.map((x) => porRef.get(x.ref)).filter((k): k is Candidato => k?.material === APARELHO_REGRA_ALCA);
    return doReformer.length > 0 && doReformer.every(temAlcaReformer) ? [avisoSoAlca(i)] : [];
  });
}
export const avisoSoAlca = (i: number) => `bloco ${i + 1} do Reformer só tem exercícios com alça`;
const RE_AVISO_ALCA = /^bloco \d+ do Reformer só tem exercícios com alça$/;

/** Avisos de sequência (mola e alça) — o painel descarta os da geração e recalcula. */
export const ehAvisoDeSequencia = (a: string) => RE_AVISO_MOLA.test(a) || RE_AVISO_ALCA.test(a);
export const avisosDeSequencia = (r: RespostaV2, e: Esqueleto, c: ResultadoCandidatos) => [...avisosSemMola(r, e, c), ...avisosSoAlca(r, e, c)];
