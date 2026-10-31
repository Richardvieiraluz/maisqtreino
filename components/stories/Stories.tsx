"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { INSTAGRAM } from "@/lib/config";
import { ALUNO_EXEMPLO, TREINO_HOJE } from "@/lib/dados-exemplo";
import { carregarFontes, compartilharOuBaixar, desenharStories, type ModeloStories } from "@/lib/stories";
import { useAvisoRapido } from "../AvisoRapido";
import { BotaoVoltar } from "../quiz/pecas";

const MODELOS: [ModeloStories, string][] = [
  ["A", "CAPA"],
  ["B", "NÚMEROS"],
  ["C", "LISTA"],
];

export function Stories() {
  const router = useRouter();
  const params = useSearchParams();
  const aviso = useAvisoRapido();
  const canvas = useRef<HTMLCanvasElement>(null);
  const seletor = useRef<HTMLInputElement>(null);
  const [modelo, setModelo] = useState<ModeloStories>("A");
  const [selfie, setSelfie] = useState<HTMLImageElement | null>(null);
  const [fontesProntas, setFontesProntas] = useState(false);

  const dados = {
    treino: TREINO_HOJE.nome,
    palavraDestaque: TREINO_HOJE.palavraDestaque,
    minutos: parseInt(params.get("min") ?? "", 10) || TREINO_HOJE.duracaoMin,
    sequencia: parseInt(params.get("seq") ?? "", 10) || ALUNO_EXEMPLO.sequenciaDias + 1,
    instagram: INSTAGRAM,
  };

  useEffect(() => {
    carregarFontes().then(() => setFontesProntas(true));
  }, []);

  useEffect(() => {
    if (canvas.current) desenharStories(canvas.current, modelo, dados, selfie);
  }, [modelo, selfie, fontesProntas, dados.minutos, dados.sequencia]);

  const compartilhar = async () => {
    if (!canvas.current) return;
    const r = await compartilharOuBaixar(canvas.current, `maisqtreino-${modelo.toLowerCase()}.png`, `Treino feito. ${INSTAGRAM}`);
    if (r === "baixado") aviso.mostrar("Imagem salva. Poste nos stories e marque o @maisqtreino.");
  };

  const escolherFoto = (f: File) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => setSelfie(img);
    img.src = url;
  };

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: "none", display: "flex", justifyContent: "space-between", alignItems: "center", height: 44, padding: "8px 20px 0" }}>
        <BotaoVoltar onClick={() => router.back()} />
        <span className="rotulo">STORIES · 1080 × 1920</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 20px 0" }}>
        <canvas
          ref={canvas}
          aria-label="Prévia do stories"
          style={{ height: "min(480px, 100%)", aspectRatio: "9 / 16", border: "1px solid #111", flex: "0 1 auto", minHeight: 0, background: "#fff" }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12, flex: "none" }} role="tablist" aria-label="Modelo">
          {MODELOS.map(([k, rotulo]) => (
            <button
              type="button"
              key={k}
              role="tab"
              aria-selected={modelo === k}
              onClick={() => setModelo(k)}
              style={{ width: 88, height: 36, background: modelo === k ? "#111" : "#fff", color: modelo === k ? "#fff" : "#111", border: "1px solid #111", fontWeight: 800, fontSize: 11, letterSpacing: ".08em", cursor: "pointer" }}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: "none", padding: "12px 20px calc(24px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 13, color: "var(--ink-2)", textAlign: "center" }}>
          Marque o <b style={{ color: "#111" }}>{INSTAGRAM}</b> que eu repasso.
        </p>
        <input
          ref={seletor}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) escolherFoto(f);
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
          <button type="button" className="botao botao--secundario" style={{ fontSize: 13 }} onClick={() => seletor.current?.click()}>
            {selfie ? "Trocar foto" : "Pôr foto"}
          </button>
          <button
            type="button"
            className="botao botao--primario"
            style={{ fontSize: 13 }}
            onClick={() => {
              // O compartilhamento precisa do toque do aluno, então primeiro a foto, depois este botão.
              if (!selfie) {
                aviso.mostrar("Escolha a foto e depois toque em Compartilhar.");
                seletor.current?.click();
                return;
              }
              compartilhar();
            }}
          >
            Compartilhar
          </button>
        </div>
      </div>
      {aviso.elemento}
    </main>
  );
}
