// Botão "Explicação" do treino: três frases curtas por exercício (posição inicial, movimento e
// cuidado). A IA escreve a partir do cadastro do exercício; o Richard revisa e aprova no Master.
// PURO na montagem do pedido e na leitura da resposta (o envio fica em lib/dados).

export interface ExercicioParaExplicar {
  id: string;
  nome: string;
  modalidade: string | null;
  material: string | null;
  equipamentos: string[] | null;
  posicao: string | null;
  musculos: string[] | null;
  padroes: string[] | null;
  unilateral: boolean | null;
}

export interface TextoExplicacao {
  id: string;
  posicaoInicial: string;
  movimento: string;
  cuidado: string;
}

export const SISTEMA_EXPLICACOES = `Você é Richard Vieira, profissional de educação física, escrevendo a explicação falada de exercícios para um app de treino de pessoas comuns.
Para cada exercício, escreva em português do Brasil, segunda pessoa (você), frases curtas e concretas:
- posicaoInicial: como se posicionar antes de começar (1 frase, até 120 caracteres).
- movimento: o que fazer na execução (1 ou 2 frases, até 160 caracteres).
- cuidado: o principal ponto de atenção para fazer com segurança (1 frase, até 120 caracteres).
Regras: sem travessão, sem emoji, sem motivacional, sem promessa de resultado, sem jargão técnico. Use só o que o nome e o cadastro permitem afirmar; se algo não estiver claro, escreva de forma geral e correta em vez de inventar detalhe.
Devolva um item por exercício, com o mesmo id recebido.`;

export const SCHEMA_EXPLICACOES = {
  type: "object",
  additionalProperties: false,
  required: ["itens"],
  properties: {
    itens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "posicaoInicial", "movimento", "cuidado"],
        properties: { id: { type: "string" }, posicaoInicial: { type: "string" }, movimento: { type: "string" }, cuidado: { type: "string" } },
      },
    },
  },
} as const;

export function pedidoExplicacoes(lista: readonly ExercicioParaExplicar[]): string {
  return lista
    .map((e) =>
      JSON.stringify({
        id: e.id,
        nome: e.nome,
        modalidade: e.modalidade,
        material: e.material,
        equipamentos: e.equipamentos,
        posicao: e.posicao,
        musculos: e.musculos,
        padroes: e.padroes,
        unilateral: e.unilateral,
      }),
    )
    .join("\n");
}

const limpar = (t: unknown, max: number) =>
  typeof t === "string" ? t.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Só itens com id pedido e os três campos preenchidos. */
export function lerExplicacoes(texto: string, ids: ReadonlySet<string>): TextoExplicacao[] {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return [];
  }
  const itens = (bruto as { itens?: unknown[] })?.itens;
  if (!Array.isArray(itens)) return [];
  const vistos = new Set<string>();
  return itens.flatMap((x) => {
    const b = (x ?? {}) as Record<string, unknown>;
    const id = typeof b.id === "string" ? b.id : "";
    const t = { id, posicaoInicial: limpar(b.posicaoInicial, 200), movimento: limpar(b.movimento, 260), cuidado: limpar(b.cuidado, 200) };
    if (!ids.has(id) || vistos.has(id) || !t.posicaoInicial || !t.movimento || !t.cuidado) return [];
    vistos.add(id);
    return [t];
  });
}
