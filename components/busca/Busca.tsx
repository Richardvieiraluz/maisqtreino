"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { normalizar, treinoBloqueado, TREINOS_VITRINE, type TreinoVitrine } from "@/lib/catalogo-exemplo";
import { useDemo } from "@/lib/demo";
import { bonecoDe, fotoDe } from "@/lib/midia";
import { useAvisoRapido } from "../AvisoRapido";
import { Cadeado, Selo } from "../marca";
import { BotaoVoltar } from "../quiz/pecas";

const SUGESTOES = ["Cadeira extensora", "Glúteo", "Lombar", "Mini band", "Halter", "Alongamento"];

/** Abre um treino da vitrine: cadeado leva à oferta; o de exemplo tem detalhe; os outros entram com o catálogo. */
export function useAbrirTreinoVitrine() {
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const abrir = (t: TreinoVitrine) => {
    if (treinoBloqueado(t.nome, demo.estado)) return router.push(`${demo.estado === "pausada" ? "/reativar" : "/oferta"}${demo.qs}`);
    if (t.nome === "Glúteo e posterior") return router.push(`/detalhe/protocolo-07${demo.qs}${demo.qs ? "&" : "?"}de=inicio`);
    aviso.mostrar(`O detalhe de "${t.nome}" entra quando o catálogo real for ligado.`);
  };
  return { abrir, aviso };
}

export function Busca() {
  const demo = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const { abrir, aviso } = useAbrirTreinoVitrine();
  const termo = q.trim();
  const nq = normalizar(termo);

  const resultados = useMemo(
    () => (termo ? TREINOS_VITRINE.filter((t) => normalizar([t.nome, ...t.etiquetas].join(", ")).includes(nq)) : []),
    [termo, nq],
  );

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "12px 20px 12px" }}>
        <BotaoVoltar onClick={() => router.push(`/${demo.qs}`)} />
        <label style={{ flex: 1, height: 46, border: "3px solid #111", display: "flex", alignItems: "center", gap: 10, padding: "0 12px" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <circle cx="7.5" cy="7.5" r="5.5" fill="none" stroke="#111" strokeWidth="2" />
            <path d="M11.5 11.5L16 16" stroke="#111" strokeWidth="2" />
          </svg>
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Treino, região ou aparelho"
            aria-label="Buscar treinos"
            style={{ border: "none", flex: 1, minWidth: 0, fontSize: 16, color: "#111", background: "transparent" }}
          />
          {termo && (
            <button type="button" onClick={() => setQ("")} aria-label="Limpar" style={{ width: 28, height: 28, padding: 0, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path d="M2 2L12 12M12 2L2 12" stroke="#111" strokeWidth="2" />
              </svg>
            </button>
          )}
        </label>
      </div>
      <div className="rolagem" style={{ padding: "8px 20px 24px" }}>
        {!termo ? (
          <>
            <div className="rotulo" style={{ marginBottom: 10 }}>
              BUSCAS COMUNS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGESTOES.map((s) => (
                <button type="button" key={s} onClick={() => setQ(s)} style={{ height: 40, padding: "0 12px", background: "#fff", border: "1px solid #111", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
            <div className="ajuste" style={{ marginTop: 24 }}>
              <b>Como funciona:</b> a busca sempre mostra treinos inteiros. Procure pelo aparelho e veja os treinos que usam ele.
            </div>
          </>
        ) : (
          <>
            <div className="rotulo" style={{ marginBottom: 2, whiteSpace: "normal" }} aria-live="polite">
              {resultados.length} {resultados.length === 1 ? "TREINO" : "TREINOS"} COM “{termo.toUpperCase()}”
            </div>
            {resultados.map((t, i) => {
              const bloqueado = treinoBloqueado(t.nome, demo.estado);
              const motivo = t.etiquetas.find((x) => normalizar(x).includes(nq)) ?? t.etiquetas[0];
              return (
                <button
                  type="button"
                  key={t.nome}
                  onClick={() => abrir(t)}
                  style={{ width: "100%", display: "flex", gap: 12, alignItems: "center", padding: "12px 0", background: "none", border: "none", borderBottom: i === resultados.length - 1 ? "var(--border-strong)" : "1px solid var(--line)", cursor: "pointer", textAlign: "left" }}
                >
                  <span
                    style={{
                      position: "relative",
                      width: 72,
                      height: 90,
                      flex: "none",
                      border: "1px solid var(--line)",
                      background: bloqueado ? "var(--track)" : `#fff url(${fotoDe(`${t.nome} ${t.etiquetas.join(" ")}`)}) center bottom / cover no-repeat`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {bloqueado && <Cadeado />}
                  </span>
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "74%", letterSpacing: "-0.015em", textTransform: "uppercase", lineHeight: 0.98, color: bloqueado ? "var(--ink-2)" : "#111" }}>{t.nome}</span>
                    <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
                        {t.minutos} min · {t.local}
                      </span>
                      <Selo pequeno>{t.nivel}</Selo>
                    </span>
                    <span style={{ fontSize: 12 }}>
                      Tem: <b style={{ fontWeight: 800 }}>{motivo}</b>
                    </span>
                  </span>
                </button>
              );
            })}
            {resultados.length === 0 && (
              <p style={{ border: "var(--border-strong)", padding: 14, fontSize: 15, lineHeight: 1.45, marginTop: 8 }}>
                Nenhum treino com “{termo}”. Tente pela região, como glúteo, ou pelo aparelho, como halter.
              </p>
            )}
          </>
        )}
      </div>
      {aviso.elemento}
    </main>
  );
}

type Filtro = "nivel" | "duracao" | "local";
const OPCOES: Record<Filtro, [string, string[]]> = {
  nivel: ["NÍVEL", ["Todos", "Iniciante", "Intermediário", "Avançado"]],
  duracao: ["DURAÇÃO", ["Todos", "Até 20 min", "20 a 40", "Mais de 40"]],
  local: ["LOCAL", ["Todos", "Casa", "Academia"]],
};
const duracaoOk = (m: number, f: string) => f === "Todos" || (f === "Até 20 min" ? m <= 20 : f === "20 a 40" ? m > 20 && m <= 40 : m > 40);

/** "Ver tudo" de uma fileira: grade de 2 colunas com filtros. */
export function VerTudo() {
  const demo = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const fileira = params.get("fileira") ?? "Treino em casa";
  const { abrir, aviso } = useAbrirTreinoVitrine();
  const localFixo = fileira === "Treino em casa" ? "Casa" : fileira === "Treino na academia" ? "Academia" : null;
  const [f, setF] = useState<Record<Filtro, string>>({ nivel: "Todos", duracao: fileira === "Rápidos" ? "Até 20 min" : "Todos", local: "Todos" });
  const filtros = (Object.keys(OPCOES) as Filtro[]).filter((k) => !(k === "local" && localFixo));

  const grade = TREINOS_VITRINE.filter(
    (t) => (!localFixo || t.local === localFixo) && (f.nivel === "Todos" || t.nivel === f.nivel) && duracaoOk(t.minutos, f.duracao) && (localFixo || f.local === "Todos" || t.local === f.local),
  );

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: "none", display: "flex", justifyContent: "space-between", alignItems: "center", height: 48, padding: "8px 20px 0" }}>
        <BotaoVoltar onClick={() => router.push(`/${demo.qs}`)} />
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink-2)" }}>{grade.length} TREINOS</span>
      </div>
      <h1 className="titulo-tela" style={{ padding: "0 20px", margin: "0 0 14px" }}>
        {fileira}
      </h1>
      <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 6, paddingBottom: 12, borderBottom: "1px solid #111" }}>
        {filtros.map((k) => (
          <div key={k} className="fileira-trilho" style={{ gap: 6, alignItems: "center" }} role="group" aria-label={OPCOES[k][0]}>
            <span style={{ flex: "none", width: 62, fontSize: 10, fontWeight: 700, letterSpacing: ".09em", color: "var(--ink-2)" }}>{OPCOES[k][0]}</span>
            {OPCOES[k][1].map((o) => (
              <button
                type="button"
                key={o}
                aria-pressed={f[k] === o}
                onClick={() => setF({ ...f, [k]: o })}
                style={{ flex: "none", height: 34, padding: "0 11px", background: f[k] === o ? "#111" : "#fff", color: f[k] === o ? "#fff" : "#111", border: "1px solid #111", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                {o}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="rolagem" style={{ padding: "16px 20px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px 8px" }}>
          {grade.map((t) => {
            const bloqueado = treinoBloqueado(t.nome, demo.estado);
            const chave = `${t.nome} ${t.etiquetas.join(" ")}`;
            return (
              <button type="button" key={t.nome} onClick={() => abrir(t)} style={{ display: "flex", flexDirection: "column", gap: 8, cursor: "pointer", background: "none", border: "none", padding: 0, textAlign: "left" }}>
                <span className={bloqueado ? "card-treino__capa card-treino__capa--bloqueado" : "card-treino__capa"} style={{ height: 200, display: "block", width: "100%" }}>
                  {bloqueado ? (
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Cadeado />
                    </span>
                  ) : (
                    <img className="card-treino__foto" src={fotoDe(chave)} alt="Richard Vieira" />
                  )}
                  <img className="card-treino__mapa" src={bonecoDe(chave, demo.sexo)} alt="" />
                </span>
                <span className="nome-card" style={{ color: bloqueado ? "var(--ink-2)" : "#111" }}>
                  {t.nome}
                </span>
                <span className="card-treino__meta">
                  <span>{t.minutos} min</span>
                  <Selo pequeno>{t.nivel}</Selo>
                </span>
              </button>
            );
          })}
        </div>
        {grade.length === 0 && <p style={{ border: "var(--border-strong)", padding: 14, fontSize: 15, lineHeight: 1.45 }}>Nenhum treino com esses filtros. Tire um deles para ver mais.</p>}
      </div>
      {aviso.elemento}
    </main>
  );
}
