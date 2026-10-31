"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { EXPLICACOES_OUTRAS, FILEIRAS_VITRINE } from "@/lib/master-exemplo";

const ABAS = [
  { chave: "painel", rotulo: "Painel", href: "/master" },
  { chave: "funil", rotulo: "Funil", href: "/master/funil" },
  { chave: "alunos", rotulo: "Alunos", href: "/master/alunos" },
  { chave: "conteudo", rotulo: "Conteúdo", href: "" },
];

function abaDe(caminho: string) {
  if (caminho.startsWith("/master/funil")) return "funil";
  if (caminho.startsWith("/master/alunos")) return "alunos";
  if (/\/master\/(protocolos|explicacoes|vitrine)/.test(caminho)) return "conteudo";
  return "painel";
}

const hoje = () => {
  const d = new Date();
  const dias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return `${dias[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${meses[d.getMonth()]}`;
};

/** Moldura do Master: cabeçalho, área cinza e rodapé com 4 abas (Conteúdo abre um menu). */
export function LayoutMaster({ children, voltar }: { children: ReactNode; voltar?: string }) {
  const caminho = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const ativa = menu ? "conteudo" : abaDe(caminho);
  const [data] = useState(hoje);

  return (
    <main className="app" style={{ background: "var(--bg-soft)" }}>
      <div className="topo-seguro" style={{ background: "#fff" }} />
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", background: "#fff", borderBottom: "1px solid #111" }}>
        <div className="logo">
          <span className="logo__q">+Q</span>
          <span className="logo__nome">MASTER</span>
        </div>
        {voltar ? (
          <button
            type="button"
            onClick={() => router.push(voltar)}
            style={{ height: 36, padding: "0 12px", background: "#fff", border: "2px solid #111", fontWeight: 800, fontSize: 11, letterSpacing: ".08em", cursor: "pointer" }}
          >
            VOLTAR
          </button>
        ) : (
          <span className="rotulo" suppressHydrationWarning>
            {data}
          </span>
        )}
      </div>
      <div style={{ flex: "none", background: "var(--ink)", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", padding: "6px 20px" }}>DADOS DE EXEMPLO · ENTRAM OS REAIS COM O BANCO E A EDUZZ</div>
      <div className="rolagem">{children}</div>
      <nav className="abas" aria-label="Navegação do Master">
        {ABAS.map((a) =>
          a.chave === "conteudo" ? (
            <a
              key={a.chave}
              href="#conteudo"
              role="button"
              aria-current={ativa === a.chave ? "page" : undefined}
              aria-expanded={menu}
              onClick={(e) => {
                e.preventDefault();
                setMenu(!menu);
              }}
            >
              <span>{a.rotulo}</span>
              <i />
            </a>
          ) : (
            <Link key={a.chave} href={a.href} aria-current={ativa === a.chave ? "page" : undefined} onClick={() => setMenu(false)}>
              <span>{a.rotulo}</span>
              <i />
            </Link>
          ),
        )}
      </nav>
      {menu && (
        <>
          <div className="folha-fundo" style={{ bottom: 64 }} onClick={() => setMenu(false)} />
          <div className="folha" style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px))", padding: "16px 20px", gap: 8 }} role="menu">
            <div className="rotulo">CONTEÚDO</div>
            {[
              ["Protocolos e treinos", "186", "/master/protocolos"],
              ["Explicações em lote", `${EXPLICACOES_OUTRAS.pendente} a revisar`, "/master/explicacoes"],
              ["Vitrine", `${FILEIRAS_VITRINE.length} fileiras`, "/master/vitrine"],
            ].map(([rotulo, meta, href]) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setMenu(false)}
                className="botao botao--opcao"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "#111" }}
              >
                <span>{rotulo}</span>
                <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>{meta}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export const cartao: React.CSSProperties = { background: "#fff", border: "1px solid #111" };
export const pagina: React.CSSProperties = { padding: "20px 20px 28px" };

export function TituloMaster({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <>
      <h1 className="titulo-tela" style={{ marginBottom: sub ? 4 : 14 }}>
        {children}
      </h1>
      {sub && <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 14 }}>{sub}</p>}
    </>
  );
}

/** Seletor segmentado (períodos, dias, abas). */
export function Segmentado<T extends string | number>({ opcoes, valor, onTroca, altura = 40, render }: { opcoes: T[]; valor: T; onTroca: (v: T) => void; altura?: number; render?: (v: T) => ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }} role="tablist">
      {opcoes.map((o, i) => (
        <button
          type="button"
          key={String(o)}
          role="tab"
          aria-selected={valor === o}
          onClick={() => onTroca(o)}
          style={{
            height: altura,
            background: valor === o ? "#111" : "#fff",
            color: valor === o ? "#fff" : "#111",
            border: "2px solid #111",
            marginLeft: i ? -2 : 0,
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: ".08em",
            cursor: "pointer",
          }}
        >
          {render ? render(o) : String(o)}
        </button>
      ))}
    </div>
  );
}
