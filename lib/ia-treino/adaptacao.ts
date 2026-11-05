// O que o aluno faz no treino ajusta os próximos. PURO (sem banco): testado em
// scripts/teste-adaptacao.mts. Regras (padrões a confirmar pelo Richard, em docs/ia-treino.md):
//
// 1. Carga: no último treino com carga anotada, avaliação "fácil", todas as séries feitas e sem dor
//    no exercício → sugere subir 5% (mínimo 1 kg, de 0,5 em 0,5). "Ideal", "difícil" ou dor → repete.
// 2. Volume: os 2 últimos treinos concluídos avaliados como "difícil" → 1 série a menos em cada
//    exercício (nunca abaixo de 2), menos no aquecimento. Volta ao normal com um treino não difícil.
// 3. Dor: exercício marcado com dor sai dos próximos treinos (leve: 14 dias, forte: 30 dias). Nos
//    treinos já montados, entra o substituto mais parecido.
// 4. Trocas: exercício trocado 2 vezes ou mais (60 dias) sai dos próximos treinos, do mesmo jeito.

import type { RascunhoV2 } from "./v2/rascunho";

export interface ItemSerie {
  exercicioId: string;
  nome: string;
  serie: number;
  reps?: number;
  segundos?: number;
  carga?: number;
  /** Dor relatada neste exercício (registro sem série: serie 0). */
  dor?: "leve" | "forte";
}

export interface SessaoHistorico {
  /** Data do treino (concluída ou interrompida). */
  em: string;
  concluida: boolean;
  avaliacao: "facil" | "ideal" | "dificil" | null;
  series: ItemSerie[];
}

export interface TrocaHistorico {
  de: string;
  em: string;
}

export interface CargaAdaptada {
  ultima: number;
  melhor: number;
  /** Carga que já vem preenchida (subida quando o último foi fácil). */
  sugerida: number;
  motivo?: string;
}

export interface Adaptacao {
  cargas: Map<string, CargaAdaptada>;
  /** Exercícios que saem dos próximos treinos, com o motivo. */
  evitar: Map<string, string>;
  menosVolume: boolean;
}

const DIA = 86_400_000;
export const DOR_DIAS = { leve: 14, forte: 30 } as const;
export const TROCAS_DIAS = 60;
export const TROCAS_MINIMO = 2;

/** Próxima carga quando o treino foi fácil: +5%, mínimo 1 kg, de 0,5 em 0,5. */
export function subirCarga(c: number): number {
  return Math.round((c + Math.max(1, c * 0.05)) * 2) / 2;
}

/** Só as séries de verdade (sem os registros de dor). */
export const seriesReais = (s: readonly ItemSerie[]) => s.filter((x) => !x.dor && x.serie > 0);

export function calcularAdaptacao(sessoesBrutas: readonly SessaoHistorico[], trocas: readonly TrocaHistorico[], agora: number): Adaptacao {
  const sessoes = [...sessoesBrutas].sort((a, b) => b.em.localeCompare(a.em)); // mais recente primeiro

  // 3. Dor.
  const evitar = new Map<string, string>();
  for (const s of sessoes) {
    const dias = (agora - Date.parse(s.em)) / DIA;
    for (const x of s.series) {
      if (!x.dor || evitar.has(x.exercicioId)) continue;
      if (dias <= DOR_DIAS[x.dor]) evitar.set(x.exercicioId, `você marcou dor ${x.dor === "forte" ? "forte" : "leve"} em ${x.nome}`);
    }
  }
  // 4. Trocas repetidas.
  const contagem = new Map<string, number>();
  for (const t of trocas) if ((agora - Date.parse(t.em)) / DIA <= TROCAS_DIAS) contagem.set(t.de, (contagem.get(t.de) ?? 0) + 1);
  for (const [id, n] of contagem) if (n >= TROCAS_MINIMO && !evitar.has(id)) evitar.set(id, `você trocou este exercício ${n} vezes`);

  // 2. Volume.
  const concluidas = sessoes.filter((s) => s.concluida);
  const menosVolume = concluidas.length >= 2 && concluidas[0].avaliacao === "dificil" && concluidas[1].avaliacao === "dificil";

  // 1. Carga: a sessão mais recente de cada exercício manda na sugestão; a melhor é de todas.
  const cargas = new Map<string, CargaAdaptada>();
  for (const s of concluidas) {
    const reais = seriesReais(s.series);
    const porEx = new Map<string, { nome: string; maior: number; series: number; comCarga: number }>();
    for (const x of reais) {
      const e = porEx.get(x.exercicioId) ?? { nome: x.nome, maior: 0, series: 0, comCarga: 0 };
      e.series++;
      if (x.carga && x.carga > 0) {
        e.comCarga++;
        e.maior = Math.max(e.maior, x.carga);
      }
      porEx.set(x.exercicioId, e);
    }
    const doeu = new Set(s.series.filter((x) => x.dor).map((x) => x.exercicioId));
    for (const [id, e] of porEx) {
      if (!e.maior) continue;
      const c = cargas.get(id);
      if (c) {
        c.melhor = Math.max(c.melhor, e.maior);
        continue;
      }
      const sobe = s.avaliacao === "facil" && !doeu.has(id) && e.comCarga === e.series;
      cargas.set(id, {
        ultima: e.maior,
        melhor: e.maior,
        sugerida: sobe ? subirCarga(e.maior) : e.maior,
        motivo: sobe ? `Subiu de ${fmtKg(e.maior)} para ${fmtKg(subirCarga(e.maior))} kg: o último treino foi fácil.` : undefined,
      });
    }
  }
  return { cargas, evitar, menosVolume };
}

const fmtKg = (n: number) => String(n).replace(".", ",");

type Opcao = { id: string; nome: string; videoUrl?: string };

/**
 * Aplica a adaptação a um treino já montado (sem chamar a IA de novo): troca os exercícios a
 * evitar pelo substituto mais parecido e tira 1 série quando o volume deve cair.
 */
export function adaptarTreino(r: RascunhoV2, a: Pick<Adaptacao, "evitar" | "menosVolume">, opcoes: ReadonlyMap<string, readonly Opcao[]>): { rascunho: RascunhoV2; notas: string[] } {
  const notas: string[] = [];
  const noTreino = new Set(r.blocks.flatMap((b) => b.exercises.map((x) => x.exerciseId)));
  const blocks = r.blocks.map((b, bi) => {
    let exercises = b.exercises.map((x) => {
      const motivo = a.evitar.get(x.exerciseId);
      if (!motivo) return x;
      const sub = (opcoes.get(`${bi}-${x.exerciseId}`) ?? []).find((o) => !a.evitar.has(o.id) && !noTreino.has(o.id));
      if (!sub) {
        notas.push(`${x.exerciseName} continua no treino (sem substituto com o seu equipamento); ${motivo}. Se doer, pare.`);
        return x;
      }
      noTreino.add(sub.id);
      notas.push(`${sub.nome} entrou no lugar de ${x.exerciseName}: ${motivo}.`);
      return { ...x, exerciseId: sub.id, exerciseName: sub.nome, videoUrl: sub.videoUrl ?? "", comments: `No lugar de ${x.exerciseName}.` };
    });
    let numberSeries = b.numberSeries;
    // O primeiro bloco é o aquecimento: fica igual.
    if (a.menosVolume && bi > 0) {
      const alternado = (b.method === "Circuito" || b.method === "Bi-Set") && b.exercises.length > 1;
      if (alternado && numberSeries > 2) {
        numberSeries--;
        exercises = exercises.map((x) => ({ ...x, series: x.series.slice(0, numberSeries) }));
      } else if (!alternado) {
        exercises = exercises.map((x) => (x.series.length > 2 ? { ...x, series: x.series.slice(0, -1) } : x));
        numberSeries = Math.max(...exercises.map((x) => x.series.length));
      }
    }
    return { ...b, numberSeries, exercises };
  });
  if (a.menosVolume) notas.unshift("1 série a menos em cada exercício: os seus 2 últimos treinos foram difíceis.");
  return { rascunho: { ...r, blocks }, notas };
}
