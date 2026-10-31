"use client";

import { useEffect, useRef, useState } from "react";
import { EQUIPAMENTOS } from "@/lib/quiz";
import { Check } from "../marca";

const rolagem: React.CSSProperties = { flex: 1, overflowY: "auto", padding: "8px 20px calc(24px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column" };
const tituloEstilo: React.CSSProperties = { margin: "0 0 10px", fontSize: 36, fontWeight: 850, fontStretch: "70%", letterSpacing: "-0.02em", lineHeight: 0.94, textTransform: "uppercase" };

/** Espaço reservado para a foto real de cada item (entra com o acervo de fotos). */
function FotoItem({ altura, rotulo = "FOTO DO ITEM" }: { altura: number; rotulo?: string }) {
  return (
    <span style={{ position: "absolute", inset: 0, background: "var(--bg-soft)", display: "block" }}>
      <span style={{ position: "absolute", left: 5, bottom: 4, fontSize: altura > 60 ? 7 : 6, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink-2)" }}>{rotulo}</span>
    </span>
  );
}

// ── Caminho 2: marcar numa lista ────────────────────────────────────────────

export function ListaEquipamentos({ marcados, onAlternar, onContinuar }: { marcados: string[]; onAlternar: (i: string) => void; onContinuar: () => void }) {
  return (
    <div style={rolagem}>
      <h1 style={tituloEstilo}>
        Marque o que você <span className="destaque">tem</span>
      </h1>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <span style={{ fontSize: 15, color: "var(--ink-2)" }}>Só o que dá para usar hoje.</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em" }}>
          {marcados.length} {marcados.length === 1 ? "MARCADO" : "MARCADOS"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px 8px" }}>
        {EQUIPAMENTOS.map((item) => {
          const sel = marcados.includes(item);
          return (
            <button
              type="button"
              key={item}
              role="checkbox"
              aria-checked={sel}
              onClick={() => onAlternar(item)}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}
            >
              <span style={{ position: "relative", display: "block", width: "100%", height: 96, outline: sel ? "3px solid #111" : "1px solid var(--line)", outlineOffset: sel ? -3 : -1 }}>
                <FotoItem altura={96} />
                {sel && (
                  <span style={{ position: "absolute", right: 5, top: 5 }}>
                    <Check tamanho={24} />
                  </span>
                )}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15 }}>{item}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="botao botao--primario" style={{ marginTop: 24, flex: "none" }} disabled={!marcados.length} onClick={onContinuar}>
        Continuar
      </button>
    </div>
  );
}

// ── Caminho 3: mandar fotos ────────────────────────────────────────────────

const Canto = ({ pos }: { pos: React.CSSProperties }) => <div style={{ position: "absolute", width: 28, height: 28, ...pos }} />;

export function FotoEspaco({ onFoto }: { onFoto: (arquivo: File) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const aoEscolher = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onFoto(f);
  };
  return (
    <div style={rolagem}>
      <h1 style={tituloEstilo}>
        Fotografe seu <span className="destaque">espaço</span>
      </h1>
      <p className="texto" style={{ margin: "0 0 16px", color: "var(--ink-2)" }}>
        A gente identifica os equipamentos e você confere antes de salvar.
      </p>
      <div style={{ position: "relative", height: 270, background: "var(--bg-soft)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", flex: "none" }}>
        <Canto pos={{ left: 14, top: 14, borderLeft: "3px solid #111", borderTop: "3px solid #111" }} />
        <Canto pos={{ right: 14, top: 14, borderRight: "3px solid #111", borderTop: "3px solid #111" }} />
        <Canto pos={{ left: 14, bottom: 14, borderLeft: "3px solid #111", borderBottom: "3px solid #111" }} />
        <Canto pos={{ right: 14, bottom: 14, borderRight: "3px solid #111", borderBottom: "3px solid #111" }} />
        <span className="rotulo" style={{ maxWidth: 200, lineHeight: 1.4, whiteSpace: "normal" }}>
          MOSTRE O CANTO ONDE VOCÊ TREINA
        </span>
      </div>
      <div style={{ marginTop: 12 }}>
        {[
          ["Equipamentos à vista", "no chão ou na parede"],
          ["Boa luz", "sem contraluz"],
          ["Até 3 fotos", "ângulos diferentes"],
        ].map(([a, b], i) => (
          <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: i === 2 ? "var(--border-strong)" : "1px solid var(--line)", fontSize: 15 }}>
            <span>{a}</span>
            <span style={{ color: "var(--ink-2)" }}>{b}</span>
          </div>
        ))}
      </div>
      <p className="texto-apoio" style={{ marginTop: 12 }}>
        A foto serve só para identificar os equipamentos. Ela é apagada logo depois.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto", paddingTop: 20 }}>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={aoEscolher} />
        <input ref={galeria} type="file" accept="image/*" hidden onChange={aoEscolher} />
        <button type="button" className="botao botao--primario" onClick={() => camera.current?.click()}>
          Abrir câmera
        </button>
        <button type="button" className="botao botao--secundario" onClick={() => galeria.current?.click()}>
          Escolher da galeria
        </button>
      </div>
    </div>
  );
}

const ETAPAS = ["Lendo a foto", "Identificando equipamentos", "Montando a lista"];

/** Análise da foto. Por enquanto simulada: a foto fica só na memória do aparelho e
 *  nunca é enviada. A identificação real (Claude com visão, restrita ao vocabulário
 *  de equipamentos do catálogo) entra com o backend. */
export function AnalisandoFoto({ arquivo, onPronto }: { arquivo: File | null; onPronto: () => void }) {
  const [fase, setFase] = useState(0);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!arquivo) return;
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  useEffect(() => {
    const iv = setInterval(() => setFase((f) => f + 1), 900);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (fase >= 3) onPronto();
  }, [fase, onPronto]);

  const f = Math.min(fase, 2);
  return (
    <div style={{ flex: 1, padding: "8px 20px calc(24px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column" }}>
      <h1 style={{ ...tituloEstilo, marginBottom: 16 }}>
        Analisando sua <span className="destaque">foto</span>
      </h1>
      <div style={{ position: "relative", height: 300, background: "var(--bg-soft)", overflow: "hidden" }}>
        {url && <img src={url} alt="Sua foto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", left: 0, right: 0, top: [30, 150, 270][f], height: 3, background: "#111", transition: "top .9s linear" }} />
      </div>
      <div style={{ marginTop: 16 }}>
        {ETAPAS.map((l, i) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: i === 2 ? "var(--border-strong)" : "1px solid var(--line)" }}>
            <span style={{ fontSize: 16, fontWeight: i === f ? 800 : 500, color: i <= f ? "#111" : "var(--ink-2)" }}>{l}</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em", color: i <= f ? "#111" : "var(--ink-2)" }}>{i < f ? "FEITO" : i === f ? "AGORA" : ""}</span>
          </div>
        ))}
      </div>
      <p className="texto-apoio" style={{ marginTop: "auto" }}>
        Leva poucos segundos. A foto é apagada assim que a análise termina.
      </p>
    </div>
  );
}

/** Itens "encontrados" na foto. Exemplo fixo até a análise real existir. */
export const ENCONTRADOS_EXEMPLO = [
  { chave: "Halter", sub: "Par, cerca de 5 kg", talvez: false },
  { chave: "Elástico", sub: "Com alças", talvez: false },
  { chave: "Banco", sub: "Reto", talvez: false },
  { chave: "Colchonete", sub: "Apareceu só em parte", talvez: true },
];

export function ConfirmarEncontrados({
  marcados,
  onAlternar,
  onAdicionar,
  onConfirmar,
}: {
  marcados: string[];
  onAlternar: (i: string) => void;
  onAdicionar: () => void;
  onConfirmar: () => void;
}) {
  const certos = ENCONTRADOS_EXEMPLO.filter((e) => !e.talvez).map((e) => e.chave.toLowerCase());
  return (
    <div style={rolagem}>
      <h1 style={{ ...tituloEstilo, fontSize: 32, lineHeight: 0.96, marginBottom: 16, textWrap: "pretty" }}>
        Encontramos: {certos.join(", ")}. <span className="destaque">Confere?</span>
      </h1>
      <div className="rotulo" style={{ paddingBottom: 6, borderBottom: "1px solid var(--line)" }}>
        NA FOTO
      </div>
      {ENCONTRADOS_EXEMPLO.map((e, i) => {
        const on = marcados.includes(e.chave);
        const ultimaDoGrupo = i === 2 || i === 3;
        return (
          <div key={e.chave}>
            {e.talvez && (
              <div className="rotulo" style={{ padding: "18px 0 6px", borderBottom: "1px solid var(--line)" }}>
                TALVEZ
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: ultimaDoGrupo ? "var(--border-strong)" : "1px solid var(--line)" }}>
              <span style={{ position: "relative", width: 56, height: 56, flex: "none", border: "1px solid var(--line)" }}>
                <FotoItem altura={56} rotulo="FOTO" />
              </span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase", lineHeight: 1 }}>{e.chave}</span>
                <span className="texto-apoio">{e.sub}</span>
              </div>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={`Marcar ${e.chave}`}
                onClick={() => onAlternar(e.chave)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: on ? "var(--accent)" : "#fff",
                  border: on ? "3px solid #111" : "2px solid #111",
                  color: on ? "#111" : "var(--line)",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ✓
              </button>
            </div>
          </div>
        );
      })}
      <button type="button" className="botao botao--secundario" style={{ marginTop: 16, flex: "none" }} onClick={onAdicionar}>
        Adicionar outro item
      </button>
      <p className="texto-apoio" style={{ marginTop: 12 }}>
        Sua foto já foi apagada. Guardamos só a lista de equipamentos.
      </p>
      <button type="button" className="botao botao--primario" style={{ marginTop: "auto", flex: "none" }} onClick={onConfirmar}>
        Confirmar
      </button>
    </div>
  );
}
