// Peças pequenas que o motor (copiado do +Q Pilates, lib/ai-treino/v2) usa de outros módulos de lá.
// Copiadas iguais para o motor continuar idêntico ao original.

/** Texto vindo de fora: remove não-imprimíveis e apara as pontas. (+Q Pilates: lib/sanitize.ts) */
export function sanitize(s: string): string {
  return s.replace(/[^ -ÿ]/g, "").trim();
}

/** Indicações do exercício (+Q Pilates: lib/exercicios/classificacao.ts, migration 072). */
export const INDICACOES = [
  { valor: "gestante_3_6", rotulo: "Gestante 3º–6º mês" },
  { valor: "gestante_6_9", rotulo: "Gestante 6º–9º mês" },
  { valor: "cervical", rotulo: "Cervical" },
  { valor: "ombro", rotulo: "Ombro" },
  { valor: "dorsal", rotulo: "Dorsal" },
  { valor: "lombar", rotulo: "Lombar" },
  { valor: "quadril", rotulo: "Quadril" },
  { valor: "joelho", rotulo: "Joelho" },
  { valor: "tornozelo", rotulo: "Tornozelo" },
] as const;
export type Indicacao = (typeof INDICACOES)[number]["valor"];
export const VALORES_INDICACOES: readonly Indicacao[] = INDICACOES.map((i) => i.valor);

export function parseIndicacoes(valores: readonly string[]): { ok: true; valor: Indicacao[] } | { ok: false; erro: string } {
  const limpos = valores.map((v) => String(v ?? "").trim()).filter((v) => v !== "");
  const fora = limpos.filter((v) => !(VALORES_INDICACOES as readonly string[]).includes(v));
  if (fora.length) return { ok: false, erro: `Indicação fora da lista (${fora[0]}).` };
  const set = new Set(limpos);
  return { ok: true, valor: VALORES_INDICACOES.filter((v) => set.has(v)) };
}

export function normalizarTexto(s: string): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
