"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// Gerador em segundo plano: enquanto o aluno está com o app aberto, pede ao servidor o próximo
// treino da fila (um por vez) até a fila esvaziar. O servidor nunca gera além de "feitos + dias
// por semana", então isso não sai do controle. Volta a rodar quando o quiz é salvo ou um treino
// é concluído (evento "maisq:fila").

export interface EstadoGeracao {
  rodando: boolean;
  prontos: number;
  naFila: number;
  comErro: number;
  total: number | null;
  /** IA sem chave configurada ou sem sessão: não adianta tentar. */
  indisponivel: boolean;
}

const Contexto = createContext<EstadoGeracao | null>(null);
export const useGeracao = () => useContext(Contexto);
export const avisarFila = () => window.dispatchEvent(new Event("maisq:fila"));

export function ProvedorGeracao({ ativo, children }: { ativo: boolean; children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoGeracao>({ rodando: false, prontos: 0, naFila: 0, comErro: 0, total: null, indisponivel: false });
  const rodando = useRef(false);
  const deNovo = useRef(false);

  const rodar = useCallback(async () => {
    if (rodando.current) {
      deNovo.current = true;
      return;
    }
    rodando.current = true;
    setEstado((e) => ({ ...e, rodando: true }));
    try {
      for (let volta = 0; volta < 30; volta++) {
        const resp = await fetch("/api/ia/proximo", { method: "POST" }).catch(() => null);
        if (!resp || resp.status === 401 || resp.status === 503) {
          setEstado((e) => ({ ...e, indisponivel: resp?.status === 503 }));
          break;
        }
        const r = await resp.json().catch(() => null);
        if (!r?.ok) break;
        setEstado((e) => ({ ...e, prontos: r.prontos ?? e.prontos, naFila: r.naFila ?? 0, comErro: r.comErro ?? 0, total: r.total ?? e.total }));
        if (r.situacao === "sem_protocolo" || !r.naFila) {
          if (deNovo.current) {
            deNovo.current = false;
            continue;
          }
          break;
        }
        if (r.situacao === "ocupado") await new Promise((ok) => setTimeout(ok, 8000));
      }
    } finally {
      rodando.current = false;
      setEstado((e) => ({ ...e, rodando: false }));
    }
  }, []);

  useEffect(() => {
    if (!ativo) return;
    void rodar();
    const f = () => void rodar();
    window.addEventListener("maisq:fila", f);
    return () => window.removeEventListener("maisq:fila", f);
  }, [ativo, rodar]);

  return <Contexto.Provider value={ativo ? estado : null}>{children}</Contexto.Provider>;
}
