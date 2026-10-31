"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/demo";
import { ANGULOS, dataCurta, hojeISO, listarFotos, salvarFoto, type Angulo, type FotoCorpo } from "@/lib/fotos-corpo";
import { useAvisoRapido } from "../AvisoRapido";
import { doisDigitos, Selo } from "../marca";
import { BotaoVoltar } from "../quiz/pecas";

function useUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return setUrl(null);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

function Painel({ foto, rotuloData, angulo }: { foto?: FotoCorpo; rotuloData: string; angulo: Angulo }) {
  const url = useUrl(foto?.imagem);
  return (
    <div style={{ position: "relative", background: "var(--bg-soft)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 8, overflow: "hidden" }}>
      {url && <img src={url} alt={`Foto de ${angulo.toLowerCase()} em ${rotuloData}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <span style={{ position: "relative", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#111", background: url ? "#fff" : "transparent", alignSelf: "flex-start", padding: url ? "2px 4px" : 0 }}>
        {rotuloData.toUpperCase()}
      </span>
      {!url && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "var(--ink-2)" }}>FOTO · {angulo}</span>}
    </div>
  );
}

/** Câmera em tela preta com silhueta e linha amarela para os pés. */
function Camera({ onFechar, onConcluir }: { onFechar: () => void; onConcluir: (fotos: { angulo: Angulo; imagem: Blob }[]) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const [passo, setPasso] = useState(0);
  const [frente, setFrente] = useState(false);
  const [semCamera, setSemCamera] = useState(false);
  const fotos = useRef<{ angulo: Angulo; imagem: Blob }[]>([]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelado = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: frente ? "user" : "environment", width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: false });
        if (cancelado) return stream.getTracks().forEach((t) => t.stop());
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play().catch(() => undefined);
        }
      } catch {
        setSemCamera(true);
      }
    })();
    return () => {
      cancelado = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [frente]);

  const registrar = (imagem: Blob) => {
    fotos.current = [...fotos.current, { angulo: ANGULOS[passo], imagem }];
    if (passo < 2) setPasso(passo + 1);
    else onConcluir(fotos.current);
  };

  const tirar = () => {
    const v = video.current;
    if (semCamera || !v || !v.videoWidth) return arquivo.current?.click();
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (frente) {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => b && registrar(b), "image/jpeg", 0.85);
  };

  return (
    <main className="app app--escuro">
      <div className="topo-seguro" />
      <div style={{ flex: "none", display: "flex", justifyContent: "space-between", alignItems: "center", height: 48, padding: "8px 20px 0" }}>
        <button type="button" onClick={onFechar} aria-label="Fechar" style={{ width: 44, height: 44, marginLeft: -11, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <path d="M4 4L18 18M18 4L4 18" stroke="#fff" strokeWidth="2" />
          </svg>
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink-on-dark-2)" }}>{doisDigitos(passo + 1)} / 03</span>
      </div>
      <div style={{ flex: 1, margin: "8px 20px 0", position: "relative", background: "var(--body)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <video ref={video} muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: frente ? "scaleX(-1)" : undefined }} />
        <div
          style={{ position: "relative", width: 150, height: "min(440px, 80%)", border: "2px dashed #fff", borderRadius: "75px 75px 20px 20px", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 10, fontSize: 9, fontWeight: 700, letterSpacing: ".08em", color: "var(--ink-on-dark-2)", textAlign: "center" }}
        >
          {semCamera ? "CÂMERA INDISPONÍVEL" : ANGULOS[passo]}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 24, height: 3, background: "var(--accent)" }} />
        {!semCamera && (
          <button
            type="button"
            onClick={() => setFrente(!frente)}
            style={{ position: "absolute", right: 10, top: 10, height: 36, padding: "0 10px", background: "#111", color: "#fff", border: "1px solid #fff", fontWeight: 800, fontSize: 11, letterSpacing: ".08em", cursor: "pointer" }}
          >
            VIRAR CÂMERA
          </button>
        )}
      </div>
      <div style={{ flex: "none", padding: "16px 20px calc(24px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 12 }}>
        <p className="texto">Pés na linha amarela, braços soltos. Mesma luz e mesma distância da última vez.</p>
        <input
          ref={arquivo}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) registrar(f);
          }}
        />
        <button type="button" className="botao botao--branco" onClick={tirar}>
          Tirar foto · {ANGULOS[passo]}
        </button>
      </div>
    </main>
  );
}

export function FotosCorpo() {
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const pausada = demo.estado === "pausada";
  const [fotos, setFotos] = useState<FotoCorpo[]>([]);
  const [angulo, setAngulo] = useState<Angulo>("FRENTE");
  const [camera, setCamera] = useState(false);

  const carregar = useCallback(() => listarFotos().then(setFotos), []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  if (camera)
    return (
      <Camera
        onFechar={() => setCamera(false)}
        onConcluir={async (novas) => {
          const hoje = hojeISO();
          for (const f of novas) await salvarFoto(f.imagem, f.angulo, hoje);
          await carregar();
          setCamera(false);
          aviso.mostrar("Fotos salvas. Só você vê.");
        }}
      />
    );

  const doAngulo = fotos.filter((f) => f.angulo === angulo);
  const antes = doAngulo.length > 1 ? doAngulo[0] : undefined;
  const agora = doAngulo.length ? doAngulo[doAngulo.length - 1] : undefined;
  const datas = Array.from(new Set(fotos.map((f) => f.data))).reverse();
  const descreve = (d: string) => {
    const a = fotos.filter((f) => f.data === d).map((f) => f.angulo.toLowerCase());
    return a.length === 3 ? "Frente, lado e costas" : a.map((x, i) => (i ? x : x[0].toUpperCase() + x.slice(1))).join(" e ");
  };

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: "none", display: "flex", justifyContent: "space-between", alignItems: "center", height: 48, padding: "8px 20px 0" }}>
        <BotaoVoltar onClick={() => router.push(`/evolucao${demo.qs}`)} />
        <Selo>Só você vê</Selo>
      </div>
      <div className="rolagem" style={{ padding: "4px 20px 20px" }}>
        <h1 className="titulo-tela" style={{ marginBottom: 16 }}>
          Antes e <span className="destaque">agora</span>
        </h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", border: "1px solid #111", marginBottom: 12 }} role="tablist">
          {ANGULOS.map((a) => (
            <button
              type="button"
              key={a}
              role="tab"
              aria-selected={angulo === a}
              onClick={() => setAngulo(a)}
              style={{ height: 40, border: "none", background: angulo === a ? "#111" : "#fff", color: angulo === a ? "#fff" : "#111", fontWeight: 800, fontSize: 12, letterSpacing: ".08em", cursor: "pointer" }}
            >
              {a}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 3px minmax(0, 1fr)", height: 400 }}>
          <Painel foto={antes} angulo={angulo} rotuloData={antes ? dataCurta(antes.data) : "Antes"} />
          <div style={{ background: "#111" }} />
          <Painel foto={agora} angulo={angulo} rotuloData={agora ? dataCurta(agora.data) : "Agora"} />
        </div>
        <div className="rotulo" style={{ margin: "20px 0 4px" }}>
          DATAS
        </div>
        {datas.length === 0 && (
          <p className="texto-apoio" style={{ padding: "12px 0", borderBottom: "var(--border-strong)" }}>
            Nenhuma foto ainda. Tire as três de hoje e compare daqui a 4 semanas.
          </p>
        )}
        {datas.map((d, i) => (
          <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 48, borderBottom: i === datas.length - 1 ? "var(--border-strong)" : "1px solid var(--line)" }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{dataCurta(d, true)}</span>
            <span className="texto-apoio">{descreve(d)}</span>
          </div>
        ))}
        <p className="texto-apoio" style={{ marginTop: 12 }}>
          As fotos ficam guardadas só neste aparelho.
        </p>
      </div>
      <div style={{ flex: "none", padding: "12px 20px calc(24px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--line)" }}>
        <button type="button" className="botao botao--primario" onClick={() => (pausada ? aviso.mostrar("Novas fotos voltam quando você reativar.") : setCamera(true))}>
          Tirar novas fotos
        </button>
      </div>
      {aviso.elemento}
    </main>
  );
}
