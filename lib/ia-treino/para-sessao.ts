// Treino gerado (rascunho do motor, em blocos) → treino da tela de execução (lista de passos). PURO.
//
// Circuito e Bi-Set: os exercícios do bloco se alternam por rodada (1, 2, 3, depois 1, 2, 3 de
// novo). Cada rodada de cada exercício vira um passo de 1 série, com o descanso certo depois:
// entre exercícios do circuito, entre rodadas e depois do bloco.
// Convencional, pirâmides e drop-set: o exercício faz todas as séries seguidas (um passo só).
import type { ExercicioSessao, Nivel, OpcaoTroca, TreinoSessao } from "../tipos";
import type { PerfilAluno } from "./aluno";
import type { RascunhoV2 } from "./v2/rascunho";
import { repsDoAlvo, segundosDoAlvo } from "./v2/validar";

export interface InfoExercicio {
  musculos: string[];
  grupoMuscular: string;
  equipamentos: string[] | null;
}

const ALTERNADOS = ["Circuito", "Bi-Set"];
/** Equipamentos em que faz sentido anotar a carga (kg). */
const COM_CARGA = ["halter", "barra", "kettlebell", "máquina", "polia/cross", "smith", "anilha", "tornozeleira", "wall ball/medicine ball", "bag/saco de areia"];
export const temCarga = (info?: InfoExercicio) => (info?.equipamentos ?? []).some((x) => COM_CARGA.includes(x));

/** Carga registrada antes pelo aluno, por exercício (kg). */
export interface CargaHistorico {
  ultima: number;
  melhor: number;
  /** Carga que vem preenchida (lib/ia-treino/adaptacao.ts). Sem ela, a última. */
  sugerida?: number;
  motivo?: string;
}
const NIVEL: Record<string, Nivel> = { N0: "Iniciante", N1: "Iniciante", N2: "Intermediário", N3: "Avançado" };
const LOCAL: Record<string, string> = { casa: "Em casa", condominio: "Condomínio", academia: "Academia" };

type Serie = RascunhoV2["blocks"][number]["exercises"][number]["series"][number];

function medida(series: readonly Serie[]): Pick<ExercicioSessao, "modo" | "reps" | "series" | "segundos"> {
  if (series.every((s) => s.type === "time")) {
    const seg = segundosDoAlvo(series[0]?.target ?? "") ?? [30];
    return { modo: "tempo", series: series.length, segundos: seg[0] ?? 30 };
  }
  return { modo: "reps", reps: series.map((s) => repsDoAlvo(s.target)[0] ?? 10) };
}

const grupoDe = (info?: InfoExercicio) => (info?.musculos[0] ?? info?.grupoMuscular ?? "").toUpperCase();
const equipamentoDe = (info?: InfoExercicio) => {
  const e = (info?.equipamentos ?? []).filter((x) => x !== "peso do corpo");
  return e.length ? e.join(", ") : "Peso do corpo";
};

export function paraTreinoSessao(
  r: RascunhoV2,
  a: {
    id: string;
    titulo: string;
    posicao: number;
    total: number;
    duracaoMin: number;
    perfil: Pick<PerfilAluno, "nivel">;
    local: string;
    info: ReadonlyMap<string, InfoExercicio>;
    cargas?: ReadonlyMap<string, CargaHistorico>;
    /** Substitutos por exercício do bloco: chave `${bloco}-${exerciseId}`. */
    opcoes?: ReadonlyMap<string, OpcaoTroca[]>;
    explicacoes?: ReadonlyMap<string, { posicao: string; movimento: string; cuidado: string }>;
  },
): TreinoSessao {
  const passos: ExercicioSessao[] = [];
  r.blocks.forEach((b, bi) => {
    const alternado = ALTERNADOS.includes(b.method) && b.exercises.length > 1;
    const ultimoBloco = bi === r.blocks.length - 1;
    const depoisDoBloco = ultimoBloco ? 0 : (b.restAfterBlockSec ?? b.restBetweenSeriesSec);
    const comum = (x: (typeof b.exercises)[number]) => {
      const c = a.cargas?.get(x.exerciseId);
      return {
        nome: x.exerciseName,
        grupo: grupoDe(a.info.get(x.exerciseId)),
        cargaAnterior: c ? (c.sugerida ?? c.ultima) : null,
        cargaMotivo: c?.motivo,
        melhorCarga: c ? c.melhor : null,
        comCarga: temCarga(a.info.get(x.exerciseId)),
        equipamento: equipamentoDe(a.info.get(x.exerciseId)),
        videoUrl: x.videoUrl || undefined,
        exercicioId: x.exerciseId,
        alternativas: [],
        opcoes: a.opcoes?.get(`${bi}-${x.exerciseId}`) ?? [],
        explicacao: a.explicacoes?.get(x.exerciseId),
      };
    };
    if (alternado) {
      for (let r = 0; r < b.numberSeries; r++) {
        b.exercises.forEach((x, xi) => {
          const ultimoDaRodada = xi === b.exercises.length - 1;
          const ultimaRodada = r === b.numberSeries - 1;
          passos.push({
            ...comum(x),
            id: `${x.exerciseId}-${bi}-${r}`,
            ...medida([x.series[r] ?? x.series[x.series.length - 1]]),
            descansoSeg: !ultimoDaRodada ? x.restSec : ultimaRodada ? depoisDoBloco : b.restBetweenSeriesSec,
            rodada: `${b.method === "Bi-Set" ? "Bi-set" : "Circuito"} · rodada ${r + 1} de ${b.numberSeries}`,
            ajuste: x.comments || `${b.method === "Bi-Set" ? "Bi-set" : "Circuito"}: ${b.exercises.length} exercícios em sequência, ${b.numberSeries} rodadas.`,
          });
        });
      }
    } else {
      b.exercises.forEach((x) => {
        passos.push({
          ...comum(x),
          id: `${x.exerciseId}-${bi}`,
          ...medida(x.series),
          descansoSeg: b.restBetweenSeriesSec,
          ajuste: x.comments || `${b.method}: ${x.series.length} séries.`,
        });
      });
    }
  });
  const palavras = a.titulo.split(" ");
  return {
    id: a.id,
    nome: a.titulo,
    palavraDestaque: palavras[palavras.length - 1],
    duracaoMin: a.duracaoMin,
    local: LOCAL[a.local] ?? a.local,
    nivel: NIVEL[a.perfil.nivel ?? ""] ?? "Iniciante",
    posicaoProtocolo: a.posicao,
    totalProtocolo: a.total,
    exercicios: passos,
  };
}

/** Quantos exercícios diferentes o treino tem (para "8 exercícios" no card). */
export const exerciciosDistintos = (r: RascunhoV2) => new Set(r.blocks.flatMap((b) => b.exercises.map((x) => x.exerciseId))).size;
