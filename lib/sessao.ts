"use client";

// Estado da sessão de treino (execução → avaliação → resumo).
// Regras do handoff:
// - descanso de 60 s entre séries por repetição e 30 s por tempo; +15 s soma ao total;
// - ao zerar o descanso, volta à série seguinte ou passa ao próximo exercício;
// - carga acima da melhor marca mostra RECORDE na hora (1 por exercício);
// - concluir a última série do último exercício abre a avaliação.

import { useCallback, useEffect, useReducer } from "react";
import type { ExercicioSessao, TreinoSessao } from "./tipos";

export type Folha = null | "menu" | "trocar" | "dor" | "dorLeve" | "dorForte";
export type Avaliacao = "facil" | "ideal" | "dificil";

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
  trocas: Record<number, string>;
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
  | { t: "trocar"; nome: string }
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
        return { ...s, folha: a.folha };
      case "trocar":
        return { ...s, trocas: { ...s.trocas, [s.ex]: a.nome }, folha: null };
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
      if (e.modo !== "reps" || e.cargaAnterior == null) return;
      e.reps?.forEach((r, j) => {
        if (!s.feitos[chave(i, j)]) return;
        const c = parseFloat(String(s.cargas[chave(i, j)] || e.cargaAnterior).replace(",", ".")) || 0;
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
