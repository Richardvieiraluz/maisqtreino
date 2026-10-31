"use client";

import type { ReactNode } from "react";
import { Check, doisDigitos } from "../marca";

/** Topo do quiz: barra de 10 segmentos, voltar e contador. */
export function CabecalhoQuiz({ passo, total, onVoltar, voltarApagado }: { passo: number; total: number; onVoltar: () => void; voltarApagado: boolean }) {
  return (
    <div style={{ flex: "none", padding: "16px 20px 0" }}>
      <div className="segmentos">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i < passo ? "feito" : i === passo ? "atual" : undefined} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 48 }}>
        <BotaoVoltar onClick={onVoltar} apagado={voltarApagado} />
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink-2)" }}>
          {doisDigitos(passo + 1)} / {total}
        </span>
      </div>
    </div>
  );
}

export function BotaoVoltar({ onClick, apagado = false }: { onClick: () => void; apagado?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Voltar"
      disabled={apagado}
      style={{ width: 44, height: 44, marginLeft: -11, background: "none", border: "none", cursor: apagado ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: apagado ? 0.25 : 1 }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <path d="M14 4L7 11L14 18" fill="none" stroke="#111" strokeWidth="2" />
      </svg>
    </button>
  );
}

export function TituloQuiz({ partes, tamanho = 36 }: { partes: [string, string, string]; tamanho?: number }) {
  return (
    <h1
      style={{ margin: "0 0 10px", fontSize: tamanho, fontWeight: 850, fontStretch: "70%", letterSpacing: "-0.02em", lineHeight: 0.94, textTransform: "uppercase", textWrap: "pretty" }}
    >
      {partes[0]}
      <span className="destaque">{partes[1]}</span>
      {partes[2]}
    </h1>
  );
}

/** Card de opção: borda 1 px; selecionado com borda 3 px (padding 2 px menor) e ✓ amarelo. */
export function CardOpcao({
  selecionado,
  onClick,
  children,
  padding = 16,
  direita = 62,
  checkTamanho = 30,
  style,
}: {
  selecionado: boolean;
  onClick: () => void;
  children: ReactNode;
  padding?: number;
  direita?: number;
  checkTamanho?: number;
  style?: React.CSSProperties;
}) {
  const p = selecionado ? padding - 2 : padding;
  const d = selecionado ? direita - 2 : direita;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selecionado}
      onClick={onClick}
      style={{
        position: "relative",
        textAlign: "left",
        padding: `${p}px ${d}px ${p}px ${p}px`,
        background: "#fff",
        border: selecionado ? "3px solid #111" : "1px solid #111",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
        ...style,
      }}
    >
      {children}
      {selecionado && (
        <span style={{ position: "absolute", right: 16, top: "50%", marginTop: -checkTamanho / 2 }}>
          <Check tamanho={checkTamanho} />
        </span>
      )}
    </button>
  );
}

export const estiloNomeOpcao: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 850,
  fontStretch: "74%",
  letterSpacing: "-0.015em",
  textTransform: "uppercase",
  lineHeight: 1,
};
