"use client";

import { useState } from "react";

// Miniatura de vídeo que funciona no iPhone: o Safari só desenha o primeiro quadro quando o endereço
// pede um instante (#t=0.1). Tocar abre o vídeo em tela cheia, com controles.
export function MiniVideo({ src, largura = 48, altura = 60, rotulo = "Ver vídeo" }: { src?: string | null; largura?: number; altura?: number; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  if (!src) return <span style={{ width: largura, height: altura, flex: "none", background: "var(--bg-soft)" }} />;
  const quadro = src.includes("#") ? src : `${src}#t=0.1`;
  return (
    <>
      <button
        type="button"
        aria-label={rotulo}
        onClick={(e) => {
          e.stopPropagation();
          setAberto(true);
        }}
        style={{ position: "relative", width: largura, height: altura, flex: "none", padding: 0, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", overflow: "hidden" }}
      >
        <video src={quadro} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", display: "block" }} />
        <span aria-hidden style={{ position: "absolute", right: 2, bottom: 2, width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "9px solid #111" }} />
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={rotulo}
          onClick={() => setAberto(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "#111", display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center", padding: "env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px)" }}
        >
          <video src={src} autoPlay muted loop playsInline controls onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxHeight: "80vh", background: "#fff", objectFit: "contain" }} />
          <button type="button" className="botao botao--secundario" onClick={() => setAberto(false)} style={{ margin: "16px 20px 0", width: "calc(100% - 40px)" }}>
            Fechar vídeo
          </button>
        </div>
      )}
    </>
  );
}
