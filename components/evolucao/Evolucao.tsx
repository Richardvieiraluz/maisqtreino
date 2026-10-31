"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { medidas as armMedidas } from "@/lib/armazenamento";
import { ALUNO_EXEMPLO } from "@/lib/dados-exemplo";
import { useDemo } from "@/lib/demo";
import { dataCurta, listarFotos } from "@/lib/fotos-corpo";
import { DIAS_CURTOS } from "../acesso/PrimeiroAcesso";
import { Logo, Selo } from "../marca";
import { RodapeAbas } from "../RodapeAbas";

// DADOS DE EXEMPLO (protótipo). Viram consultas ao histórico real do aluno.
const MUSCULOS = {
  semana: [["Glúteo", 3], ["Posterior", 2], ["Abdômen", 2], ["Costas", 1], ["Quadríceps", 1]] as [string, number][],
  dia: [["Glúteo", 1], ["Posterior", 1], ["Abdômen", 1]] as [string, number][],
};
const MESES: [string, number][] = [["MAI", 8], ["JUN", 11], ["JUL", 9], ["AGO", 14], ["SET", 12], ["OUT", 13]];
const CARGAS: Record<string, number[]> = {
  "Elevação pélvica": [16, 18, 18, 20, 22, 24],
  "Agachamento goblet": [12, 12, 14, 14, 16, 16],
  "Stiff com halteres": [14, 16, 16, 18, 18, 20],
};
const MEDALHAS: [string, boolean][] = [
  ["1º treino", true],
  ["7 dias", true],
  ["2 semanas", true],
  ["1º recorde", true],
  ["10 treinos", false],
  ["30 dias", false],
  ["Programa completo", false],
  ["24 treinos", false],
];
const DIAS_TREINADOS = [1, 2, 3, 5];
const INTERVALO_MEDIDAS_DIAS = 28;

const tituloSecao: React.CSSProperties = { marginTop: 36 };

function Alternador<T extends string>({ opcoes, valor, onTroca }: { opcoes: [T, string][]; valor: T; onTroca: (v: T) => void }) {
  return (
    <div style={{ display: "flex", border: "1px solid #111" }} role="tablist">
      {opcoes.map(([k, rotulo]) => (
        <button
          type="button"
          key={k}
          role="tab"
          aria-selected={valor === k}
          onClick={() => onTroca(k)}
          style={{ height: 32, padding: "0 10px", border: "none", background: valor === k ? "#111" : "#fff", color: valor === k ? "#fff" : "#111", fontWeight: 800, fontSize: 11, letterSpacing: ".08em", cursor: "pointer" }}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}

export function Evolucao() {
  const demo = useDemo();
  const pausada = demo.estado === "pausada";
  const [modoMapa, setModoMapa] = useState<"semana" | "dia">("semana");
  const [exercicio, setExercicio] = useState("Elevação pélvica");
  const [ultimaFoto, setUltimaFoto] = useState<string | null>(null);
  const [{ registros }] = armMedidas.usar();

  useEffect(() => {
    listarFotos().then((f) => setUltimaFoto(f.length ? f[f.length - 1].data : null));
  }, []);

  const musculos = MUSCULOS[modoMapa];
  const L = CARGAS[exercicio];
  const mn = Math.min(...L) - 4;
  const mx = Math.max(...L) + 2;
  const pts = L.map((v, i) => [Math.round((i * 346) / 5) + 2, Math.round(146 - ((v - mn) / (mx - mn)) * 136)]);
  const mapa = `/assets/bonecos/${demo.sexo}/boneco-${modoMapa === "semana" ? "gluteos-completo" : "posteriores-gluteos"}.svg`;

  const ultimaMedida = registros.length ? registros[registros.length - 1].data : null;
  const proximaMedidaDias = ultimaMedida
    ? Math.max(0, INTERVALO_MEDIDAS_DIAS - Math.floor((Date.now() - new Date(ultimaMedida + "T12:00:00").getTime()) / 86400000))
    : null;

  const linhaCorpo = (href: string, titulo: string, sub: string, ultima: boolean, selo?: string) => (
    <Link
      href={href + demo.qs}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 72, borderBottom: ultima ? "var(--border-strong)" : "1px solid var(--line)", textDecoration: "none", color: "#111" }}
    >
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase" }}>{titulo}</span>
        <span className="texto-apoio">{sub}</span>
      </span>
      {selo && <Selo>{selo}</Selo>}
      <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden>
        <path d="M2 2L8 8L2 14" fill="none" stroke="#111" strokeWidth="2" />
      </svg>
    </Link>
  );

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div className="rolagem" style={{ padding: "20px 20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="numero-grande" style={{ fontSize: 34 }}>
              {ALUNO_EXEMPLO.sequenciaDias}
            </span>
            <span className="rotulo" style={{ fontSize: 10, lineHeight: 1.15 }}>
              DIAS
              <br />
              SEGUIDOS
            </span>
          </div>
        </div>
        <h1 className="titulo-tela" style={{ margin: "24px 0 18px" }}>
          Evolução
        </h1>
        {pausada && (
          <p style={{ border: "var(--border-strong)", padding: "12px 14px", fontSize: 14, lineHeight: 1.4, marginBottom: 20 }}>
            <b style={{ fontWeight: 800 }}>Só leitura.</b> Assinatura pausada: seu histórico fica guardado, mas novos registros voltam quando você reativar.
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 className="titulo-secao">Músculos</h2>
          <Alternador
            opcoes={[
              ["dia", "DIA"],
              ["semana", "SEMANA"],
            ]}
            valor={modoMapa}
            onTroca={setModoMapa}
          />
        </div>
        <div style={{ border: "1px solid #111" }}>
          <img src={mapa} alt="Mapa muscular, frente e costas" style={{ display: "block", width: "100%", height: 250, objectFit: "contain", background: "#fff" }} />
          <div className="rotulo" style={{ borderTop: "1px solid var(--line)", padding: "8px 10px", fontSize: 10, letterSpacing: ".08em", whiteSpace: "normal" }}>
            {modoMapa === "semana" ? "SEMANA · GLÚTEO, POSTERIOR E CORE" : "HOJE · GLÚTEO E POSTERIOR"}
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          {musculos.map(([nome, v], i) => (
            <div key={nome} style={{ display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) 40px", gap: 10, alignItems: "center", height: 44, borderBottom: i === musculos.length - 1 ? "var(--border-strong)" : "1px solid var(--line)" }}>
              <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{nome}</span>
              <div className="trilho">
                <span style={{ width: `${Math.round((v / 3) * 100)}%`, transition: "none" }} />
              </div>
              <span style={{ fontSize: 17, fontWeight: 850, fontStretch: "76%", textAlign: "right" }}>{v}×</span>
            </div>
          ))}
        </div>

        <div style={{ ...tituloSecao, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className="titulo-secao">Treinos por mês</h2>
          <span className="rotulo">2026</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 150, marginTop: 14, borderBottom: "var(--border-strong)" }}>
          {MESES.map(([m, v], i) => {
            const atual = i === MESES.length - 1;
            return (
              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%", gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 850, fontStretch: "76%", textAlign: "center" }}>{v}</span>
                <div style={{ height: Math.round((v / 14) * 110), background: atual ? "var(--accent)" : "#111", border: atual ? "2px solid #111" : "none" }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {MESES.map(([m]) => (
            <span key={m} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "var(--ink-2)" }}>
              {m}
            </span>
          ))}
        </div>

        <h2 className="titulo-secao" style={tituloSecao}>
          Carga por exercício
        </h2>
        <div className="fileira-trilho" style={{ gap: 6, margin: "12px -20px 0" }}>
          {Object.keys(CARGAS).map((n) => (
            <button
              type="button"
              key={n}
              aria-pressed={exercicio === n}
              onClick={() => setExercicio(n)}
              style={{ flex: "none", height: 36, padding: "0 12px", background: exercicio === n ? "#111" : "#fff", color: exercicio === n ? "#fff" : "#111", border: "1px solid #111", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 16 }}>
          <span className="numero-grande" style={{ fontSize: 56, lineHeight: 0.85 }}>
            {L[5]}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>kg</span>
          <span className="texto-apoio" style={{ marginLeft: "auto" }}>
            +{L[5] - L[0]} kg desde o treino 01
          </span>
        </div>
        <div style={{ position: "relative", height: 150, marginTop: 12, borderBottom: "var(--border-strong)" }}>
          <svg width="100%" height="150" viewBox="0 0 350 150" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-label={`Carga de ${exercicio} nos últimos 6 treinos`}>
            <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#111" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          {pts.map(([x, y], i) => {
            const ultimo = i === pts.length - 1;
            const s = ultimo ? 16 : 8;
            return (
              <div
                key={i}
                style={{ position: "absolute", left: `${(x / 350) * 100}%`, top: y, width: s, height: s, margin: `-${s / 2}px 0 0 -${s / 2}px`, background: ultimo ? "#fff" : "#111", border: ultimo ? "3px solid #111" : "none" }}
              />
            );
          })}
        </div>
        <div className="rotulo" style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, letterSpacing: ".08em" }}>
          <span>TREINO 01</span>
          <span>TREINO 06</span>
        </div>

        <h2 className="titulo-secao" style={tituloSecao}>
          Sequência e medalhas
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
          <span className="numero-grande" style={{ fontSize: 64, lineHeight: 0.85 }}>
            {ALUNO_EXEMPLO.sequenciaDias}
          </span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="rotulo">DIAS SEGUIDOS · RECORDE {ALUNO_EXEMPLO.sequenciaDias}</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {DIAS_CURTOS.map((l, i) => {
                const treinou = DIAS_TREINADOS.includes(i);
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ width: "100%", height: 18, background: treinou ? "#111" : "#fff", border: treinou ? "none" : i === 6 ? "2px solid #111" : "1px solid var(--line)" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-2)" }}>{l}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.4 }}>Dia de descanso do plano não quebra a sequência.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px 8px", marginTop: 20 }}>
          {MEDALHAS.map(([nome, ganhou]) => (
            <div key={nome} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 8 }} aria-label={`${nome}${ganhou ? ", conquistada" : ""}`}>
              <div style={{ width: 36, height: 36, transform: "rotate(45deg)", background: ganhou ? "#111" : "#fff", border: ganhou ? "3px solid #111" : "2px solid var(--line)" }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textAlign: "center", lineHeight: 1.2, color: ganhou ? "#111" : "var(--ink-2)" }}>{nome}</span>
            </div>
          ))}
        </div>

        <h2 className="titulo-secao" style={{ ...tituloSecao, marginBottom: 6 }}>
          Corpo
        </h2>
        {linhaCorpo("/evolucao/fotos", "Fotos do corpo", ultimaFoto ? `Última: ${dataCurta(ultimaFoto)} · frente, lado e costas` : "Frente, lado e costas", false, "Só você vê")}
        {linhaCorpo(
          "/evolucao/medidas",
          "Medidas",
          proximaMedidaDias == null ? "A cada 4 semanas" : proximaMedidaDias === 0 ? "Hora de medir de novo" : `Próxima em ${proximaMedidaDias} dias · a cada 4 semanas`,
          true,
        )}
      </div>
      <RodapeAbas />
    </main>
  );
}
