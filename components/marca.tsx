// Peças pequenas da identidade, usadas em todas as telas.

import type { ReactNode } from "react";

export function Logo({ variante = "claro" }: { variante?: "claro" | "escuro" | "amarelo" }) {
  const classe = variante === "claro" ? "logo" : `logo logo--${variante}`;
  return (
    <div className={classe} aria-label="+Q Treino">
      <span className="logo__q">+Q</span>
      <span className="logo__nome">TREINO</span>
    </div>
  );
}

export function Selo({ children, pequeno = false }: { children: ReactNode; pequeno?: boolean }) {
  return <span className={pequeno ? "selo selo--pequeno" : "selo"}>{children}</span>;
}

/** Título com uma palavra em destaque amarelo. Sem destaque quando bloqueado. */
export function TituloDestaque({
  texto,
  palavra,
  semDestaque = false,
}: {
  texto: string;
  palavra: string;
  semDestaque?: boolean;
}) {
  const i = texto.toLowerCase().lastIndexOf(palavra.toLowerCase());
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <span className={semDestaque ? undefined : "destaque"}>{texto.slice(i, i + palavra.length)}</span>
      {texto.slice(i + palavra.length)}
    </>
  );
}

/** Cadeado em traço preto de 2 px. tamanho = "card" (18×22) ou "grande" (22×26). */
export function Cadeado({ tamanho = "card" }: { tamanho?: "card" | "grande" }) {
  const g = tamanho === "grande";
  const w = g ? 22 : 18;
  const h = g ? 26 : 22;
  const alca = g ? 12 : 10;
  const corpo = g ? 15 : 13;
  return (
    <span className="cadeado" style={{ width: w, height: h }} aria-label="Bloqueado">
      <i style={{ left: (w - alca) / 2, width: alca, height: alca, borderRadius: `${alca / 2 + 1}px ${alca / 2 + 1}px 0 0` }} />
      <i style={{ width: w, height: corpo }} />
    </span>
  );
}

export function Check({ tamanho = 26 }: { tamanho?: number }) {
  return (
    <span className="check" style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.46) }} aria-label="Concluído">
      ✓
    </span>
  );
}

export function Segmentos({ total, atual }: { total: number; atual: number }) {
  return (
    <div className="segmentos" aria-label={`Exercício ${atual + 1} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < atual ? "feito" : i === atual ? "atual" : undefined} />
      ))}
    </div>
  );
}

export function BarraStatus() {
  // Espaço da barra de status do celular (o protótipo mostra "9:41").
  // No app instalado, quem ocupa é o próprio sistema.
  return <div className="topo-seguro" />;
}

export const doisDigitos = (n: number) => String(n).padStart(2, "0");
