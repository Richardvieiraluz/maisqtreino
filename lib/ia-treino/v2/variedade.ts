import { FAMILIAS_COM_NIVEL, type Familia } from "../familia";
import type { Esqueleto } from "./esqueleto";
import { ladoPelosMusculos, naPastaDoBloco, MUSCULOS_INFERIOR, MUSCULOS_SUPERIOR, type ItemCatalogo } from "./pastas";

// IA de treino v2 — VARIEDADE ao longo do protocolo (Richard, 25/10/2026). Preferência,
// NÃO regra: olha os últimos 12 treinos do protocolo, conta músculos e padrões e aponta
// os MENOS trabalhados. Nos candidatos vira prioridade suave dentro de cada estrato da
// amostra (não mexe na cota de inéditos, máquinas, aparelho cardio, mob_sm nem no A/B
// da Hipertrofia); no prompt vira UMA linha. Sem validação nova, sem erro, sem aviso.
// Só nas famílias com nível. Puro: sem banco, sem rng.

/** Treinos anteriores olhados para a variedade (os "recentes" da regra dos 2/3 seguem 6). */
export const JANELA_VARIEDADE = 12;
export const MAX_MUSCULOS_VARIEDADE = 5;
export const MAX_PADROES_VARIEDADE = 3;

/** Rodadas 5 e 6 (Richard: filtrar os "de nicho"; manguito rotador e escápula entraram na 6,
 *  flexores de quadril FICA). Estes músculos NUNCA entram na linha "Menos trabalhados…",
 *  não pontuam na prioridade da amostra e ficam FORA do universo (não entram na média).
 *  Padrões de movimento não têm filtro. Para mudar a lista, é só editar aqui (valores do
 *  vocabulário MUSCULOS de lib/exercicios/classificacao.ts). */
export const MUSCULOS_FORA_DA_VARIEDADE: readonly string[] = [
  "cervical/pescoço",
  "tornozelo/pé",
  "tibial anterior",
  "antebraço/punho",
  "manguito rotador",
  "escápula (estabilizadores)",
];

export interface MenosTrabalhados {
  /** Até 5 músculos abaixo da média de uso, do menos usado ao mais, desempate alfabético. */
  musculos: string[];
  /** Até 3 padrões, idem. */
  padroes: string[];
  /** Quantos treinos entraram na conta (≤ 12). */
  treinos: number;
}

/** Histórico que a variedade precisa: ids dos exercícios dos últimos 12 treinos (cada
 *  exercício conta UMA vez por treino; repete entre treinos). Ausente/vazio = nada muda. */
export interface HistoricoVariedade { usoUltimos12?: readonly string[]; totalAnteriores: number }

export function contarTrabalhados(usos: readonly string[], porId: ReadonlyMap<string, ItemCatalogo>): { musculos: Map<string, number>; padroes: Map<string, number> } {
  const musculos = new Map<string, number>(), padroes = new Map<string, number>();
  for (const id of usos) {
    const x = porId.get(id);
    if (!x) continue;
    for (const m of x.musculos) musculos.set(m, (musculos.get(m) ?? 0) + 1);
    for (const p of x.padroes) padroes.set(p, (padroes.get(p) ?? 0) + 1);
  }
  return { musculos, padroes };
}

/** Os abaixo da média do universo, do menos usado ao mais (desempate alfabético), até `max`.
 *  Universo uniforme (tudo igual, inclusive tudo zero) → nada. */
function abaixoDaMedia(universo: ReadonlySet<string>, contagem: ReadonlyMap<string, number>, max: number): string[] {
  if (!universo.size) return [];
  const itens = [...universo].map((k) => ({ k, n: contagem.get(k) ?? 0 }));
  const media = itens.reduce((s, i) => s + i.n, 0) / itens.length;
  return itens.filter((i) => i.n < media).sort((a, b) => a.n - b.n || a.k.localeCompare(b.k, "pt-BR")).slice(0, max).map((i) => i.k);
}

/** Músculos e padrões menos trabalhados nos últimos 12 treinos deste protocolo, ou null
 *  quando não há o que preferir (família sem nível, histórico vazio, uso uniforme).
 *  Universo = músculos/padrões dos exercícios das pastas dos blocos do esqueleto; na
 *  Hipertrofia, só o lado deste treino (exercícios do lado ou "ambos"; músculos da lista do lado). */
export function menosTrabalhados(e: Esqueleto, catalogo: readonly ItemCatalogo[], historico: HistoricoVariedade): MenosTrabalhados | null {
  if (!FAMILIAS_COM_NIVEL.includes(e.familia as Familia) || e.nivelBase === null) return null;
  const usos = historico.usoUltimos12 ?? [];
  if (!usos.length) return null;
  const porId = new Map(catalogo.map((x) => [x.id, x]));
  const lado = e.familia === "hipertrofia" ? e.ladoHipertrofia : null;
  const doLado = (x: ItemCatalogo) => { if (!lado) return true; const l = ladoPelosMusculos(x.musculos); return l === lado || l === "ambos"; };
  const musculosDoLado: ReadonlySet<string> | null = lado ? new Set<string>(lado === "inferior" ? MUSCULOS_INFERIOR : MUSCULOS_SUPERIOR) : null;
  const universoM = new Set<string>(), universoP = new Set<string>();
  for (const x of catalogo) {
    if (!doLado(x) || !e.blocos.some((b) => naPastaDoBloco(x, e, b))) continue;
    for (const m of x.musculos) if ((!musculosDoLado || musculosDoLado.has(m)) && !MUSCULOS_FORA_DA_VARIEDADE.includes(m)) universoM.add(m);
    for (const p of x.padroes) universoP.add(p);
  }
  const contagem = contarTrabalhados(usos, porId);
  const musculos = abaixoDaMedia(universoM, contagem.musculos, MAX_MUSCULOS_VARIEDADE);
  const padroes = abaixoDaMedia(universoP, contagem.padroes, MAX_PADROES_VARIEDADE);
  if (!musculos.length && !padroes.length) return null;
  return { musculos, padroes, treinos: Math.min(JANELA_VARIEDADE, Math.max(0, historico.totalAnteriores)) };
}

/** Prioridade suave de um exercício na amostra: quantos dos seus músculos/padrões estão
 *  entre os menos trabalhados (0 = nenhum). Só reordena DENTRO do estrato; as cotas ficam.
 *  Os MUSCULOS_FORA_DA_VARIEDADE nunca estão em `menos.musculos`, logo nunca pontuam. */
export function pontuacaoVariedade(x: Pick<ItemCatalogo, "musculos" | "padroes">, menos: MenosTrabalhados): number {
  return x.musculos.filter((m) => menos.musculos.includes(m)).length + x.padroes.filter((p) => menos.padroes.includes(p)).length;
}

/** A linha do prompt (uma só). */
export function linhaVariedadeV2(menos: MenosTrabalhados): string {
  const partes = [menos.musculos.join(", "), menos.padroes.join(", ")].filter(Boolean);
  return `Menos trabalhados nos últimos ${menos.treinos} treinos: ${partes.join(" · ")}. Prefira incluí-los quando couber.`;
}
