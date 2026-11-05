// DADOS DE EXEMPLO da vitrine (busca e "ver tudo"), iguais ao protótipo.
// Viram consulta aos treinos publicados, com etiquetas vindas do catálogo real.

import type { EstadoAcesso, Nivel } from "./tipos";

export interface TreinoVitrine {
  nome: string;
  minutos: number;
  nivel: Exclude<Nivel, "Todos">;
  local: "Casa" | "Academia";
  /** Regiões, aparelhos e materiais do treino (é por aqui que a busca encontra). */
  etiquetas: string[];
  // Só nos treinos prontos de verdade (lib/dados/treinos-prontos.ts):
  id?: string;
  fileira?: string;
  /** Programa (produto) a que o treino pertence, e a ordem dentro dele. */
  programa?: string;
  programaNome?: string;
  ordem?: number;
  bloqueado?: boolean;
  feito?: boolean;
  /** Lesão: "Lombar · fase 1". */
  sub?: string;
}

export const TREINOS_VITRINE: TreinoVitrine[] = [
  { nome: "Glúteo e posterior", minutos: 42, nivel: "Intermediário", local: "Academia", etiquetas: ["Glúteo", "posterior", "elevação pélvica", "stiff", "mini band", "halter"] },
  { nome: "Glúteo em casa com mini band", minutos: 25, nivel: "Iniciante", local: "Casa", etiquetas: ["Glúteo", "mini band", "abdução", "ponte"] },
  { nome: "Glúteo na polia", minutos: 40, nivel: "Intermediário", local: "Academia", etiquetas: ["Glúteo", "polia", "cabo"] },
  { nome: "Pernas com elástico", minutos: 25, nivel: "Intermediário", local: "Casa", etiquetas: ["Pernas", "quadríceps", "glúteo", "elástico"] },
  { nome: "Quadríceps", minutos: 50, nivel: "Avançado", local: "Academia", etiquetas: ["Quadríceps", "cadeira extensora", "leg press", "agachamento", "pernas"] },
  { nome: "Pernas na máquina", minutos: 45, nivel: "Iniciante", local: "Academia", etiquetas: ["Cadeira extensora", "mesa flexora", "leg press", "pernas"] },
  { nome: "Lombar sem dor", minutos: 20, nivel: "Iniciante", local: "Casa", etiquetas: ["Lombar", "core", "mobilidade", "colchonete"] },
  { nome: "Core e mobilidade", minutos: 20, nivel: "Iniciante", local: "Casa", etiquetas: ["Abdômen", "core", "mobilidade", "colchonete"] },
  { nome: "Corpo todo com halter", minutos: 30, nivel: "Iniciante", local: "Casa", etiquetas: ["Halter", "corpo todo", "agachamento"] },
  { nome: "Costas e bíceps", minutos: 45, nivel: "Intermediário", local: "Academia", etiquetas: ["Costas", "bíceps", "puxada", "remada"] },
  { nome: "Peito e tríceps", minutos: 40, nivel: "Intermediário", local: "Academia", etiquetas: ["Peito", "tríceps", "supino", "halter"] },
  { nome: "HIIT de 15 minutos", minutos: 15, nivel: "Intermediário", local: "Casa", etiquetas: ["HIIT", "peso do corpo", "cardio"] },
  { nome: "Ombro forte", minutos: 35, nivel: "Intermediário", local: "Academia", etiquetas: ["Ombros", "desenvolvimento", "elevação lateral", "halter"] },
  { nome: "Alongamento pós-treino", minutos: 10, nivel: "Iniciante", local: "Casa", etiquetas: ["Alongamento", "mobilidade"] },
];

/** Sem acento e em minúsculas, para a busca achar "glúteo" digitando "gluteo". */
export const normalizar = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Aluno com programa (exemplo: Glúteo) só tem liberados os treinos de glúteo. */
export const treinoBloqueado = (nome: string, estado: EstadoAcesso) => estado === "pausada" || (estado === "programa" && !nome.startsWith("Glúteo"));
