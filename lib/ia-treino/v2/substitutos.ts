// IA de treino v2 — TROCAR exercício no rascunho (Richard, 25/10/2026). PURO.
//
// No editor, só para o rascunho que veio da v2: cada exercício ganha um botão
// "Trocar" com até MAX_SUBSTITUTOS substitutos que respeitam as regras do bloco,
// SEM nova chamada à IA. A troca entra no registro de correções pela comparação
// que já existe (compararRascunho → removidos/incluídos/trocados).
//
// Regras duras (quem não cumpre não aparece):
//   - mesma pasta do bloco (naPastaDoBloco: no Pilates é o mesmo aparelho; na ativação
//     os materiais permitidos) e nível permitido — os dois vêm da MESMA função dos
//     candidatos (candidatosPorBloco com todos: true, sem teto nem amostra), então a marca de nível é a
//     mesma que a IA viu: base/livre sempre; nivelAbaixo só com exceção de estoque (já
//     é assim na lista); soAquecimento só nas primeiras posições do bloco; nivelSeguinte
//     e maquinaAbaixo só se o exercício trocado tinha a mesma marca (cota/limite);
//   - não arquivado nem pendente (disponivel, dentro de naPastaDoBloco);
//   - não já no treino (id) nem com o mesmo nome de outro do treino (chaveNomeRepetido);
//   - Reformer: unilateral por unilateral (a dupla ocupa 2 posições);
//   - Condicionamento, bloco principal: se o trocado é a ÚNICA máquina do bloco, só
//     máquina entra no lugar.
// Prioridade (pontos; empate pelo nome): mesmos músculos e padrões; no Pilates mesma
// posição, acessório e usa mola; mesmo material; mesmo lado (unilateral) fora do
// Reformer; mesma fase (reabilitação); inédito (não usado nos 6 anteriores).

import type { Esqueleto } from "./esqueleto";
import { candidatosPorBloco, type Candidato, type Historico } from "./candidatos";
import { ehFamiliaMqpilates, ehMaquina, ladoPelosMusculos, type ItemCatalogo } from "./pastas";
import { chaveNomeRepetido } from "./validar";

export const MAX_SUBSTITUTOS = 5;

export interface PedidoSubstitutos {
  /** Índice do bloco no esqueleto (0-based). */
  bloco: number;
  /** Exercício que vai sair. */
  exerciseId: string;
  /** Posição da linha dentro do bloco (0-based; conta linhas, como o rascunho). */
  slot: number;
  /** Todos os exercícios do treino atual (ids; com repetição é indiferente). */
  emTreino: readonly string[];
  /** Os exercícios do bloco atual (ids), para a regra da única máquina. */
  noBloco: readonly string[];
}

export interface Substituto {
  exerciseId: string;
  nome: string;
  videoUrl: string;
  unilateral: boolean;
  /** Por que entrou na frente ("mesmos músculos", "mesma posição", "inédito"…). */
  motivos: string[];
  pontos: number;
}

export type ResultadoSubstitutos =
  | { ok: true; substitutos: Substituto[]; original: { nome: string; unilateral: boolean } | null; elegiveis: number }
  | { ok: false; motivo: string };

const jaccard = (a: readonly string[], b: readonly string[]) => {
  if (!a.length && !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
};

/** Pontuação de semelhança do candidato com o exercício que sai. */
export function pontuarSubstituto(c: Candidato, orig: Candidato | ItemCatalogo | null, e: Esqueleto): { pontos: number; motivos: string[] } {
  const motivos: string[] = [];
  let pontos = 0;
  if (!c.recente) { pontos += 1.5; motivos.push("inédito"); }
  if (!orig) return { pontos, motivos };
  const jm = jaccard(c.musculos, orig.musculos);
  if (jm > 0) { pontos += 3 * jm; motivos.push(jm === 1 ? "mesmos músculos" : "músculos em comum"); }
  const jp = jaccard(c.padroes, orig.padroes);
  if (jp > 0) { pontos += 2 * jp; motivos.push(jp === 1 ? "mesmo padrão" : "padrão em comum"); }
  if (c.material === orig.material) { pontos += 1; if (!ehFamiliaMqpilates(e.familia)) motivos.push(`mesmo material (${c.material})`); }
  if (ehFamiliaMqpilates(e.familia)) {
    if (c.posicao && c.posicao === orig.posicao) { pontos += 1.5; motivos.push(`mesma posição (${c.posicao})`); }
    const ja = jaccard(c.acessorios, orig.acessorios);
    if (ja > 0) { pontos += 1 * ja; motivos.push("mesmo acessório"); }
    else if (!c.acessorios.length && !orig.acessorios.length) { pontos += 0.5; motivos.push("sem acessório"); }
    if (c.usaMola !== null && c.usaMola === orig.usaMola) { pontos += 0.5; motivos.push(c.usaMola ? "usa mola" : "sem mola"); }
  }
  if (e.familia !== "reformer" && (c.unilateral === true) === (orig.unilateral === true)) { pontos += 1; if (c.unilateral === true) motivos.push("unilateral"); }
  if (c.fase && c.fase === orig.fase) { pontos += 1; motivos.push(`mesma fase (${c.fase})`); }
  if (jm === 0 && ladoPelosMusculos(c.musculos) === ladoPelosMusculos(orig.musculos)) pontos += 0.5;
  return { pontos, motivos };
}

export function substitutosPara(e: Esqueleto, catalogo: readonly ItemCatalogo[], historico: Historico, p: PedidoSubstitutos): ResultadoSubstitutos {
  const be = e.blocos[p.bloco];
  if (!be) return { ok: false, motivo: `bloco ${p.bloco + 1} não existe neste treino` };
  // Sem teto nem amostra: a lista inteira de elegíveis com as marcas de nível que a IA viu.
  const c = candidatosPorBloco(e, catalogo, historico, { seed: 1, todos: true });
  const cb = c.blocos[p.bloco];
  const lista = cb?.candidatos ?? [];
  const origCand = lista.find((x) => x.exerciseId === p.exerciseId) ?? null;
  const origItem = origCand ?? catalogo.find((x) => x.id === p.exerciseId) ?? null;
  const porId = new Map(catalogo.map((x) => [x.id, x]));

  const outros = p.emTreino.filter((id) => id !== p.exerciseId);
  const idsFora = new Set(outros);
  const nomesFora = new Set(outros.map((id) => porId.get(id)).filter((x): x is ItemCatalogo => !!x).map((x) => chaveNomeRepetido(e.familia, x)));

  // Condicionamento: o trocado é a única máquina do bloco → só máquina entra.
  const soMaquina = !!cb?.cotaMaquina && !!origItem && ehMaquina(origItem)
    && !p.noBloco.some((id) => id !== p.exerciseId && ehMaquina(porId.get(id) ?? { modality: "", material: "" }));
  const origUni = origItem?.unilateral === true;

  const elegiveis = lista.filter((x) => {
    if (x.exerciseId === p.exerciseId || idsFora.has(x.exerciseId)) return false;
    if (nomesFora.has(chaveNomeRepetido(e.familia, x))) return false;
    if (x.soAquecimento && p.slot >= be.aquecimentoPermiteNivelAbaixo) return false;
    if (x.nivelSeguinte && !origCand?.nivelSeguinte) return false;
    if (x.maquinaAbaixo && !origCand?.maquinaAbaixo) return false;
    if (e.familia === "reformer" && (x.unilateral === true) !== origUni) return false;
    if (soMaquina && !ehMaquina(x)) return false;
    return true;
  });

  const pontuados = elegiveis.map((x) => ({ x, ...pontuarSubstituto(x, origItem, e) }));
  pontuados.sort((a, b) => b.pontos - a.pontos || a.x.nome.localeCompare(b.x.nome, "pt-BR"));
  return {
    ok: true,
    elegiveis: elegiveis.length,
    original: origItem ? { nome: origItem.nome, unilateral: origUni } : null,
    substitutos: pontuados.slice(0, MAX_SUBSTITUTOS).map(({ x, pontos, motivos }) => ({
      exerciseId: x.exerciseId, nome: x.nome, videoUrl: x.videoUrl, unilateral: x.unilateral === true, motivos, pontos: Math.round(pontos * 100) / 100,
    })),
  };
}
