"use client";

import type { Dispatch } from "react";
import { bonecoDe, fotoDe, videoDe, type Sexo } from "@/lib/midia";
import { fmtTempo, nSeries, primeiraPendente, resumoSeries, type Acao, type EstadoSessao } from "@/lib/sessao";
import type { TreinoSessao } from "@/lib/tipos";
import { doisDigitos, Segmentos, Selo } from "../marca";
import { FolhaExercicio } from "./FolhaExercicio";

type Despachar = Dispatch<Acao>;

export function Execucao({
  treino,
  s,
  despachar,
  sexo,
  descansoEmFaixa,
  onFechar,
}: {
  treino: TreinoSessao;
  s: EstadoSessao;
  despachar: Despachar;
  sexo: Sexo;
  descansoEmFaixa: boolean;
  onFechar: () => void;
}) {
  const E = treino.exercicios;
  const e = E[s.ex];
  const n = nSeries(e);
  const fu = primeiraPendente(treino, s.feitos, s.ex);
  const nome = s.trocas[s.ex] ?? e.nome;
  const trocado = s.trocas[s.ex] != null;
  const video = !trocado ? videoDe(e.video) : undefined;
  const descansoTela = !!s.descanso && !descansoEmFaixa;
  const descansoFaixa = !!s.descanso && descansoEmFaixa;

  // "A seguir", no descanso.
  let proximoNome = nome;
  let proximoRotulo = "";
  if (s.descanso) {
    const prox = E[s.ex + 1];
    if (s.descanso.depois === "proximo" && prox) {
      proximoNome = prox.nome;
      proximoRotulo = `Próximo exercício · ${resumoSeries(prox)}`;
    } else {
      const j = Math.min(fu, n - 1);
      proximoRotulo =
        `Série ${fu + 1} de ${n}` +
        (e.modo === "reps"
          ? ` · ${e.reps?.[j]} reps` + (e.cargaAnterior != null ? ` · ${s.cargas[`${s.ex}-${fu}`] || e.cargaAnterior} kg` : "")
          : ` · ${e.segundos} s`);
    }
  }

  const timer = s.timer ?? { restante: e.segundos ?? 0, rodando: false };
  const larguraDescanso = s.descanso ? `${(s.descanso.restante / s.descanso.total) * 100}%` : "0%";

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: "none", padding: "16px 20px 0" }}>
        <Segmentos total={E.length} atual={s.ex} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 48 }}>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ width: 44, height: 44, marginLeft: -11, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
              <path d="M4 4L18 18M18 4L4 18" stroke="#111" strokeWidth="2" />
            </svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink-2)", whiteSpace: "nowrap" }}>
            {doisDigitos(s.ex + 1)} / {doisDigitos(E.length)}
          </span>
        </div>
      </div>

      {descansoTela && s.descanso && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 20px calc(24px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="rotulo">DESCANSO</div>
          <div className="numero-grande" style={{ fontSize: 64, margin: "8px 0 14px" }} aria-live="polite">
            {fmtTempo(s.descanso.restante)}
          </div>
          <div className="trilho">
            <span style={{ width: larguraDescanso }} />
          </div>
          <p className="texto" style={{ marginTop: 16, maxWidth: 300 }}>
            Respire pelo nariz. A pausa completa deixa a próxima série com a mesma qualidade.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 24 }}>
            <button type="button" className="botao botao--secundario" onClick={() => despachar({ t: "mais15" })}>
              +15 s
            </button>
            <button type="button" className="botao botao--primario" onClick={() => despachar({ t: "pularDescanso" })}>
              Pular
            </button>
          </div>
          <div style={{ marginTop: "auto", borderTop: "var(--border-strong)", paddingTop: 12 }}>
            <div className="rotulo" style={{ marginBottom: 10 }}>
              A SEGUIR
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <img
                src={fotoDe(proximoNome)}
                alt=""
                style={{ width: 72, height: 88, flex: "none", objectFit: "cover", objectPosition: "center bottom", background: "#fff", border: "1px solid var(--line)" }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 850, fontStretch: "74%", letterSpacing: "-0.015em", lineHeight: 0.95, textTransform: "uppercase" }}>
                  {proximoNome}
                </span>
                <span className="texto-apoio">{proximoRotulo}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!descansoTela && (
        <div className="rolagem" style={{ padding: `8px 20px ${descansoFaixa ? 190 : 24}px` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="rotulo">{e.grupo}</span>
              <h1 style={{ fontSize: 30, fontWeight: 850, fontStretch: "72%", letterSpacing: "-0.02em", lineHeight: 0.95, textTransform: "uppercase", textWrap: "pretty" }}>
                {nome}
              </h1>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em", whiteSpace: "nowrap" }}>{resumoSeries(e)}</span>
                {s.exRecorde === s.ex && <Selo>Recorde</Selo>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => despachar({ t: "folha", folha: "menu" })}
              aria-label="Mais opções"
              style={{ flex: "none", width: 44, height: 44, border: "1px solid #111", background: "#fff", fontSize: 20, fontWeight: 900, cursor: "pointer", lineHeight: 1, paddingBottom: 8 }}
            >
              ⋯
            </button>
          </div>

          <div style={{ position: "relative", height: 300, marginTop: 14, background: "#fff", display: "flex", alignItems: "flex-end", padding: 12, overflow: "hidden" }}>
            {video ? (
              <video
                key={video}
                src={video}
                autoPlay
                muted
                loop
                playsInline
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#fff" }}
              />
            ) : (
              <>
                <img
                  src={fotoDe(`${e.grupo} ${nome}`)}
                  alt="Richard Vieira"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom", background: "#fff" }}
                />
                <span style={{ position: "relative" }}>
                  <Selo>Vídeo em breve</Selo>
                </span>
              </>
            )}
            <img
              src={bonecoDe(`${e.grupo} ${nome}`, sexo)}
              alt="Mapa muscular do exercício"
              style={{ position: "absolute", right: 10, top: 10, width: 120, height: 100, objectFit: "contain", background: "#fff", border: "1px solid #111" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="botao botao--secundario"
              style={{ height: 44, fontSize: 11, color: s.voz ? "var(--ink)" : "var(--ink-2)" }}
              onClick={() => despachar({ t: "voz" })}
              aria-pressed={s.voz}
            >
              {s.voz ? "Voz guia: ligada" : "Voz guia: desligada"}
            </button>
            <button
              type="button"
              className="botao"
              style={{ height: 44, fontSize: 11, border: "2px solid #111", background: s.explicacao > 0 ? "#111" : "#fff", color: s.explicacao > 0 ? "#fff" : "#111" }}
              onClick={() => despachar({ t: "explicacao" })}
            >
              {s.explicacao > 0 ? `Tocando · 0:${doisDigitos(s.explicacao)}` : "Explicação"}
            </button>
          </div>

          {e.modo === "reps" && (
            <>
              <div
                style={{ display: "grid", gridTemplateColumns: "44px 1fr 96px 48px", gap: 10, marginTop: 22, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}
                className="rotulo"
              >
                <span style={{ fontSize: 10 }}>SÉRIE</span>
                <span style={{ fontSize: 10 }}>ALVO</span>
                <span style={{ fontSize: 10 }}>CARGA</span>
                <span />
              </div>
              {e.reps?.map((r, j) => {
                const k = `${s.ex}-${j}`;
                const feito = !!s.feitos[k];
                const atual = j === fu;
                const corNum = feito ? "var(--ink-2)" : "var(--ink)";
                return (
                  <div
                    key={k}
                    style={{ display: "grid", gridTemplateColumns: "44px 1fr 96px 48px", gap: 10, alignItems: "center", height: 62, borderBottom: j === n - 1 ? "var(--border-strong)" : "1px solid var(--line)" }}
                  >
                    <span className="numero-grande" style={{ fontSize: 28, color: corNum }}>
                      {doisDigitos(j + 1)}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: corNum }}>{r} reps</span>
                    {e.cargaAnterior != null ? (
                      <label style={{ height: 40, border: "1px solid #111", display: "flex", alignItems: "center", padding: "0 8px", gap: 4 }}>
                        <input
                          value={s.cargas[k] ?? ""}
                          onChange={(ev) => despachar({ t: "carga", j, valor: ev.target.value })}
                          inputMode="decimal"
                          aria-label={`Carga da série ${j + 1}`}
                          style={{ width: "100%", minWidth: 0, border: "none", fontSize: 16, fontWeight: 700, color: "#111", background: "transparent" }}
                        />
                        <span style={{ fontSize: 12, color: "var(--ink-2)" }}>kg</span>
                      </label>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.2 }}>{e.equipamento}</span>
                    )}
                    <button
                      type="button"
                      aria-label={feito ? `Desfazer série ${j + 1}` : `Concluir série ${j + 1}`}
                      onClick={() => despachar(feito ? { t: "desfazerSerie", j } : { t: "concluirSerie", j })}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: feito ? "var(--accent)" : "#fff",
                        border: feito ? "3px solid #111" : atual ? "2px solid #111" : "1px solid var(--line)",
                        fontWeight: 900,
                        fontSize: 16,
                        cursor: "pointer",
                        color: feito || atual ? "#111" : "var(--line)",
                        padding: 0,
                      }}
                    >
                      ✓
                    </button>
                  </div>
                );
              })}
              <p className="texto-apoio" style={{ marginTop: 10 }}>
                A carga da última vez já vem preenchida. Registrar ajuda a acompanhar sua evolução.
              </p>
            </>
          )}

          {e.modo === "tempo" && (
            <>
              <div style={{ marginTop: 22, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <span className="numero-grande" style={{ fontSize: 64, lineHeight: 0.9 }} aria-live="polite">
                  {fmtTempo(timer.restante)}
                </span>
                <span className="rotulo" style={{ paddingBottom: 6 }}>
                  SÉRIE {Math.min(fu + 1, n)} DE {n}
                </span>
              </div>
              <div className="trilho" style={{ marginTop: 12 }}>
                <span style={{ width: `${e.segundos ? (timer.restante / e.segundos) * 100 : 0}%` }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
                {Array.from({ length: n }, (_, j) => {
                  const feito = !!s.feitos[`${s.ex}-${j}`];
                  return (
                    <div
                      key={j}
                      style={{
                        flex: 1,
                        height: 36,
                        border: feito || j === fu ? "2px solid #111" : "1px solid var(--line)",
                        background: feito ? "var(--track)" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: ".08em",
                      }}
                    >
                      {feito ? `✓ SÉRIE ${j + 1}` : `SÉRIE ${j + 1}`}
                    </div>
                  );
                })}
              </div>
              <button type="button" className="botao botao--primario" style={{ marginTop: 12 }} onClick={() => despachar({ t: "alternarTimer" })}>
                {timer.rodando ? "Pausar" : timer.restante < (e.segundos ?? 0) ? "Continuar" : "Iniciar"}
              </button>
            </>
          )}

          <div className="ajuste" style={{ marginTop: 22 }}>
            <b>O ajuste:</b> {e.ajuste}
          </div>
        </div>
      )}

      {descansoFaixa && s.descanso && (
        <div
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "var(--border-strong)", padding: "14px 20px calc(20px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="rotulo">DESCANSO</span>
              <span className="numero-grande" style={{ fontSize: 56, lineHeight: 0.95 }} aria-live="polite">
                {fmtTempo(s.descanso.restante)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="botao botao--secundario" style={{ width: "auto", height: 48, padding: "0 14px", fontSize: 13, letterSpacing: ".06em" }} onClick={() => despachar({ t: "mais15" })}>
                +15 s
              </button>
              <button type="button" className="botao botao--primario" style={{ width: "auto", height: 48, padding: "0 14px", fontSize: 13, letterSpacing: ".06em" }} onClick={() => despachar({ t: "pularDescanso" })}>
                Pular
              </button>
            </div>
          </div>
          <div className="trilho">
            <span style={{ width: larguraDescanso }} />
          </div>
          <div className="texto-apoio">
            A seguir: <b style={{ color: "#111", fontWeight: 800 }}>{proximoNome}</b> · {proximoRotulo}
          </div>
        </div>
      )}

      {s.folha && <FolhaExercicio nome={nome} exercicio={e} folha={s.folha} despachar={despachar} onEncerrar={onFechar} />}
    </main>
  );
}
