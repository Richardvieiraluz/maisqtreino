"use client";

import { Logo } from "../marca";
import { RodapeAbas } from "../RodapeAbas";

/** Abas que entram nas próximas etapas (Meu plano, Evolução, Perfil). */
export function AbaEmBreve({ titulo, nota }: { titulo: string; nota: string }) {
  return (
    <main className="app">
      <div className="topo-seguro" />
      <div className="rolagem" style={{ padding: "20px 20px 8px" }}>
        <div style={{ marginBottom: 40 }}>
          <Logo />
        </div>
        <h1 className="titulo-tela" style={{ marginBottom: 12 }}>
          {titulo}
        </h1>
        <p className="texto" style={{ borderTop: "var(--border-strong)", paddingTop: 12, color: "var(--ink-2)" }}>
          {nota}
        </p>
      </div>
      <RodapeAbas />
    </main>
  );
}
