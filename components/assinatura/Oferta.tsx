"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRECOS, TREINADOR } from "@/lib/config";
import { useDemo } from "@/lib/demo";
import { useAvisoRapido } from "../AvisoRapido";
import { Logo } from "../marca";

const INCLUIDO = ["Protocolo de 24 treinos sob medida", "Todos os programas, sem extra", "Vitrine completa: casa e academia", "Minha voz guiando cada exercício", "Mapa muscular, fotos e medidas"];

const Fechar = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-label="Fechar" style={{ width: 44, height: 44, marginRight: -11, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <path d="M4 4L18 18M18 4L4 18" stroke="#111" strokeWidth="2" />
    </svg>
  </button>
);

/** Tela amarela da oferta: a única tela amarela do app. */
export function Oferta() {
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const [plano, setPlano] = useState<"anual" | "mensal">("anual");
  const programa = demo.estado === "programa";

  const planos = [
    { k: "anual" as const, nome: "ANUAL", selo: `−R$ ${PRECOS.economiaAnual} NO ANO`, preco: PRECOS.anual, nota: `12 × R$ ${PRECOS.anual}. Cobrado por ano` },
    {
      k: "mensal" as const,
      nome: "MENSAL",
      selo: programa ? "50% NO 1º MÊS" : "",
      preco: programa ? PRECOS.mensalComPrograma : PRECOS.mensal,
      nota: programa ? `No 1º mês. Depois, R$ ${PRECOS.mensal} por mês` : "Cancele quando quiser",
    },
  ];

  return (
    <main className="app" style={{ background: "var(--accent)" }}>
      <div className="topo-seguro" />
      <div className="rolagem" style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 20px calc(24px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", flex: "1 0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Logo variante="amarelo" />
            <Fechar onClick={() => router.back()} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 120px", gap: 12, alignItems: "end", marginTop: 16 }}>
            <h1 style={{ fontSize: 44, fontWeight: 850, fontStretch: "66%", letterSpacing: "-0.02em", lineHeight: 0.9, textTransform: "uppercase" }}>Treinos prontos, montados por mim, com valor acessível.</h1>
            <img
              src="/assets/fotos/richard-agachamento.png"
              alt={TREINADOR.nome}
              style={{ display: "block", width: 120, height: 200, objectFit: "cover", objectPosition: "center bottom", borderBottom: "var(--border-strong)", mixBlendMode: "multiply" }}
            />
          </div>
          <div style={{ marginTop: 20 }}>
            {INCLUIDO.map((t, i) => (
              <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: i === INCLUIDO.length - 1 ? "var(--border-strong)" : "1px solid var(--line)" }}>
                <span style={{ flex: "none", width: 22, height: 22, borderRadius: "50%", background: "#fff", border: "2px solid #111", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 10 }}>✓</span>
                <span style={{ fontSize: 15, lineHeight: 1.3 }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 20 }} role="radiogroup" aria-label="Plano">
            {planos.map((p) => {
              const on = plano === p.k;
              return (
                <button
                  type="button"
                  key={p.k}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPlano(p.k)}
                  style={{ position: "relative", textAlign: "left", background: "#fff", border: on ? "3px solid #111" : "1px solid #111", padding: on ? 12 : 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6, minHeight: 148 }}
                >
                  <span className="rotulo">{p.nome}</span>
                  {p.selo && (
                    <span className="selo selo--pequeno" style={{ alignSelf: "flex-start" }}>
                      {p.selo}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: "auto", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>R$</span>
                    <span className="numero-grande" style={{ fontSize: 40, lineHeight: 0.9 }}>
                      {p.preco}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>/mês</span>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{p.nota}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="botao botao--primario"
            style={{ marginTop: 20 }}
            onClick={() => aviso.mostrar("Vai para o checkout da Eduzz. Entra com a integração de pagamento.")}
          >
            {plano === "anual" ? "Assinar o anual" : "Assinar o mensal"}
          </button>
        </div>
      </div>
      {aviso.elemento}
    </main>
  );
}

const MANTIDO: [string, string][] = [
  ["Treinos feitos", "6 de 24"],
  ["Recordes", "3"],
  ["Sequência máxima", "12 dias"],
  ["Fotos do corpo", "2 datas"],
  ["Medidas", "4 registros"],
];

/** Assinatura pausada: o histórico está guardado. Valores de exemplo. */
export function Reativar() {
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 20px calc(24px + env(safe-area-inset-bottom, 0px))", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo />
          <Fechar onClick={() => router.push(`/perfil${demo.qs}`)} />
        </div>
        <div className="rotulo" style={{ marginTop: 40 }}>
          ASSINATURA PAUSADA DESDE 02 OUT
        </div>
        <h1 className="titulo-tela" style={{ margin: "8px 0 10px", fontSize: 48, fontStretch: "68%", lineHeight: 0.9 }}>
          Seu histórico está guardado
        </h1>
        <p className="texto" style={{ color: "var(--ink-2)", marginBottom: 20 }}>
          Reative e o protocolo continua do treino 07, com as cargas que você registrou.
        </p>
        {MANTIDO.map(([k, v], i) => (
          <div key={k} className="lista-marca__linha" style={i === MANTIDO.length - 1 ? { borderBottom: "var(--border-strong)" } : undefined}>
            <span className="lista-marca__chave">{k}</span>
            <span className="lista-marca__valor">{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto", paddingTop: 24 }}>
          <button type="button" className="botao botao--destaque" onClick={() => aviso.mostrar("Vai para o checkout da Eduzz para reativar.")}>
            Reativar assinatura
          </button>
          <button type="button" className="botao botao--secundario" onClick={() => aviso.mostrar("Abre a troca de cartão na Eduzz.")}>
            Atualizar cartão
          </button>
        </div>
      </div>
      {aviso.elemento}
    </main>
  );
}
