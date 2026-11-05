// Tipos do domínio. Nomes em português, como no resto do projeto.

/** Estado de acesso do aluno (README do handoff, "Estados do aluno"). */
export type EstadoAcesso = "assinante" | "programa" | "pausada";

export type Nivel = "Iniciante" | "Intermediário" | "Avançado" | "Todos";

export interface OpcaoTroca {
  id: string;
  nome: string;
  videoUrl?: string;
}

export interface ExercicioSessao {
  id: string;
  nome: string;
  grupo: string;
  modo: "reps" | "tempo";
  /** Modo reps: repetições alvo de cada série. */
  reps?: number[];
  /** Modo tempo: número de séries e segundos por série. */
  series?: number;
  segundos?: number;
  /** Carga da última vez, em kg. null = exercício sem carga. */
  cargaAnterior: number | null;
  /** Melhor carga já registrada, para detectar recorde. */
  melhorCarga?: number | null;
  /** Equipamento mostrado no lugar da carga quando não há carga. */
  equipamento?: string;
  /** Halteres contam em dobro no volume. */
  cargaDupla?: boolean;
  /** Nome do arquivo do vídeo em public/assets/videos, sem extensão. */
  video?: string;
  ajuste: string;
  alternativas: string[];
  /** Vídeo do catálogo (endereço completo). Tem prioridade sobre `video`. */
  videoUrl?: string;
  /** Descanso depois de cada série deste passo, em segundos (treino gerado). Sem ele: 60 s por
   *  repetição e 30 s por tempo. */
  descansoSeg?: number;
  /** Circuito e bi-set: "Rodada 2 de 3". */
  rodada?: string;
  /** Id do exercício no catálogo (o mesmo do +Q Pilates). */
  exercicioId?: string;
  /** Por que a carga preenchida mudou ("Subiu de 10 para 11 kg: o último treino foi fácil."). */
  cargaMotivo?: string;
  /** Treino gerado: exercício com carga (halter, barra, máquina...), mesmo sem histórico. */
  comCarga?: boolean;
  /** Explicação aprovada pelo Master (Master > Explicações). */
  explicacao?: { posicao: string; movimento: string; cuidado: string };
  /** Treino gerado: substitutos do catálogo (mesmos músculos, com o equipamento do aluno). */
  opcoes?: OpcaoTroca[];
}

export interface TreinoSessao {
  id: string;
  nome: string;
  /** Palavra do nome que recebe o destaque amarelo. */
  palavraDestaque: string;
  duracaoMin: number;
  local: string;
  nivel: Nivel;
  posicaoProtocolo: number;
  totalProtocolo: number;
  /** Ajustes feitos pela adaptação (volume, exercícios trocados por dor ou trocas repetidas). */
  notas?: string[];
  exercicios: ExercicioSessao[];
}

export interface CardTreino {
  id: string;
  nome: string;
  duracao: string;
  nivel: Nivel;
  /** Faz parte do que o aluno com programa já tem liberado. */
  doPrograma?: boolean;
  /** Percentual concluído, para "Continue de onde parou". */
  progresso?: number;
  feito?: boolean;
}

export interface FileiraCards {
  titulo: string;
  itens: CardTreino[];
}
