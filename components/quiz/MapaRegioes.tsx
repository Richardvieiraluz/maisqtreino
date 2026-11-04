"use client";

import { useEffect, useRef, useState } from "react";
import type { Sexo } from "@/lib/midia";
import { REGIOES } from "@/lib/quiz";

// Mapa de regiões do quiz: o boneco de verdade (frente e costas na mesma imagem, 990 × 828) com
// cada grupo muscular no formato dele. O toque descobre a região pela cor dos bonecos de cada
// grupo (pintados de vermelho); a região marcada fica vermelha no próprio músculo. Embaixo, os
// mesmos itens em botões (acessível e para quem prefere marcar pela lista).
// Vermelho só aqui dentro do mapa muscular, como manda a marca.

const LARGURA = 990;
const ALTURA = 828;
/** Resolução das máscaras (metade): leve e precisa o bastante para o toque. */
const ESCALA = 0.5;
const W = Math.round(LARGURA * ESCALA);
const H = Math.round(ALTURA * ESCALA);

/** Região → boneco com o grupo pintado. Panturrilha não tem boneco próprio: sai das pernas, abaixo do joelho. */
const ARQUIVO: Record<string, string> = {
  ombros: "deltoide",
  peito: "peitoral",
  bracos: "grupo-bracos",
  abdomen: "grupo-core",
  quadriceps: "quadriceps",
  costas: "grupo-costas",
  lombar: "lombar",
  gluteo: "gluteos-completo",
  posterior: "posteriores",
  panturrilha: "grupo-pernas",
};
/** Linha do joelho no boneco (fração da altura): abaixo dela, "pernas" vira panturrilha. */
const JOELHO = 0.62;
/** Ordem do toque quando duas máscaras se encostam: as menores primeiro. */
const PRIORIDADE = ["lombar", "gluteo", "panturrilha", "ombros", "bracos", "abdomen", "peito", "posterior", "quadriceps", "costas"];

const VERMELHO = [200, 32, 42] as const;
const ehVermelho = (d: Uint8ClampedArray, i: number) => d[i] > 150 && d[i + 1] < 90 && d[i + 2] < 90 && d[i + 3] > 128;

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = erro;
    img.src = src;
  });
}

function pixels(img: HTMLImageElement): Uint8ClampedArray {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  return ctx.getImageData(0, 0, W, H).data;
}

interface Carregado {
  base: ImageData;
  mascaras: Record<string, Uint8Array>;
}

const cache = new Map<Sexo, Promise<Carregado>>();

function carregarMapa(sexo: Sexo): Promise<Carregado> {
  let p = cache.get(sexo);
  if (!p) {
    p = (async () => {
      const pasta = `/assets/bonecos/${sexo}`;
      const [base, ...regioes] = await Promise.all([carregar(`${pasta}/boneco-base.svg`), ...Object.values(ARQUIVO).map((a) => carregar(`${pasta}/boneco-${a}.svg`))]);
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(base, 0, 0, W, H);
      const mascaras: Record<string, Uint8Array> = {};
      Object.keys(ARQUIVO).forEach((chave, k) => {
        const d = pixels(regioes[k]);
        const m = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) {
          if (chave === "panturrilha" && Math.floor(i / W) < H * JOELHO) continue;
          if (ehVermelho(d, i * 4)) m[i] = 1;
        }
        mascaras[chave] = m;
      });
      // Panturrilha = pernas abaixo do joelho que não são posterior, quadríceps nem glúteo.
      const pant = mascaras.panturrilha;
      for (let i = 0; i < pant.length; i++) if (pant[i] && (mascaras.posterior[i] || mascaras.quadriceps[i] || mascaras.gluteo[i])) pant[i] = 0;
      return { base: ctx.getImageData(0, 0, W, H), mascaras };
    })();
    cache.set(sexo, p);
  }
  return p;
}

export function MapaRegioes({ sexo, selecionadas, onAlternar }: { sexo: Sexo; selecionadas: string[]; onAlternar: (r: string) => void }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const [mapa, setMapa] = useState<Carregado | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    carregarMapa(sexo).then(
      (m) => vivo && setMapa(m),
      () => vivo && setFalhou(true),
    );
    return () => {
      vivo = false;
    };
  }, [sexo]);

  // Desenha o boneco com as regiões marcadas em vermelho, no formato do músculo.
  useEffect(() => {
    const c = tela.current;
    if (!c || !mapa) return;
    const ctx = c.getContext("2d")!;
    const img = new ImageData(new Uint8ClampedArray(mapa.base.data), W, H);
    const d = img.data;
    for (const chave of selecionadas) {
      const m = mapa.mascaras[chave];
      if (!m) continue;
      for (let i = 0; i < m.length; i++) {
        if (!m[i]) continue;
        d[i * 4] = VERMELHO[0];
        d[i * 4 + 1] = VERMELHO[1];
        d[i * 4 + 2] = VERMELHO[2];
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [mapa, selecionadas]);

  const tocar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!mapa) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * W);
    const y = Math.floor(((e.clientY - r.top) / r.height) * H);
    // Primeiro o ponto exato; se o dedo caiu fora de um músculo (entre o braço e o tronco, por
    // exemplo), olha um quadradinho em volta e escolhe a região mais presente.
    const exato = PRIORIDADE.find((chave) => x >= 0 && y >= 0 && x < W && y < H && mapa.mascaras[chave][y * W + x]);
    if (exato) return onAlternar(exato);
    const raio = 6;
    const votos: Record<string, number> = {};
    for (let dy = -raio; dy <= raio; dy++) {
      for (let dx = -raio; dx <= raio; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        for (const chave of PRIORIDADE) {
          if (mapa.mascaras[chave][py * W + px]) {
            votos[chave] = (votos[chave] ?? 0) + 1;
            break;
          }
        }
      }
    }
    const melhor = Object.entries(votos).sort((a, b) => b[1] - a[1])[0];
    if (melhor) onAlternar(melhor[0]);
  };

  return (
    <>
      <div style={{ position: "relative", border: "1px solid var(--line)", background: "#fff" }}>
        {!falhou && (
          <canvas
            ref={tela}
            width={W}
            height={H}
            onPointerUp={tocar}
            role="img"
            aria-label={`Mapa do corpo, frente e costas. Marcadas: ${selecionadas.length ? selecionadas.map((k) => REGIOES[k]).join(", ") : "nenhuma"}.`}
            style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${LARGURA} / ${ALTURA}`, cursor: mapa ? "pointer" : "progress", touchAction: "manipulation" }}
          />
        )}
        <div style={{ display: "flex", borderTop: "1px solid var(--line)" }}>
          <span className="rotulo" style={{ flex: 1, textAlign: "center", padding: "6px 0" }}>
            FRENTE
          </span>
          <span className="rotulo" style={{ flex: 1, textAlign: "center", padding: "6px 0" }}>
            COSTAS
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }} role="group" aria-label="Regiões">
        {Object.entries(REGIOES).map(([chave, rotulo]) => {
          const sel = selecionadas.includes(chave);
          return (
            <button
              type="button"
              key={chave}
              aria-pressed={sel}
              onClick={() => onAlternar(chave)}
              style={{ height: 36, padding: "0 12px", background: sel ? "#111" : "#fff", color: sel ? "#fff" : "#111", border: sel ? "2px solid #111" : "1px solid #111", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {rotulo}
            </button>
          );
        })}
      </div>
    </>
  );
}
