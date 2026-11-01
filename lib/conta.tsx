"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { salvarQuizAction } from "./acoes/conta";
import type { EstadoAluno } from "./acesso";
import type { RespostasQuiz } from "./quiz";

/** Conta logada, vinda do servidor (app/layout.tsx). null = modo demonstração. */
export interface DadosConta {
  id: string;
  nome: string;
  email: string;
  papel: "aluno" | "master";
  estado: EstadoAluno;
  programas: string[];
  quiz: RespostasQuiz | null;
}

interface Conta extends DadosConta {
  salvarQuiz: (r: RespostasQuiz) => void;
}

const Contexto = createContext<Conta | null>(null);

export function ProvedorConta({ conta, children }: { conta: DadosConta | null; children: ReactNode }) {
  const [quiz, setQuiz] = useState<RespostasQuiz | null>(conta?.quiz ?? null);
  const salvarQuiz = useCallback((r: RespostasQuiz) => {
    setQuiz(r);
    void salvarQuizAction(r).then((res) => {
      if (!res.ok) console.error("[quiz] não salvou na conta:", res.error);
    });
  }, []);
  const valor = useMemo(() => (conta ? { ...conta, quiz, salvarQuiz } : null), [conta, quiz, salvarQuiz]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Conta logada, ou null no modo demonstração. */
export function useConta() {
  return useContext(Contexto);
}

export function iniciaisDe(nome: string, email = ""): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase() || "+Q";
}

const ALUNO_DEMO = { nome: "Mariana Costa", email: "mariana.costa@email.com" };

/** Nome, e-mail e iniciais para mostrar: os da conta, ou os de exemplo no modo demonstração. */
export function useAlunoExibido() {
  const conta = useConta();
  const nome = conta ? conta.nome || conta.email.split("@")[0] : ALUNO_DEMO.nome;
  const email = conta ? conta.email : ALUNO_DEMO.email;
  return { nome, email, iniciais: iniciaisDe(conta ? conta.nome : ALUNO_DEMO.nome, email) };
}
