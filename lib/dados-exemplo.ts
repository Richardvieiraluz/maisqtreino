// DADOS DE EXEMPLO, iguais aos do protótipo do Claude Design.
// Servem só para montar e testar as telas. Os dados reais virão do banco
// (catálogo de exercícios importado do +Q Pilates, protocolo do aluno e
// histórico de cargas).

import type { FileiraCards, TreinoSessao } from "./tipos";

export const ALUNO_EXEMPLO = {
  iniciais: "MC",
  sequenciaDias: 12,
  proximoTreinoHora: "07:00",
};

export const TREINO_HOJE: TreinoSessao = {
  id: "gluteo-posterior-07",
  nome: "Glúteo e posterior",
  palavraDestaque: "posterior",
  duracaoMin: 42,
  local: "Academia",
  nivel: "Intermediário",
  posicaoProtocolo: 7,
  totalProtocolo: 24,
  exercicios: [
    {
      id: "agachamento-goblet",
      nome: "Agachamento goblet",
      grupo: "Quadríceps e glúteo",
      modo: "reps",
      reps: [12, 10, 10, 8],
      cargaAnterior: 16,
      melhorCarga: 18,
      video: "agachamento-com-halteres",
      ajuste: "Desça com o peito aberto. O joelho acompanha a ponta do pé.",
      alternativas: ["Agachamento no banco", "Agachamento sem carga", "Leg press 45°"],
    },
    {
      id: "stiff-halteres",
      nome: "Stiff com halteres",
      grupo: "Posterior de coxa",
      modo: "reps",
      reps: [12, 10, 10],
      cargaAnterior: 20,
      melhorCarga: 22,
      cargaDupla: true,
      video: "stiff-com-halteres",
      ajuste: "O movimento é no quadril. Leve o quadril para trás, não a coluna para baixo.",
      alternativas: ["Stiff com elástico", "Ponte com os pés no banco", "Flexora sentada"],
    },
    {
      id: "elevacao-pelvica",
      nome: "Elevação pélvica com halter",
      grupo: "Glúteo",
      modo: "reps",
      reps: [12, 10, 8, 8],
      cargaAnterior: 24,
      melhorCarga: 24,
      video: "elevacao-pelvica-com-barra",
      ajuste: "Suba até alinhar ombro, quadril e joelho. Segure um segundo lá em cima.",
      alternativas: ["Elevação pélvica no chão", "Ponte unilateral sem carga", "Glúteo na polia"],
    },
    {
      id: "afundo-alternado",
      nome: "Afundo alternado",
      grupo: "Glúteo e quadríceps",
      modo: "reps",
      reps: [10, 10, 10],
      cargaAnterior: 8,
      melhorCarga: 10,
      video: "afundo-alternado-com-halteres",
      ajuste: "Passo longo. O joelho de trás desce reto em direção ao chão.",
      alternativas: ["Afundo estático com apoio", "Subida no banco baixo"],
    },
    {
      id: "abducao-mini-band",
      nome: "Abdução com mini band",
      grupo: "Glúteo médio",
      modo: "reps",
      reps: [15, 15, 15],
      cargaAnterior: null,
      equipamento: "Mini band média",
      video: "abducao-mini-band-em-pe",
      ajuste: "Quadril parado. Quem abre é a perna, não o tronco.",
      alternativas: ["Abdução deitada de lado", "Abdução sem elástico"],
    },
    {
      id: "prancha-frontal",
      nome: "Prancha frontal",
      grupo: "Abdômen",
      modo: "tempo",
      series: 3,
      segundos: 40,
      cargaAnterior: null,
      ajuste: "Empurre o chão com os antebraços. Quadril na linha dos ombros.",
      alternativas: ["Prancha com joelhos no chão", "Prancha inclinada no banco"],
    },
  ],
};

export const FILEIRAS_CARDS: FileiraCards[] = [
  {
    titulo: "Continue de onde parou",
    itens: [
      { id: "pernas-gluteo-04", nome: "Pernas e glúteo · Treino 04", duracao: "35 min", nivel: "Intermediário", doPrograma: true, progresso: 33 },
      { id: "desafio-21-08", nome: "Desafio de 21 dias · Dia 08", duracao: "25 min", nivel: "Intermediário", progresso: 38 },
    ],
  },
  {
    titulo: "Programas",
    itens: [
      { id: "programa-gluteo", nome: "Glúteo", duracao: "12 treinos", nivel: "Todos", doPrograma: true },
      { id: "programa-lombar", nome: "Lombar", duracao: "10 treinos", nivel: "Iniciante" },
      { id: "programa-desafio-21", nome: "Desafio de 21 dias", duracao: "21 treinos", nivel: "Intermediário" },
    ],
  },
  {
    titulo: "Treino em casa",
    itens: [
      { id: "casa-corpo-todo-halter", nome: "Corpo todo com halter", duracao: "30 min", nivel: "Iniciante" },
      { id: "casa-pernas-elastico", nome: "Pernas com elástico", duracao: "25 min", nivel: "Intermediário", feito: true },
      { id: "casa-core-mobilidade", nome: "Core e mobilidade", duracao: "20 min", nivel: "Iniciante" },
    ],
  },
  {
    titulo: "Treino na academia",
    itens: [
      { id: "academia-costas-biceps", nome: "Costas e bíceps", duracao: "45 min", nivel: "Intermediário" },
      { id: "academia-gluteo-polia", nome: "Glúteo na polia", duracao: "40 min", nivel: "Intermediário", doPrograma: true },
      { id: "academia-quadriceps", nome: "Quadríceps", duracao: "50 min", nivel: "Avançado" },
    ],
  },
];

export const FILEIRAS_TILES = [
  { titulo: "Por material", itens: ["Mini band", "Elástico", "Halter", "Kettlebell", "TRX", "Bola suíça", "Peso do corpo"] },
  { titulo: "Por modalidade", itens: ["Musculação", "Funcional", "Pilates de solo", "Pilates em aparelho", "Calistenia", "HIIT", "Alongamento", "Mobilidade"] },
  { titulo: "Por região", itens: ["Glúteo", "Pernas", "Abdômen", "Costas", "Peito", "Ombros", "Braços", "Lombar"] },
];

export const RAPIDOS_MIN = [10, 15, 20];
