"use client";

import type { Dispatch } from "react";
import { bonecoDe, type Sexo } from "@/lib/midia";
import type { Acao, Avaliacao as Nota } from "@/lib/sessao";
import type { TreinoSessao } from "@/lib/tipos";
import { doisDigitos, Logo } from "../marca";

const OPCOES: [Nota, string, string][] = [
  ["facil", "Fácil", "Sobrou energia. Dá para subir a carga."],
  ["ideal", "Ideal", "Cansativo na medida certa."],
  ["dificil", "Difícil", "Não consegui manter a execução."],
];

export function Avaliacao({ escolha, despachar }: { escolha: Nota | null; despachar: Dispatch<Acao> }) {
  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px calc(24px + env(safe-area-inset-bottom, 0px))", overflowY: "auto" }}>
        <Logo />
        <h1 className="titulo-tela" style={{ margin: "40px 0 12px", fontSize: 44, fontStretch: "68%" }}>
          Como foi o <span className="destaque">treino</span>?
        </h1>
        <p className="texto" style={{ color: "var(--ink-2)", marginBottom: 24 }}>
          Fácil sobe a carga sugerida na próxima vez. Dois difíceis seguidos tiram 1 série de cada exercício.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="radiogroup" aria-label="Avaliação do treino">
          {OPCOES.map(([k, rotulo, sub]) => {
            const sel = escolha === k;
            return (
              <button
                type="button"
                key={k}
                role="radio"
                aria-checked={sel}
                onClick={() => despachar({ t: "avaliar", valor: k })}
                style={{
                  position: "relative",
                  textAlign: "left",
                  padding: sel ? "16px 64px 16px 16px" : "18px 66px 18px 18px",
                  background: "#fff",
                  border: sel ? "3px solid #111" : "1px solid #111",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 26, fontWeight: 850, fontStretch: "74%", letterSpacing: "-0.015em", textTransform: "uppercase", lineHeight: 1 }}>{rotulo}</span>
                <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{sub}</span>
                {sel && (
                  <span className="check" style={{ position: "absolute", right: 16, top: "50%", marginTop: -15, width: 30, height: 30, fontSize: 14 }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="botao botao--primario"
          style={{ marginTop: "auto" }}
          disabled={!escolha}
          onClick={() => despachar({ t: "verResumo" })}
        >
          Ver resumo
        </button>
      </div>
    </main>
  );
}

export function Resumo({
  treino,
  sexo,
  minutos,
  exerciciosFeitos,
  volume,
  recordes,
  sequencia,
  onStories,
  onInicio,
}: {
  treino: TreinoSessao;
  sexo: Sexo;
  minutos: number;
  exerciciosFeitos: number;
  volume: number;
  recordes: number;
  sequencia: number;
  onStories: () => void;
  onInicio: () => void;
}) {
  const linhas: [string, string][] = [
    ["Duração", `${minutos} min`],
    ["Exercícios", `${exerciciosFeitos} de ${treino.exercicios.length}`],
    ["Volume", `${volume.toLocaleString("pt-BR")} kg`],
    ["Recordes", String(recordes)],
  ];
  return (
    <main className="app app--escuro">
      <div className="topo-seguro" />
      <div className="rolagem" style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px calc(24px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", flex: 1 }}>
          <Logo variante="escuro" />
          <div className="rotulo" style={{ marginTop: 32, color: "var(--ink-on-dark-2)", whiteSpace: "normal" }}>
            PROTOCOLO {doisDigitos(treino.posicaoProtocolo)} / {treino.totalProtocolo} · {treino.nome.toUpperCase()}
          </div>
          <h1 className="titulo-capa" style={{ margin: "8px 0 20px" }}>
            Treino <span style={{ color: "var(--accent)" }}>feito</span>.
          </h1>
          <div>
            {linhas.map(([k, v], i) => (
              <div
                key={k}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "11px 0", borderBottom: i === linhas.length - 1 ? "3px solid #fff" : "1px solid #5C5C5C" }}
              >
                <span style={{ fontSize: 14, color: "var(--ink-on-dark-2)" }}>{k}</span>
                <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "76%" }}>{v}</span>
              </div>
            ))}
          </div>
          <img
            src={bonecoDe("posterior glúteo", sexo)}
            alt="Mapa muscular do treino"
            style={{ display: "block", width: "100%", height: 150, objectFit: "contain", background: "#fff", marginTop: 14 }}
          />
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="numero-grande" style={{ fontSize: 64, lineHeight: 0.85 }}>
                {sequencia}
              </span>
              <span className="rotulo" style={{ color: "var(--ink-on-dark-2)", lineHeight: 1.2 }}>
                DIAS
                <br />
                SEGUIDOS
              </span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, transform: "rotate(45deg)", background: "#fff", border: "3px solid #fff", flex: "none" }} aria-hidden />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", color: "var(--ink-on-dark-2)" }}>MEDALHA NOVA</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>2 semanas seguidas</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto", paddingTop: 28 }}>
            <button type="button" className="botao botao--branco" onClick={onStories}>
              Criar stories
            </button>
            <button type="button" className="botao botao--contorno-claro" onClick={onInicio}>
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
