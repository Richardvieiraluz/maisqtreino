"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/lib/demo";
import { useAvisoRapido } from "../AvisoRapido";
import { Cadeado, Check, doisDigitos, Selo } from "../marca";
import { BotaoVoltar } from "../quiz/pecas";

// Regiões e fases do design. Descrições e durações são EXEMPLO: virão dos
// protocolos de reabilitação e de dor do Richard (16 treinos no sistema atual).
const REGIOES = {
  lombar: { prep: "da", nome: "lombar", boneco: "lombar", intro: "Dor na parte de baixo das costas, ao sentar, levantar ou carregar peso." },
  joelho: { prep: "do", nome: "joelho", boneco: "quadriceps", intro: "Dor ao subir escada, agachar ou depois de correr." },
  ombro: { prep: "do", nome: "ombro", boneco: "deltoide", intro: "Dor ao levantar o braço, dormir de lado ou empurrar." },
  quadril: { prep: "do", nome: "quadril", boneco: "abdutores-gluteo-medio", intro: "Dor na lateral ou na frente do quadril, ao caminhar ou cruzar as pernas." },
};
type Regiao = keyof typeof REGIOES;

const FASES: [string, string, string][] = [
  ["Agudo", "Alívio da dor com movimentos leves e respiração.", "2 SEMANAS · 10 MIN"],
  ["Crônico", "Força aos poucos, sem piorar a dor.", "3 SEMANAS · 20 MIN"],
  ["Mobilidade", "Devolve a amplitude do movimento.", "2 SEMANAS · 15 MIN"],
  ["Sensório-motor", "Equilíbrio e controle, para não voltar.", "3 SEMANAS · 20 MIN"],
];
const FASE_ATUAL = 1; // exemplo: fase 2 de 4

/** Antes do treino da trilha: dor de 0 a 10 decide se treina, faz a versão de alívio ou para. */
function ChecagemDor({ regiao, onVoltar }: { regiao: string; onVoltar: () => void }) {
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const [dor, setDor] = useState(2);
  const veredito =
    dor <= 3
      ? { icone: "✓", rotulo: "PODE TREINAR", texto: `Dor baixa. Siga o treino da fase ${FASE_ATUAL + 1} e pare se passar de 3.`, botao: "Treinar agora", forte: false }
      : dor <= 6
        ? { icone: "!", rotulo: "TREINO ADAPTADO", texto: "Hoje fica só a parte de alívio: 10 minutos de mobilidade e respiração.", botao: "Fazer versão de alívio", forte: true }
        : { icone: "!", rotulo: "PARE HOJE", texto: "Dor alta não é para treinar por cima. Descanse e procure um profissional de saúde se não melhorar em 48 horas.", botao: "Voltar ao início", forte: true };

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: "none", display: "flex", alignItems: "center", height: 48, padding: "8px 20px 0" }}>
        <BotaoVoltar onClick={onVoltar} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 20px calc(24px + env(safe-area-inset-bottom, 0px))", overflowY: "auto" }}>
        <div className="rotulo">ANTES DE COMEÇAR</div>
        <h1 style={{ margin: "8px 0 10px", fontSize: 36, fontWeight: 850, fontStretch: "70%", letterSpacing: "-0.02em", lineHeight: 0.94, textTransform: "uppercase" }}>
          Como está {regiao === "lombar" ? "a" : "o"} {regiao} <span className="destaque">hoje</span>?
        </h1>
        <p className="texto" style={{ color: "var(--ink-2)", marginBottom: 20 }}>
          De 0 (nada) a 10 (a pior dor que você já sentiu).
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 14 }}>
          <span className="numero-grande" style={{ fontSize: 64, lineHeight: 0.85 }} aria-live="polite">
            {dor}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, paddingBottom: 4 }}>de 10</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(11, minmax(0, 1fr))", gap: 3 }} role="radiogroup" aria-label="Nível de dor">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              type="button"
              key={n}
              role="radio"
              aria-checked={n === dor}
              onClick={() => setDor(n)}
              style={{ height: 48, background: n === dor ? "#111" : "#fff", color: n === dor ? "var(--accent)" : "#111", border: n === dor ? "2px solid #111" : "1px solid #111", fontWeight: 900, fontSize: 15, fontStretch: "70%", cursor: "pointer", padding: 0 }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="rotulo" style={{ display: "flex", justifyContent: "space-between", marginTop: 6, letterSpacing: ".08em" }}>
          <span>NADA</span>
          <span>MUITO FORTE</span>
        </div>
        <div style={{ marginTop: 22, border: veredito.forte ? "var(--border-strong)" : "1px solid #111", padding: 16, display: "flex", flexDirection: "column", gap: 8, background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="aviso__icone" style={{ fontSize: 13 }}>
              {veredito.icone}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em" }}>{veredito.rotulo}</span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.45 }}>{veredito.texto}</p>
        </div>
        <button
          type="button"
          className="botao botao--primario"
          style={{ marginTop: "auto", flex: "none" }}
          onClick={() =>
            dor >= 7 ? router.push(`/${demo.qs}`) : aviso.mostrar(dor <= 3 ? "O treino da fase entra com os protocolos de reabilitação." : "A versão de alívio entra com os protocolos de reabilitação.")
          }
        >
          {veredito.botao}
        </button>
      </div>
      {aviso.elemento}
    </main>
  );
}

export function TrilhaLesoes() {
  const demo = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const inicial = (params.get("regiao") as Regiao) in REGIOES ? (params.get("regiao") as Regiao) : "lombar";
  const [regiao, setRegiao] = useState<Regiao>(inicial);
  const [checando, setChecando] = useState(false);
  const pausada = demo.estado === "pausada";
  const bloqueado = demo.estado !== "assinante";
  const r = REGIOES[regiao];

  if (checando) return <ChecagemDor regiao={r.nome} onVoltar={() => setChecando(false)} />;

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: "none", display: "flex", justifyContent: "space-between", alignItems: "center", height: 48, padding: "8px 20px 0" }}>
        <BotaoVoltar onClick={() => router.push(`/${demo.qs}`)} />
        <span className="rotulo">LESÕES · 4 TRILHAS</span>
      </div>
      <div className="rolagem" style={{ padding: "4px 20px 20px" }}>
        <h1 className="titulo-tela" style={{ marginBottom: 14 }}>
          Trilha {r.prep} <span className={bloqueado ? undefined : "destaque"}>{r.nome}</span>
        </h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }} role="tablist">
          {(Object.keys(REGIOES) as Regiao[]).map((k) => (
            <button
              type="button"
              key={k}
              role="tab"
              aria-selected={regiao === k}
              onClick={() => setRegiao(k)}
              style={{ height: 44, padding: 0, background: "#fff", border: regiao === k ? "3px solid #111" : "1px solid #111", fontWeight: 800, fontSize: 12, letterSpacing: ".06em", cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap" }}
            >
              {REGIOES[k].nome}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr)", gap: 14, alignItems: "center", marginTop: 14 }}>
          <img src={`/assets/bonecos/${demo.sexo}/boneco-${r.boneco}.svg`} alt={`Mapa muscular: ${r.nome}`} style={{ display: "block", width: 150, height: 126, objectFit: "contain", background: "#fff", border: "1px solid #111" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="rotulo">REGIÃO</span>
            <span style={{ fontSize: 15, lineHeight: 1.4 }}>{r.intro}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "22px 0 2px" }}>
          <span className="rotulo">4 FASES</span>
          <span className="rotulo">{bloqueado ? "SÓ PARA ASSINANTES" : `FASE ${FASE_ATUAL + 1} DE 4`}</span>
        </div>
        {FASES.map(([nome, desc, meta], i) => {
          const feita = !bloqueado && i < FASE_ATUAL;
          const atual = !bloqueado && i === FASE_ATUAL;
          const cor = bloqueado || i > FASE_ATUAL ? "var(--ink-2)" : "#111";
          return (
            <div
              key={nome}
              style={{
                display: "grid",
                gridTemplateColumns: "40px minmax(0, 1fr) 30px",
                gap: 10,
                alignItems: "center",
                padding: atual || bloqueado ? "12px 10px" : "14px 0",
                margin: atual ? "8px 0" : bloqueado ? "0 0 6px" : 0,
                background: bloqueado ? "var(--track)" : "#fff",
                border: atual ? "var(--border-strong)" : "none",
                borderBottom: atual ? "var(--border-strong)" : bloqueado ? "1px solid var(--track)" : i === FASES.length - 1 ? "var(--border-strong)" : "1px solid var(--line)",
              }}
            >
              <span className="numero-grande" style={{ fontSize: 30, color: cor }}>
                {doisDigitos(i + 1)}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "76%", letterSpacing: "-0.015em", textTransform: "uppercase", lineHeight: 1, color: cor, whiteSpace: "nowrap" }}>{nome}</span>
                  {atual && <Selo pequeno>Agora</Selo>}
                </div>
                <span style={{ fontSize: 13, lineHeight: 1.35, color: "var(--ink-2)" }}>{desc}</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: cor, whiteSpace: "nowrap" }}>{feita ? "CONCLUÍDA" : meta}</span>
              </div>
              {feita && <Check tamanho={26} />}
              {bloqueado && (
                <span style={{ justifySelf: "center" }}>
                  <Cadeado />
                </span>
              )}
            </div>
          );
        })}
        <div className="aviso" style={{ marginTop: 18, flexDirection: "row", gap: 12, padding: 14 }}>
          <span className="aviso__icone">!</span>
          <p style={{ fontSize: 15, lineHeight: 1.45 }}>A trilha não substitui avaliação. Dor forte ou que piora: pare e procure um profissional de saúde.</p>
        </div>
      </div>
      <div style={{ flex: "none", padding: "12px 20px calc(24px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
        {bloqueado && (
          <span style={{ fontSize: 13, color: "var(--ink-2)", textAlign: "center" }}>
            {pausada ? "Sua assinatura está pausada. Reative para seguir a trilha." : "As trilhas de lesões fazem parte da assinatura."}
          </span>
        )}
        <button
          type="button"
          className={bloqueado ? "botao botao--destaque" : "botao botao--primario"}
          onClick={() => (bloqueado ? router.push(`${pausada ? "/reativar" : "/oferta"}${demo.qs}`) : setChecando(true))}
        >
          {bloqueado ? (pausada ? "Reativar assinatura" : "Assinar para liberar") : `Continuar a fase ${FASE_ATUAL + 1}`}
        </button>
      </div>
    </main>
  );
}
