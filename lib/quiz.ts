// Quiz de entrada: 10 perguntas obrigatórias, uma por tela.
// Cada resposta alimenta a escolha do protocolo (nenhuma é decorativa).

import { useCallback, useSyncExternalStore } from "react";
import { useConta } from "./conta";

export type TipoPergunta = "lista" | "grade" | "equip" | "mapa" | "multi";

export interface Pergunta {
  chave: ChaveResposta;
  tipo: TipoPergunta;
  /** Título em 3 partes: antes, palavra em destaque, depois. */
  titulo: [string, string, string];
  sub: string;
  opcoes?: [string, string?][];
  unidade?: string;
  alturaGrade?: number;
}

export type ChaveResposta = "sexo" | "idade" | "objetivo" | "nivel" | "local" | "equip" | "dias" | "tempo" | "regioes" | "dores";

export const PERGUNTAS: Pergunta[] = [
  { chave: "sexo", tipo: "lista", titulo: ["Seu ", "sexo", ""], sub: "Ajusta os bonecos do mapa muscular e as cargas iniciais.", opcoes: [["Feminino"], ["Masculino"]] },
  { chave: "idade", tipo: "lista", titulo: ["Sua faixa ", "etária", ""], sub: "Define o volume de cada treino e o tempo de descanso.", opcoes: [["18 a 29"], ["30 a 39"], ["40 a 49"], ["50 a 59"], ["60 ou mais"]] },
  {
    chave: "objetivo",
    tipo: "lista",
    titulo: ["Seu ", "objetivo", ""],
    sub: "Muda a ordem e a intensidade dos exercícios.",
    opcoes: [
      ["Ganhar massa muscular", "Mais carga, menos repetições"],
      ["Perder gordura", "Treinos com mais ritmo"],
      ["Condicionamento", "Fôlego e força para o dia a dia"],
      ["Aliviar dores", "Mobilidade e fortalecimento"],
    ],
  },
  {
    chave: "nivel",
    tipo: "lista",
    titulo: ["Seu nível ", "hoje", ""],
    sub: "Sem pressa. Dá para subir de nível pelo app.",
    opcoes: [
      ["Iniciante", "Nunca treinei ou parei há mais de 6 meses"],
      ["Intermediário", "Treino há mais de 6 meses"],
      ["Avançado", "Treino há anos, sem parar"],
    ],
  },
  {
    chave: "local",
    tipo: "lista",
    titulo: ["Onde você ", "treina", ""],
    sub: "O protocolo usa só o que existe nesse lugar.",
    opcoes: [
      ["Em casa", "Com o que você tem aí"],
      ["Academia", "Aparelhos e pesos livres"],
      ["Condomínio", "Academia pequena do prédio"],
    ],
  },
  { chave: "equip", tipo: "equip", titulo: ["Seus ", "equipamentos", ""], sub: "Escolha um jeito de informar o que você tem." },
  { chave: "dias", tipo: "grade", titulo: ["Quantos ", "dias", " por semana"], sub: "Conte só os dias que você consegue mesmo.", opcoes: [["2"], ["3"], ["4"], ["5"], ["6"], ["7"]], unidade: "DIAS", alturaGrade: 96 },
  { chave: "tempo", tipo: "grade", titulo: ["Tempo por ", "treino", ""], sub: "Do aquecimento ao último exercício.", opcoes: [["20"], ["40"], ["60"]], unidade: "MINUTOS", alturaGrade: 120 },
  { chave: "regioes", tipo: "mapa", titulo: ["Onde quer ", "focar", ""], sub: "Toque nas regiões. Pode escolher mais de uma." },
  {
    chave: "dores",
    tipo: "multi",
    titulo: ["Alguma dor ou ", "limitação", "?"],
    sub: "O que força essa região sai do seu protocolo.",
    opcoes: [["Lombar"], ["Joelho"], ["Ombro"], ["Quadril"], ["Cervical"], ["Punho"], ["Nenhuma"]],
  },
];

export const REGIOES: Record<string, string> = {
  ombros: "Ombros",
  peito: "Peito",
  bracos: "Braços",
  abdomen: "Abdômen",
  quadriceps: "Quadríceps",
  costas: "Costas",
  lombar: "Lombar",
  gluteo: "Glúteo",
  posterior: "Posterior",
  panturrilha: "Panturrilha",
};

/** Áreas de toque sobre o boneco base (caixa 160 × 330): [região, x, y, largura, altura, rótulo]. */
export type Area = [string, number, number, number, number, string];
export const AREAS: Record<"feminino" | "masculino", { frente: Area[]; costas: Area[] }> = {
  feminino: {
    frente: [
      ["bracos", 28, 90, 28, 74, "Braço esquerdo"],
      ["bracos", 104, 90, 28, 74, "Braço direito"],
      ["quadriceps", 45, 149, 70, 84, "Quadríceps"],
      ["abdomen", 67, 91, 27, 72, "Abdômen"],
      ["ombros", 42, 65, 22, 31, "Ombro esquerdo"],
      ["ombros", 96, 65, 22, 31, "Ombro direito"],
      ["peito", 53, 66, 55, 35, "Peito"],
    ],
    costas: [
      ["costas", 56, 89, 49, 45, "Costas"],
      ["posterior", 48, 179, 64, 65, "Posterior"],
      ["panturrilha", 50, 246, 60, 68, "Panturrilha"],
      ["gluteo", 54, 135, 53, 49, "Glúteo"],
      ["lombar", 68, 115, 24, 46, "Lombar"],
    ],
  },
  masculino: {
    frente: [
      ["bracos", 26, 90, 29, 74, "Braço esquerdo"],
      ["bracos", 107, 90, 28, 74, "Braço direito"],
      ["quadriceps", 48, 149, 64, 84, "Quadríceps"],
      ["abdomen", 65, 91, 30, 72, "Abdômen"],
      ["ombros", 39, 65, 23, 31, "Ombro esquerdo"],
      ["ombros", 99, 65, 22, 31, "Ombro direito"],
      ["peito", 50, 66, 61, 35, "Peito"],
    ],
    costas: [
      ["costas", 54, 89, 53, 45, "Costas"],
      ["posterior", 51, 179, 58, 65, "Posterior"],
      ["panturrilha", 50, 246, 60, 68, "Panturrilha"],
      ["gluteo", 55, 135, 51, 49, "Glúteo"],
      ["lombar", 65, 115, 30, 46, "Lombar"],
    ],
  },
};

/** Itens da lista de equipamentos do quiz. Depois, mapeados ao vocabulário de 45 do catálogo. */
export const EQUIPAMENTOS = ["Halter", "Kettlebell", "Barra e anilhas", "Banco", "Elástico", "Mini band", "TRX", "Bola suíça", "Colchonete", "Caneleira", "Step", "Barra fixa"];

export interface RespostasQuiz {
  sexo?: string;
  idade?: string;
  objetivo?: string;
  nivel?: string;
  local?: string;
  /** Como informou os equipamentos: "Academia completa", "Lista" ou "Foto". */
  equip?: string;
  equipamentos?: string[];
  dias?: string;
  tempo?: string;
  regioes?: string[];
  dores?: string[];
}

// ── Armazenamento no aparelho (modo demonstração) ─────────────────────────────

const CHAVE = "maisqtreino:quiz";
const ouvintes = new Set<() => void>();
let cache: { bruto: string | null; valor: RespostasQuiz | null } = { bruto: null, valor: null };

function ler(): RespostasQuiz | null {
  if (typeof window === "undefined") return null;
  let bruto: string | null = null;
  try {
    bruto = window.localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
  if (bruto === cache.bruto) return cache.valor;
  let valor: RespostasQuiz | null = null;
  try {
    valor = bruto ? (JSON.parse(bruto) as RespostasQuiz) : null;
  } catch {
    valor = null;
  }
  cache = { bruto, valor };
  return valor;
}

export function salvarRespostas(r: RespostasQuiz) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(r));
  } catch {
    // Sem armazenamento (modo privado): o quiz segue só na memória.
  }
  ouvintes.forEach((f) => f());
}

function assinar(f: () => void) {
  ouvintes.add(f);
  const aoMudar = (e: StorageEvent) => e.key === CHAVE && f();
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", aoMudar);
  };
}

/** Respostas do quiz (null antes do quiz). Logado: as da conta, gravadas no banco.
 *  Modo demonstração: as do aparelho. */
export function useRespostasSalvas() {
  const conta = useConta();
  const local = useSyncExternalStore(assinar, ler, () => null);
  const salvarLocal = useCallback((nova: RespostasQuiz) => salvarRespostas(nova), []);
  if (conta) return [conta.quiz, conta.salvarQuiz] as const;
  return [local, salvarLocal] as const;
}

/** Valores usados quando o quiz ainda não foi feito (iguais ao protótipo). */
export const RESPOSTAS_PADRAO: Required<Pick<RespostasQuiz, "sexo" | "idade" | "objetivo" | "nivel" | "local" | "equip" | "dias" | "tempo">> = {
  sexo: "Feminino",
  idade: "30 a 39",
  objetivo: "Ganhar massa muscular",
  nivel: "Intermediário",
  local: "Academia",
  equip: "Academia completa",
  dias: "4",
  tempo: "40",
};
