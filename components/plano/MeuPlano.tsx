"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ALUNO_EXEMPLO } from "@/lib/dados-exemplo";
import { useDemo } from "@/lib/demo";
import { progressoProtocolo, PROGRAMA_GLUTEO, situacaoDoTreino, tipoDoTreino, TREINOS_TIPO, type SituacaoTreino } from "@/lib/plano";
import { RESPOSTAS_PADRAO, useRespostasSalvas } from "@/lib/quiz";
import { useAvisoRapido } from "../AvisoRapido";
import { Check, doisDigitos, Logo, Selo } from "../marca";
import { RodapeAbas } from "../RodapeAbas";

const TOTAL = 24;
const LOCAIS = ["Em casa", "Academia", "Condomínio"];

function CadeadoMini() {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 14, height: 17, flex: "none" }} aria-label="Bloqueado">
      <span style={{ position: "absolute", left: 3, top: 0, width: 8, height: 8, border: "2px solid #111", borderBottom: "none", borderRadius: "5px 5px 0 0" }} />
      <span style={{ position: "absolute", left: 0, bottom: 0, width: 14, height: 10, border: "2px solid #111" }} />
    </span>
  );
}

export function MeuPlano() {
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const [respostas, salvar] = useRespostasSalvas();
  const [vista, setVista] = useState<"grade" | "lista">("grade");
  const [folha, setFolha] = useState(false);
  const localAtual = respostas?.local ?? RESPOSTAS_PADRAO.local;
  const [novoLocal, setNovoLocal] = useState(localAtual);
  const pausada = demo.estado === "pausada";
  const programa = demo.estado === "programa";
  const p = progressoProtocolo(demo.estado);

  const abrirOferta = () =>
    aviso.mostrar(pausada ? "Abre a tela de reativação da assinatura. Próxima etapa." : "Abre a oferta da assinatura com 50% no primeiro mês. Próxima etapa.");
  const abrir = (n: number) => () => {
    if (situacaoDoTreino(n, demo.estado) === "bloqueado") return abrirOferta();
    const sep = demo.qs ? "&" : "?";
    router.push(`/detalhe/protocolo-${doisDigitos(n)}${demo.qs}${sep}de=plano`);
  };

  const estiloTile = (st: SituacaoTreino) => ({
    bg: st === "atual" ? "var(--accent)" : st === "bloqueado" ? "var(--track)" : "#fff",
    borda: st === "atual" ? "3px solid #111" : st === "bloqueado" ? "1px solid var(--track)" : st === "feito" ? "1px solid #111" : "1px solid var(--line)",
    cor: st === "bloqueado" ? "var(--ink-2)" : "#111",
  });

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div className="rolagem">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px" }}>
          <Logo />
          <Link
            href={`/perfil${demo.qs}`}
            aria-label="Perfil"
            style={{ width: 38, height: 38, border: "2px solid #111", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#111", textDecoration: "none" }}
          >
            {ALUNO_EXEMPLO.iniciais}
          </Link>
        </div>
        <div style={{ padding: "0 20px 24px" }}>
          <h1 className="titulo-tela" style={{ marginBottom: 16 }}>
            Meu plano
          </h1>

          {pausada && (
            <div style={{ border: "var(--border-strong)", padding: 16, display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em" }}>ASSINATURA PAUSADA</div>
              <p className="texto" style={{ lineHeight: 1.4 }}>
                Os {p.feitos} treinos feitos e suas cargas continuam aqui. Reative para seguir do treino {doisDigitos(p.feitos + 1)}.
              </p>
              <button type="button" className="botao botao--destaque" style={{ letterSpacing: ".06em" }} onClick={abrirOferta}>
                Reativar assinatura
              </button>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="rotulo">NÍVEL ATUAL</span>
              <Selo>Intermediário</Selo>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span className="numero-grande" style={{ fontSize: 64, lineHeight: 0.8 }}>
                {doisDigitos(pausada ? p.feitos : p.atual)}
              </span>
              <span className="numero-grande" style={{ fontSize: 20, color: "var(--ink-2)" }}>
                / {TOTAL}
              </span>
            </div>
          </div>
          <div className="segmentos" aria-label={`Treino ${p.atual} de ${TOTAL}`}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <span key={i} className={i < p.feitos ? "feito" : i + 1 === p.atual ? "atual" : undefined} />
            ))}
          </div>
          <div className="rotulo" style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span>01</span>
            <span>24</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, marginBottom: 12 }}>
            <h2 className="titulo-secao">Protocolo</h2>
            <div style={{ display: "flex" }} role="tablist">
              {(["grade", "lista"] as const).map((v, i) => (
                <button
                  type="button"
                  key={v}
                  role="tab"
                  aria-selected={vista === v}
                  onClick={() => setVista(v)}
                  style={{
                    height: 36,
                    padding: "0 12px",
                    background: vista === v ? "#111" : "#fff",
                    color: vista === v ? "#fff" : "#111",
                    border: "2px solid #111",
                    borderLeft: i ? "none" : "2px solid #111",
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {vista === "grade" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Array.from({ length: 6 }, (_, w) => (
                <div key={w} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="rotulo">SEMANA {w + 1}</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
                    {[1, 2, 3, 4].map((k) => {
                      const n = w * 4 + k;
                      const st = situacaoDoTreino(n, demo.estado);
                      const e = estiloTile(st);
                      return (
                        <button
                          type="button"
                          key={n}
                          onClick={abrir(n)}
                          aria-label={`Treino ${n}${st === "bloqueado" ? ", bloqueado" : st === "feito" ? ", feito" : st === "atual" ? ", hoje" : ""}`}
                          style={{ position: "relative", height: 76, background: e.bg, border: e.borda, cursor: "pointer", padding: 8, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start", textAlign: "left" }}
                        >
                          <span className="numero-grande" style={{ fontSize: 32, lineHeight: 0.85, color: e.cor }}>
                            {doisDigitos(n)}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".08em", color: e.cor }}>{st === "atual" ? "HOJE" : st === "feito" ? "FEITO" : ""}</span>
                          {st === "feito" && (
                            <span style={{ position: "absolute", right: 6, top: 6 }}>
                              <Check tamanho={22} />
                            </span>
                          )}
                          {st === "bloqueado" && (
                            <span style={{ position: "absolute", right: 8, top: 8 }}>
                              <CadeadoMini />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ borderTop: "1px solid var(--line)" }}>
              {Array.from({ length: TOTAL }, (_, i) => {
                const n = i + 1;
                const st = situacaoDoTreino(n, demo.estado);
                const tr = TREINOS_TIPO[tipoDoTreino(n)];
                const cor = st === "bloqueado" ? "var(--ink-2)" : "#111";
                return (
                  <button
                    type="button"
                    key={n}
                    onClick={abrir(n)}
                    style={{
                      width: "calc(100% + 16px)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      minHeight: 60,
                      border: "none",
                      borderBottom: n === TOTAL ? "var(--border-strong)" : "1px solid var(--line)",
                      background: st === "atual" ? "var(--accent)" : "#fff",
                      padding: "0 8px",
                      margin: "0 -8px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span className="numero-grande" style={{ fontSize: 28, width: 34, color: cor }}>
                      {doisDigitos(n)}
                    </span>
                    <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 18, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase", lineHeight: 1, color: cor }}>{tr.titulo.join("")}</span>
                      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
                        Semana {Math.ceil(n / 4)} · {tr.duracao}
                      </span>
                    </span>
                    {st === "feito" && <Check tamanho={24} />}
                    {st === "atual" && <Selo>Hoje</Selo>}
                    {st === "bloqueado" && <CadeadoMini />}
                  </button>
                );
              })}
            </div>
          )}

          <h2 className="titulo-secao" style={{ marginTop: 32, marginBottom: 12 }}>
            {programa ? "Programa comprado" : "Seus programas"}
          </h2>
          <div style={{ border: "1px solid #111", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 26, fontWeight: 850, fontStretch: "72%", letterSpacing: "-0.015em", textTransform: "uppercase" }}>{PROGRAMA_GLUTEO.nome}</span>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink-2)" }}>
                {doisDigitos(PROGRAMA_GLUTEO.feitos + 1)} DE {PROGRAMA_GLUTEO.total}
              </span>
            </div>
            <div className="segmentos" style={{ margin: "12px 0 4px" }}>
              {Array.from({ length: PROGRAMA_GLUTEO.total }, (_, i) => (
                <span key={i} className={i < PROGRAMA_GLUTEO.feitos ? "feito" : i === PROGRAMA_GLUTEO.feitos ? "atual" : undefined} />
              ))}
            </div>
            {[0, 1, 2].map((j) => {
              const i = PROGRAMA_GLUTEO.feitos + j;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, height: 48, borderBottom: j === 2 ? "var(--border-strong)" : "1px solid var(--line)" }}>
                  <span className="numero-grande" style={{ fontSize: 24, width: 30 }}>
                    {doisDigitos(i + 1)}
                  </span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: j === 0 ? 800 : 500 }}>{PROGRAMA_GLUTEO.etapas[i]}</span>
                  {j === 0 && <Selo>Próximo</Selo>}
                </div>
              );
            })}
            <button
              type="button"
              className="botao botao--secundario"
              style={{ marginTop: 14 }}
              onClick={() => router.push(`/detalhe/${PROGRAMA_GLUTEO.id}${demo.qs}${demo.qs ? "&" : "?"}de=plano`)}
            >
              Ver programa
            </button>
          </div>

          <button
            type="button"
            className="botao botao--opcao"
            style={{ marginTop: 28, padding: "0 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            onClick={() => {
              setNovoLocal(localAtual);
              setFolha(true);
            }}
          >
            <span>Mudei de local ou de equipamento</span>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path d="M6 3L12 9L6 15" fill="none" stroke="#111" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>
      <RodapeAbas />

      {folha && (
        <>
          <div className="folha-fundo" onClick={() => setFolha(false)} />
          <div className="folha" role="dialog" aria-modal="true" style={{ gap: 10 }}>
            <div style={{ fontSize: 26, fontWeight: 850, fontStretch: "72%", letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 0.95 }}>Onde você treina agora?</div>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.4, marginBottom: 4 }}>Só os equipamentos mudam. Seu nível e seu progresso continuam iguais.</p>
            {LOCAIS.map((l) => {
              const sel = novoLocal === l;
              return (
                <button
                  type="button"
                  key={l}
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setNovoLocal(l)}
                  style={{
                    position: "relative",
                    textAlign: "left",
                    padding: sel ? "16px 54px 16px 14px" : "18px 56px 18px 16px",
                    background: "#fff",
                    border: sel ? "3px solid #111" : "1px solid #111",
                    cursor: "pointer",
                    fontSize: 22,
                    fontWeight: 850,
                    fontStretch: "74%",
                    textTransform: "uppercase",
                    lineHeight: 1,
                  }}
                >
                  {l}
                  {sel && (
                    <span style={{ position: "absolute", right: 14, top: "50%", marginTop: -13 }}>
                      <Check tamanho={26} />
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              className="botao botao--primario"
              style={{ marginTop: 6 }}
              onClick={() => {
                salvar({ ...(respostas ?? {}), local: novoLocal });
                setFolha(false);
                aviso.mostrar("Equipamentos atualizados. Os próximos treinos já usam o novo local.");
              }}
            >
              Atualizar equipamentos
            </button>
          </div>
        </>
      )}
      {aviso.elemento}
    </main>
  );
}
