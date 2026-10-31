"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { medidas as armMedidas } from "@/lib/armazenamento";
import { useDemo } from "@/lib/demo";
import { dataCurta, hojeISO } from "@/lib/fotos-corpo";
import { useAvisoRapido } from "../AvisoRapido";
import { Segmentos } from "../marca";
import { BotaoVoltar } from "../quiz/pecas";

const MEDIDAS: [string, string][] = [
  ["Cintura", "Na altura do umbigo, 2 dedos acima"],
  ["Abdômen", "Sobre o umbigo"],
  ["Quadril", "Na parte mais larga do glúteo"],
  ["Braço", "No meio, entre ombro e cotovelo"],
  ["Coxa", "No meio, entre virilha e joelho"],
];
const INTERVALO_DIAS = 28;

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 1 });
const fmtDif = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Boneco que mostra onde passar a fita (ilustração por medida entra com a arte final). */
function Boneco({ sexo }: { sexo: string }) {
  return <img src={`/assets/bonecos/${sexo}/boneco-base.svg`} alt="" style={{ display: "block", width: 56, height: 72, objectFit: "contain", background: "#fff", border: "1px solid #111" }} />;
}

export function Medidas() {
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const pausada = demo.estado === "pausada";
  const [{ registros }, salvar] = armMedidas.usar();
  const [registrando, setRegistrando] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  const ultimo = registros[registros.length - 1];
  const anterior = registros[registros.length - 2];
  const proxima = ultimo ? new Date(new Date(ultimo.data + "T12:00:00").getTime() + INTERVALO_DIAS * 86400000) : null;
  const proximaISO = proxima ? `${proxima.getFullYear()}-${String(proxima.getMonth() + 1).padStart(2, "0")}-${String(proxima.getDate()).padStart(2, "0")}` : null;
  const historicoCintura = registros.filter((r) => r.valores.Cintura != null).reverse();

  const concluir = () => {
    const valores: Record<string, number> = {};
    for (const [nome] of MEDIDAS) {
      const v = parseFloat((rascunho[nome] ?? "").replace(",", "."));
      if (v > 0) valores[nome] = v;
    }
    setRegistrando(null);
    if (!Object.keys(valores).length) return aviso.mostrar("Nenhuma medida preenchida.");
    const hoje = hojeISO();
    salvar({ registros: [...registros.filter((r) => r.data !== hoje), { data: hoje, valores }] });
    aviso.mostrar("Medidas registradas.");
  };

  const atual = registrando != null ? MEDIDAS[registrando] : null;

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: "none", display: "flex", justifyContent: "space-between", alignItems: "center", height: 48, padding: "8px 20px 0" }}>
        <BotaoVoltar onClick={() => router.push(`/evolucao${demo.qs}`)} />
        {ultimo && <span className="rotulo">ÚLTIMA: {dataCurta(ultimo.data).toUpperCase()}</span>}
      </div>
      <div className="rolagem" style={{ padding: "4px 20px 20px" }}>
        <h1 className="titulo-tela" style={{ marginBottom: 6 }}>
          Medidas
        </h1>
        <p className="texto" style={{ color: "var(--ink-2)", marginBottom: 8 }}>
          Fita colada na pele, sem apertar. O boneco mostra onde passar.
        </p>
        {MEDIDAS.map(([nome, onde], i) => {
          const v = ultimo?.valores[nome];
          const a = anterior?.valores[nome];
          return (
            <div key={nome} style={{ display: "grid", gridTemplateColumns: "56px minmax(0, 1fr) auto", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i === MEDIDAS.length - 1 ? "var(--border-strong)" : "1px solid var(--line)" }}>
              <Boneco sexo={demo.sexo} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase", lineHeight: 1 }}>{nome}</span>
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{onde}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span className="numero-grande" style={{ fontSize: 32 }}>
                  {v != null ? fmt(v) : "—"}
                  {v != null && <span style={{ fontSize: 13, fontWeight: 700 }}> cm</span>}
                </span>
                {v != null && a != null && <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{fmtDif(v - a)} cm</span>}
              </div>
            </div>
          );
        })}
        <div className="ajuste" style={{ marginTop: 20 }}>
          <b>Lembrete:</b> a cada 4 semanas, sempre de manhã, antes de comer.{proximaISO ? ` Próxima em ${dataCurta(proximaISO)}.` : ""}
        </div>
        <div className="rotulo" style={{ margin: "24px 0 4px" }}>
          HISTÓRICO · CINTURA
        </div>
        {historicoCintura.length === 0 && (
          <p className="texto-apoio" style={{ padding: "12px 0", borderBottom: "var(--border-strong)" }}>
            Nenhum registro ainda.
          </p>
        )}
        {historicoCintura.map((r, i) => (
          <div key={r.data} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 44, borderBottom: i === historicoCintura.length - 1 ? "var(--border-strong)" : "1px solid var(--line)" }}>
            <span style={{ fontSize: 15 }}>{dataCurta(r.data)}</span>
            <span style={{ fontSize: 17, fontWeight: 850, fontStretch: "76%" }}>{fmt(r.valores.Cintura)} cm</span>
          </div>
        ))}
      </div>
      <div style={{ flex: "none", padding: "12px 20px calc(24px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--line)" }}>
        <button
          type="button"
          className="botao botao--primario"
          onClick={() => {
            if (pausada) return aviso.mostrar("Novos registros voltam quando você reativar.");
            setRascunho({});
            setRegistrando(0);
          }}
        >
          Registrar medidas
        </button>
      </div>

      {atual && registrando != null && (
        <>
          <div className="folha-fundo" onClick={() => setRegistrando(null)} />
          <form
            className="folha"
            role="dialog"
            aria-modal="true"
            onSubmit={(e) => {
              e.preventDefault();
              if (registrando < MEDIDAS.length - 1) setRegistrando(registrando + 1);
              else concluir();
            }}
          >
            <Segmentos total={MEDIDAS.length} atual={registrando} />
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Boneco sexo={demo.sexo} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 850, fontStretch: "72%", letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 0.95 }}>{atual[0]}</span>
                <span className="texto-apoio">{atual[1]}</span>
              </div>
            </div>
            <label style={{ height: 64, border: "1px solid #111", display: "flex", alignItems: "center", padding: "0 14px", gap: 6 }}>
              <input
                key={atual[0]}
                autoFocus
                inputMode="decimal"
                aria-label={`${atual[0]} em centímetros`}
                value={rascunho[atual[0]] ?? ""}
                onChange={(e) => setRascunho({ ...rascunho, [atual[0]]: e.target.value })}
                placeholder={ultimo?.valores[atual[0]] != null ? fmt(ultimo.valores[atual[0]]) : "0"}
                style={{ flex: 1, minWidth: 0, border: "none", fontSize: 40, fontWeight: 900, fontStretch: "65%", background: "transparent", color: "#111" }}
              />
              <span style={{ fontSize: 15, fontWeight: 700 }}>cm</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
              <button
                type="button"
                className="botao botao--secundario"
                onClick={() => (registrando < MEDIDAS.length - 1 ? setRegistrando(registrando + 1) : concluir())}
              >
                Pular
              </button>
              <button type="submit" className="botao botao--primario">
                {registrando < MEDIDAS.length - 1 ? "Próxima" : "Salvar"}
              </button>
            </div>
          </form>
        </>
      )}
      {aviso.elemento}
    </main>
  );
}
