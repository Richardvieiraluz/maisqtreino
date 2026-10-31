// DADOS DE EXEMPLO do Master (protótipo). Todos fictícios: viram consultas ao
// banco do app e aos dados de venda da Eduzz.

export type EstadoAluno = "assinante" | "programa" | "pausada";

export interface AlunoMaster {
  id: string;
  nome: string;
  email: string;
  produto: string;
  ultimoTreino: string;
  estado: EstadoAluno;
}

export const ALUNOS: AlunoMaster[] = [
  { id: "marina-costa", nome: "Marina Costa", email: "marina.costa@email.com", produto: "Assinatura anual", ultimoTreino: "hoje", estado: "assinante" },
  { id: "paulo-souza", nome: "Paulo Henrique Souza", email: "paulo.hsouza@email.com", produto: "Programa Glúteo", ultimoTreino: "ontem", estado: "programa" },
  { id: "juliana-ramos", nome: "Juliana Ramos", email: "ju.ramos@email.com", produto: "Assinatura mensal", ultimoTreino: "há 3 dias", estado: "assinante" },
  { id: "carlos-lima", nome: "Carlos Eduardo Lima", email: "cadu.lima@email.com", produto: "Assinatura mensal", ultimoTreino: "há 19 dias", estado: "pausada" },
  { id: "fernanda-alves", nome: "Fernanda Alves", email: "fe.alves@email.com", produto: "Programa Lombar", ultimoTreino: "há 6 dias", estado: "programa" },
  { id: "ricardo-nogueira", nome: "Ricardo Nogueira", email: "ricardo.nog@email.com", produto: "Assinatura anual", ultimoTreino: "há 12 dias", estado: "assinante" },
  { id: "beatriz-moura", nome: "Beatriz Moura", email: "bia.moura@email.com", produto: "Desafio de 21 dias", ultimoTreino: "hoje", estado: "programa" },
  { id: "tatiane-freitas", nome: "Tatiane Freitas", email: "tati.freitas@email.com", produto: "Assinatura mensal", ultimoTreino: "há 34 dias", estado: "pausada" },
];

export const diasDesde = (t: string) => (t === "hoje" ? 0 : t === "ontem" ? 1 : parseInt(t.replace(/\D/g, ""), 10) || 0);
export const iniciais = (n: string) => {
  const p = n.split(" ");
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

export const PAINEL = {
  ativos: 1284,
  novosNoMes: 96,
  mensal: 412,
  anual: 238,
  faturamento: [
    ["Assinatura mensal", "412 ativas", 41],
    ["Assinatura anual", "31 vendas no mês", 27],
    ["Programa Glúteo", "58 vendas", 17],
    ["Desafio de 21 dias", "33 vendas", 9],
    ["Programa Lombar", "19 vendas", 6],
  ] as [string, string, number][],
  conversao: { pct: 18, compraram: 540, comCupom: 97, assinaramComCupom: 71 },
  pararam: 87,
};

/** Funil por período: [fizeram o quiz, treinaram na semana liberada, assinaram]. */
export const FUNIL: Record<"7 DIAS" | "30 DIAS" | "90 DIAS", [number, number, number]> = {
  "7 DIAS": [312, 198, 41],
  "30 DIAS": [1180, 742, 156],
  "90 DIAS": [2964, 1803, 371],
};

export const PARADOS: { dias: number; nome: string; produto: string; status: string; quando: string }[] = [
  { dias: 6, nome: "Fernanda Alves", produto: "Programa Lombar", status: "ENVIADA", quando: "WhatsApp · há 1 dia" },
  { dias: 12, nome: "Ricardo Nogueira", produto: "Assinatura anual", status: "LIDA", quando: "E-mail · há 2 dias" },
  { dias: 8, nome: "Lucas Prado", produto: "Programa Glúteo", status: "ENVIADA", quando: "E-mail · hoje" },
  { dias: 19, nome: "Carlos Eduardo Lima", produto: "Assinatura mensal", status: "VOLTOU", quando: "Vídeo · treinou ontem" },
  { dias: 23, nome: "Aline Batista", produto: "Assinatura mensal", status: "LIDA", quando: "Vídeo · há 8 dias" },
  { dias: 34, nome: "Tatiane Freitas", produto: "Assinatura mensal", status: "SEM RESPOSTA", quando: "Vídeo · há 19 dias" },
  { dias: 5, nome: "Rafael Dias", produto: "Desafio de 21 dias", status: "AGENDADA", quando: "WhatsApp · amanhã" },
];

/** Avaliações por protocolo em %: [fácil, ideal, difícil]. */
export const AVALIACOES: [string, number, number, number][] = [
  ["Protocolo iniciante · casa", 22, 71, 7],
  ["Protocolo intermediário · casa", 14, 70, 16],
  ["Protocolo intermediário · academia", 9, 64, 27],
  ["Protocolo avançado · academia", 6, 72, 22],
  ["Programa Glúteo", 11, 75, 14],
];

export const MAIS_TROCADOS: [string, string, number][] = [
  ["Afundo alternado", "Subida no banco baixo", 214],
  ["Agachamento búlgaro", "Afundo estático", 167],
  ["Flexão de braço", "Flexão inclinada", 141],
  ["Stiff com halteres", "Ponte com os pés no banco", 96],
];

export const AUDITORIA = [
  {
    para: "GERADO PARA PAULO H. · CASA · INTERMEDIÁRIO",
    titulo: "Glúteo e posterior",
    exercicios: [["Agachamento goblet", "4 × 12"], ["Stiff com halteres", "3 × 12"], ["Elevação pélvica com halter", "4 × 10"], ["Afundo alternado", "3 × 10"], ["Prancha frontal", "3 × 40 s"]],
  },
  {
    para: "GERADO PARA JULIANA R. · ACADEMIA · INICIANTE",
    titulo: "Costas e ombros",
    exercicios: [["Puxada na frente", "3 × 12"], ["Remada baixa", "3 × 12"], ["Desenvolvimento máquina", "3 × 12"], ["Elevação lateral", "3 × 12"], ["Prancha lateral", "3 × 20 s"]],
  },
];

export const EXPLICACOES: { nome: string; posicao: string; movimento: string; cuidado: string }[] = [
  { nome: "Agachamento goblet", posicao: "Pés na largura dos ombros, halter junto ao peito.", movimento: "Desça empurrando o quadril para trás até a coxa ficar paralela.", cuidado: "Joelho acompanha a ponta do pé." },
  { nome: "Remada unilateral com halter", posicao: "Joelho e mão no banco, coluna reta.", movimento: "Puxe o halter em direção ao quadril.", cuidado: "Não gire o tronco para subir." },
  { nome: "Ponte unilateral", posicao: "Deitado, um pé no chão e a outra perna estendida.", movimento: "Suba o quadril até alinhar ombro e joelho.", cuidado: "Quadril nivelado dos dois lados." },
  { nome: "Elevação lateral", posicao: "Em pé, halteres ao lado do corpo.", movimento: "Suba os braços até a altura dos ombros.", cuidado: "Cotovelo levemente dobrado." },
];
/** Totais de exemplo além dos 4 exercícios mostrados. */
export const EXPLICACOES_OUTRAS = { pendente: 38, aprovado: 21, audio: 127 };

export const FILEIRAS_VITRINE: [string, string][] = [
  ["Continue de onde parou", "Automática"],
  ["Programas", "3 coleções"],
  ["Treino em casa", "14 treinos"],
  ["Treino na academia", "22 treinos"],
  ["Por material", "7 blocos"],
  ["Por modalidade", "8 blocos"],
  ["Rápidos", "10, 15 e 20 min"],
];
