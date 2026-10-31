// DADOS DE EXEMPLO do protocolo de 24 treinos e do programa Glúteo (iguais ao
// protótipo). Os treinos reais virão do protocolo publicado para o aluno.

import type { EstadoAcesso } from "./tipos";

export interface TreinoResumo {
  titulo: [string, string];
  duracao: string;
  equipamentos: string;
  exercicios: [string, string][];
}

/** Os 4 treinos que se alternam no protocolo de exemplo (A, B, C, D). */
export const TREINOS_TIPO: Record<"A" | "B" | "C" | "D", TreinoResumo> = {
  A: {
    titulo: ["Glúteo e ", "posterior"],
    duracao: "42 min",
    equipamentos: "Halteres, banco, mini band",
    exercicios: [
      ["Agachamento goblet", "4 × 12-10-10-8"],
      ["Stiff com halteres", "3 × 12-10-10"],
      ["Elevação pélvica com halter", "4 × 12-10-8-8"],
      ["Afundo alternado", "3 × 10"],
      ["Abdução com mini band", "3 × 15"],
      ["Prancha frontal", "3 × 40 s"],
    ],
  },
  B: {
    titulo: ["Costas e ", "ombros"],
    duracao: "40 min",
    equipamentos: "Halteres, banco, elástico",
    exercicios: [
      ["Remada unilateral com halter", "4 × 12-10-10-8"],
      ["Puxada com elástico", "3 × 12"],
      ["Desenvolvimento com halteres", "4 × 10"],
      ["Elevação lateral", "3 × 12"],
      ["Crucifixo invertido no banco", "3 × 12"],
      ["Prancha lateral", "3 × 30 s"],
    ],
  },
  C: {
    titulo: ["Quadríceps e ", "core"],
    duracao: "38 min",
    equipamentos: "Kettlebell, banco, colchonete",
    exercicios: [
      ["Agachamento com kettlebell", "4 × 12-10-10-8"],
      ["Subida no banco", "3 × 10"],
      ["Agachamento búlgaro", "3 × 10"],
      ["Abdominal remador", "3 × 15"],
      ["Dead bug", "3 × 12"],
      ["Prancha frontal", "3 × 40 s"],
    ],
  },
  D: {
    titulo: ["Peito e ", "braços"],
    duracao: "40 min",
    equipamentos: "Halteres, banco",
    exercicios: [
      ["Supino com halteres no banco", "4 × 12-10-10-8"],
      ["Flexão de braço", "3 × 10"],
      ["Crucifixo com halteres", "3 × 12"],
      ["Rosca direta", "3 × 12-10-10"],
      ["Tríceps francês", "3 × 12"],
      ["Rosca martelo", "3 × 12"],
    ],
  },
};

/** Treino n (1 a 24) do protocolo de exemplo. O 7 é o "treino de hoje" (tipo A). */
export const tipoDoTreino = (n: number) => "CDAB"[(n - 1) % 4] as "A" | "B" | "C" | "D";

export type SituacaoTreino = "feito" | "atual" | "liberado" | "bloqueado";

/** Progresso no protocolo por estado de acesso (exemplo). */
export function progressoProtocolo(estado: EstadoAcesso) {
  if (estado === "pausada") return { feitos: 6, atual: 0, liberadosAte: 0 };
  if (estado === "programa") return { feitos: 2, atual: 3, liberadosAte: 4 };
  return { feitos: 6, atual: 7, liberadosAte: 24 };
}

export function situacaoDoTreino(n: number, estado: EstadoAcesso): SituacaoTreino {
  const p = progressoProtocolo(estado);
  if (n <= p.feitos) return "feito";
  if (n === p.atual) return "atual";
  if (n <= p.liberadosAte) return "liberado";
  return "bloqueado";
}

export const PROGRAMA_GLUTEO = {
  id: "programa-gluteo",
  nome: "Glúteo",
  total: 12,
  feitos: 4,
  etapas: ["Ativação", "Ponte e elevação", "Unilateral", "Polia e cabo", "Carga progressiva", "Amplitude", "Pausa no topo", "Isometria", "Volume", "Força", "Pico de carga", "Revisão"],
  /** Treino 05 (o próximo). */
  proximo: {
    titulo: ["Carga ", "progressiva"] as [string, string],
    duracao: "38 min",
    equipamentos: "Halteres, polia, mini band",
    exercicios: [
      ["Elevação pélvica com halter", "4 × 12-10-8-8"],
      ["Agachamento sumô", "4 × 12"],
      ["Stiff com halteres", "3 × 12-10-10"],
      ["Glúteo na polia", "3 × 12"],
      ["Abdução com mini band", "3 × 15"],
    ] as [string, string][],
  },
};
