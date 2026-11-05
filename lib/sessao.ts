"use client";

// Estado da sessão de treino (execução → avaliação → resumo).
// Regras do handoff:
// - descanso de 60 s entre séries por repetição e 30 s por tempo; +15 s soma ao total;
// - ao zerar o descanso, volta à série seguinte ou passa ao próximo exercício;
// - carga acima da melhor marca mostra RECORDE na hora (1 por exercício);
// - concluir a última série do último exercício abre a avaliação.

import { useCallback, useEffect, useReducer } from "react";
import type { ExercicioSessao, OpcaoTroca, TreinoSessao } from "./tipos";

export type Folha = null | "menu" | "trocar" | "dor" | "dorLeve" | "dorForte";
export type Avaliacao = "facil" | "ideal" | "dificil";

/** Exercício trocado na execução. motivo vai para trocas_exercicio (lista "Mais trocados" do Master). */
export interface Troca {
  nome: string;
  id?: string;
  videoUrl?: string;
  motivo: "dor" | "dificil";
}

export interface Descanso {
  restante: number;
  total: number;
  depois: "mesmo" | "proximo";
}

export interface EstadoSessao {
  tela: "execucao" | "avaliacao" | "resumo";
  ex: number;
  feitos: Record<string, true>;
  cargas: Record<string, string>;
  recordes: number;
  exRecorde: number | null;
  descanso: Descanso | null;
  timer: { restante: number; rodando: boolean } | null;
  folha: Folha;
  voz: boolean;
  explicacao: number;
  avaliacao: Avaliacao | null;
  trocas: Record<number, Troca>;
  teveDor: boolean;
  /** Dor relatada por passo (vale para o exercício: sai dos próximos treinos). */
  dores: Record<number, "leve" | "forte">;
  inicio: number;
  fim: number | null;
}

export const DESCANSO_REPS = 60;
export const DESCANSO_TEMPO = 30;
export const EXPLICACAO_S = 15;

export const nSeries = (e: ExercicioSessao) => (e.modo === "reps" ? (e.reps?.length ?? 0) : (e.series ?? 0));
const chave = (i: number, j: number) => `${i}-${j}`;

export function primeiraPendente(treino: TreinoSessao, feitos: Record<string, true>, i: number) {
  const n = nSeries(treino.exercicios[i]);
  for (let j = 0; j < n; j++) if (!feitos[chave(i, j)]) return j;
  return n;
}

const timerDe = (e: ExercicioSessao) => (e.modo === "tempo" ? { restante: e.segundos ?? 0, rodando: false } : null);

export type Acao =
  | { t: "tick" }
  | { t: "concluirSerie"; j: number }
  | { t: "desfazerSerie"; j: number }
  | { t: "carga"; j: number; valor: string }
  | { t: "mais15" }
  | { t: "pularDescanso" }
  | { t: "alternarTimer" }
  | { t: "folha"; folha: Folha }
  | { t: "trocar"; opcao: OpcaoTroca }
  | { t: "voz" }
  | { t: "explicacao" }
  | { t: "avaliar"; valor: Avaliacao }
  | { t: "verResumo" };

function irPara(treino: TreinoSessao, s: EstadoSessao, i: number): EstadoSessao {
  if (i >= treino.exercicios.length) return { ...s, tela: "avaliacao", descanso: null, timer: null, folha: null, fim: Date.now() };
  return { ...s, ex: i, timer: timerDe(treino.exercicios[i]), folha: null, descanso: null };
}

function concluir(treino: TreinoSessao, s: EstadoSessao, i: number, j: number): EstadoSessao {
  const e = treino.exercicios[i];
  const feitos = { ...s.feitos, [chave(i, j)]: true as const };
  let { recordes, exRecorde } = s;
  if (e.modo === "reps" && e.melhorCarga != null && exRecorde !== i) {
    const c = parseFloat(String(s.cargas[chave(i, j)] ?? "").replace(",", "."));
    if (c > e.melhorCarga) {
      recordes++;
      exRecorde = i;
    }
  }
  const terminou = primeiraPendente(treino, feitos, i) >= nSeries(e);
  if (terminou && i === treino.exercicios.length - 1) {
    return { ...s, feitos, recordes, exRecorde, timer: null, descanso: null, tela: "avaliacao", fim: Date.now() };
  }
  const total = e.descansoSeg ?? (e.modo === "tempo" ? DESCANSO_TEMPO : DESCANSO_REPS);
  // Treino gerado pode ter descanso 0 entre os exercícios do circuito: passa direto.
  if (total <= 0 && terminou) return irPara(treino, { ...s, feitos, recordes, exRecorde }, i + 1);
  return {
    ...s,
    feitos,
    recordes,
    exRecorde,
    descanso: { restante: total, total, depois: terminou ? "proximo" : "mesmo" },
    timer: e.modo === "tempo" ? timerDe(e) : s.timer,
  };
}

function terminarDescanso(treino: TreinoSessao, s: EstadoSessao): EstadoSessao {
  const depois = s.descanso?.depois;
  const semDescanso = { ...s, descanso: null };
  return depois === "proximo" ? irPara(treino, semDescanso, s.ex + 1) : semDescanso;
}

function reduzir(treino: TreinoSessao) {
  return (s: EstadoSessao, a: Acao): EstadoSessao => {
    switch (a.t) {
      case "tick": {
        let n = s.explicacao > 0 ? { ...s, explicacao: s.explicacao - 1 } : s;
        if (n.tela !== "execucao") return n;
        if (n.descanso) {
          return n.descanso.restante <= 1 ? terminarDescanso(treino, n) : { ...n, descanso: { ...n.descanso, restante: n.descanso.restante - 1 } };
        }
        if (n.timer?.rodando && !n.folha) {
          if (n.timer.restante <= 1) return concluir(treino, n, n.ex, primeiraPendente(treino, n.feitos, n.ex));
          n = { ...n, timer: { ...n.timer, restante: n.timer.restante - 1 } };
        }
        return n;
      }
      case "concluirSerie":
        return concluir(treino, s, s.ex, a.j);
      case "desfazerSerie": {
        const feitos = { ...s.feitos };
        delete feitos[chave(s.ex, a.j)];
        return { ...s, feitos };
      }
      case "carga":
        return { ...s, cargas: { ...s.cargas, [chave(s.ex, a.j)]: a.valor } };
      case "mais15":
        return s.descanso ? { ...s, descanso: { ...s.descanso, restante: s.descanso.restante + 15, total: s.descanso.total + 15 } } : s;
      case "pularDescanso":
        return terminarDescanso(treino, s);
      case "alternarTimer":
        return s.timer ? { ...s, timer: { ...s.timer, rodando: !s.timer.rodando } } : s;
      case "folha":
        if (a.folha === "dorLeve" || a.folha === "dorForte") {
          const nivel = a.folha === "dorForte" ? "forte" : "leve";
          return { ...s, folha: a.folha, teveDor: true, dores: { ...s.dores, [s.ex]: s.dores[s.ex] === "forte" ? "forte" : nivel } };
        }
        return { ...s, folha: a.folha };
      case "trocar": {
        // No circuito o mesmo exercício aparece em cada rodada: troca em todas as que faltam.
        const atual = treino.exercicios[s.ex];
        const troca: Troca = { nome: a.opcao.nome, id: a.opcao.id || undefined, videoUrl: a.opcao.videoUrl, motivo: s.folha === "trocar" && s.teveDor ? "dor" : "dificil" };
        const trocas = { ...s.trocas };
        treino.exercicios.forEach((x, i) => {
          if (i === s.ex || (i > s.ex && atual.exercicioId && x.exercicioId === atual.exercicioId)) trocas[i] = troca;
        });
        return { ...s, trocas, folha: null };
      }
      case "voz":
        return { ...s, voz: !s.voz };
      case "explicacao":
        return { ...s, explicacao: s.explicacao > 0 ? 0 : EXPLICACAO_S };
      case "avaliar":
        return { ...s, avaliacao: a.valor };
      case "verResumo":
        return s.avaliacao ? { ...s, tela: "resumo" } : s;
    }
  };
}

function cargasIniciais(treino: TreinoSessao) {
  const c: Record<string, string> = {};
  treino.exercicios.forEach((e, i) => {
    for (let j = 0; j < nSeries(e); j++) c[chave(i, j)] = e.cargaAnterior != null ? String(e.cargaAnterior) : "";
  });
  return c;
}

export function useSessao(treino: TreinoSessao) {
  const [s, despachar] = useReducer(reduzir(treino), undefined, () => ({
    tela: "execucao" as const,
    ex: 0,
    feitos: {},
    cargas: cargasIniciais(treino),
    recordes: 0,
    exRecorde: null,
    descanso: null,
    timer: timerDe(treino.exercicios[0]),
    folha: null,
    voz: true,
    explicacao: 0,
    avaliacao: null,
    trocas: {},
    teveDor: false,
    dores: {},
    inicio: Date.now(),
    fim: null,
  }));

  useEffect(() => {
    const iv = setInterval(() => despachar({ t: "tick" }), 1000);
    return () => clearInterval(iv);
  }, []);

  const volume = useCallback(() => {
    let v = 0;
    treino.exercicios.forEach((e, i) => {
      if (e.modo !== "reps" || (e.cargaAnterior == null && !e.comCarga)) return;
      e.reps?.forEach((r, j) => {
        if (!s.feitos[chave(i, j)]) return;
        const c = parseFloat(String(s.cargas[chave(i, j)] || e.cargaAnterior || 0).replace(",", ".")) || 0;
        v += r * c * (e.cargaDupla ? 2 : 1);
      });
    });
    return v;
  }, [treino, s.feitos, s.cargas]);

  const exerciciosFeitos = treino.exercicios.filter((e, i) => primeiraPendente(treino, s.feitos, i) >= nSeries(e)).length;
  const minutos = Math.max(1, Math.round(((s.fim ?? Date.now()) - s.inicio) / 60000));

  return { s, despachar, volume, exerciciosFeitos, minutos };
}

export const fmtTempo = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;

export function resumoSeries(e: ExercicioSessao) {
  if (e.modo === "tempo") return `${e.series} × ${e.segundos} s`;
  const r = e.reps ?? [];
  const iguais = r.every((x) => x === r[0]);
  return `${r.length} × ${iguais ? r[0] : r.join("-")}`;
}

/** Séries feitas, no formato de sessoes.series (treino gerado: com o id do exercício). */
export function seriesFeitas(treino: TreinoSessao, s: EstadoSessao) {
  const lista: { exercicioId: string; nome: string; serie: number; reps?: number; segundos?: number; carga?: number; dor?: "leve" | "forte" }[] = [];
  treino.exercicios.forEach((e, i) => {
    const t = s.trocas[i];
    const id = t ? t.id : e.exercicioId;
    if (!id) return;
    for (let j = 0; j < nSeries(e); j++) {
      if (!s.feitos[chave(i, j)]) continue;
      const c = parseFloat(String(s.cargas[chave(i, j)] ?? "").replace(",", "."));
      lista.push({
        exercicioId: id,
        nome: t?.nome ?? e.nome,
        serie: j + 1,
        ...(e.modo === "reps" ? { reps: e.reps?.[j] } : { segundos: e.segundos }),
        ...(c > 0 ? { carga: Math.round(c * 10) / 10 } : {}),
      });
    }
  });
  // Dor: um registro por exercício (serie 0), no exercício que estava na tela.
  const comDor = new Set<string>();
  for (const [k, nivel] of Object.entries(s.dores)) {
    const e = treino.exercicios[+k];
    const t = s.trocas[+k];
    const id = t?.id ?? e?.exercicioId;
    if (!e || !id || comDor.has(id)) continue;
    comDor.add(id);
    lista.push({ exercicioId: id, nome: t?.nome ?? e.nome, serie: 0, dor: nivel });
  }
  return lista;
}

/** Trocas feitas (uma por exercício trocado), para trocas_exercicio. */
export function trocasFeitas(treino: TreinoSessao, s: EstadoSessao) {
  const vistas = new Set<string>();
  const lista: { de: string; para: string; motivo: Troca["motivo"] }[] = [];
  for (const [k, t] of Object.entries(s.trocas)) {
    const de = treino.exercicios[+k]?.exercicioId;
    if (!de || !t.id || vistas.has(`${de}>${t.id}`)) continue;
    vistas.add(`${de}>${t.id}`);
    lista.push({ de, para: t.id, motivo: t.motivo });
  }
  return lista;
}
