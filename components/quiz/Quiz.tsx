"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/demo";
import { PERGUNTAS, useRespostasSalvas, type RespostasQuiz } from "@/lib/quiz";
import { Check } from "../marca";
import { AnalisandoFoto, ConfirmarEncontrados, ENCONTRADOS_EXEMPLO, FotoEspaco, ListaEquipamentos } from "./Equipamentos";
import { MapaRegioes } from "./MapaRegioes";
import { CabecalhoQuiz, CardOpcao, estiloNomeOpcao, TituloQuiz } from "./pecas";
import { ResultadoQuiz } from "./ResultadoQuiz";

type Tela = "pergunta" | "lista" | "foto" | "analisando" | "confirmar" | "resultado";

const AVANCO_MS = 280;

export function Quiz() {
  const demo = useDemo();
  const [, salvar] = useRespostasSalvas();
  const [tela, setTela] = useState<Tela>("pergunta");
  const [passo, setPasso] = useState(0);
  const [r, setR] = useState<RespostasQuiz>({ regioes: [], dores: [], equipamentos: [] });
  const [foto, setFoto] = useState<File | null>(null);
  const [encontrados, setEncontrados] = useState<string[]>(ENCONTRADOS_EXEMPLO.filter((e) => !e.talvez).map((e) => e.chave));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Fim da análise: a foto sai da memória e abre a confirmação.
  const aoTerminarAnalise = useCallback(() => {
    setFoto(null);
    setTela("confirmar");
  }, []);

  const q = PERGUNTAS[passo];
  // O boneco segue o sexo escolhido na 1ª pergunta.
  const sexo = r.sexo ? (r.sexo === "Masculino" ? "masculino" : "feminino") : demo.sexo;

  const avancar = useCallback(
    (nova: RespostasQuiz) => {
      if (passo < PERGUNTAS.length - 1) {
        setTela("pergunta");
        setPasso(passo + 1);
      } else {
        salvar(nova);
        setTela("resultado");
      }
    },
    [passo, salvar],
  );

  const escolher = (chave: keyof RespostasQuiz, valor: string) => {
    const nova = { ...r, [chave]: valor };
    setR(nova);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => avancar(nova), AVANCO_MS);
  };

  const alternar = (chave: "regioes" | "dores" | "equipamentos", valor: string) =>
    setR((atual) => {
      let lista = [...(atual[chave] ?? [])];
      if (chave === "dores" && valor === "Nenhuma") {
        lista = lista.includes("Nenhuma") ? [] : ["Nenhuma"];
      } else {
        if (chave === "dores") lista = lista.filter((x) => x !== "Nenhuma");
        lista = lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];
      }
      return { ...atual, [chave]: lista };
    });

  const voltar = () => {
    if (tela === "pergunta") {
      if (passo > 0) setPasso(passo - 1);
    } else if (tela === "analisando" || tela === "confirmar") setTela("foto");
    else setTela("pergunta");
  };

  const fecharEquip = (como: string, itens: string[]) => {
    const nova = { ...r, equip: como, equipamentos: itens };
    setR(nova);
    setTela("pergunta");
    setPasso(6);
  };

  if (tela === "resultado") return <ResultadoQuiz respostas={r} />;

  const multiOk = q.tipo === "mapa" ? (r.regioes?.length ?? 0) > 0 : (r.dores?.length ?? 0) > 0;

  return (
    <main className="app">
      <div className="topo-seguro" />
      <CabecalhoQuiz passo={passo} total={PERGUNTAS.length} onVoltar={voltar} voltarApagado={tela === "pergunta" && passo === 0} />

      {tela === "lista" && (
        <ListaEquipamentos
          marcados={r.equipamentos ?? []}
          onAlternar={(i) => alternar("equipamentos", i)}
          onContinuar={() => fecharEquip("Lista", r.equipamentos ?? [])}
        />
      )}
      {tela === "foto" && (
        <FotoEspaco
          onFoto={(f) => {
            setFoto(f);
            setTela("analisando");
          }}
        />
      )}
      {tela === "analisando" && <AnalisandoFoto arquivo={foto} onPronto={aoTerminarAnalise} />}
      {tela === "confirmar" && (
        <ConfirmarEncontrados
          marcados={encontrados}
          onAlternar={(i) => setEncontrados((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]))}
          onAdicionar={() => {
            setR((a) => ({ ...a, equipamentos: Array.from(new Set([...(a.equipamentos ?? []), ...encontrados])) }));
            setTela("lista");
          }}
          onConfirmar={() => fecharEquip("Foto", encontrados)}
        />
      )}

      {tela === "pergunta" && (
        <div className="rolagem" style={{ padding: "8px 20px calc(24px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column" }}>
          <TituloQuiz partes={q.titulo} />
          <p className="texto" style={{ margin: "0 0 20px", color: "var(--ink-2)" }}>
            {q.sub}
          </p>

          {q.tipo === "lista" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.opcoes?.map(([rotulo, sub]) => (
                <CardOpcao key={rotulo} selecionado={r[q.chave] === rotulo} onClick={() => escolher(q.chave, rotulo)} style={{ minHeight: 64 }}>
                  <span style={estiloNomeOpcao}>{rotulo}</span>
                  {sub && <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{sub}</span>}
                </CardOpcao>
              ))}
            </div>
          )}

          {q.tipo === "grade" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {q.opcoes?.map(([rotulo]) => {
                const sel = r[q.chave] === rotulo;
                return (
                  <button
                    type="button"
                    key={rotulo}
                    role="radio"
                    aria-checked={sel}
                    onClick={() => escolher(q.chave, rotulo)}
                    style={{
                      position: "relative",
                      height: q.alturaGrade,
                      background: "#fff",
                      border: sel ? "3px solid #111" : "1px solid #111",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      justifyContent: "flex-end",
                      padding: sel ? "8px 10px" : "10px 12px",
                      gap: 2,
                    }}
                  >
                    <span className="numero-grande" style={{ fontSize: 56, lineHeight: 0.85 }}>
                      {rotulo}
                    </span>
                    <span className="rotulo">{q.unidade}</span>
                    {sel && (
                      <span style={{ position: "absolute", right: 8, top: 8 }}>
                        <Check tamanho={26} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {q.tipo === "equip" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { n: "1", rotulo: "Academia completa", sub: "Um toque. O protocolo considera todos os aparelhos.", acao: () => escolher("equip", "Academia completa") },
                { n: "2", rotulo: "Marcar numa lista", sub: "Escolha o que você tem, com foto de cada item.", acao: () => setTela("lista") },
                { n: "3", rotulo: "Mandar fotos", sub: "Fotografe seu espaço e a gente identifica.", novo: true, acao: () => setTela("foto") },
              ].map((c) => (
                <button
                  type="button"
                  key={c.n}
                  onClick={c.acao}
                  style={{ textAlign: "left", padding: r.equip === c.rotulo ? 16 : 18, background: "#fff", border: r.equip === c.rotulo ? "3px solid #111" : "1px solid #111", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
                >
                  <span className="numero-grande" style={{ fontSize: 48, lineHeight: 0.85, width: 40, flex: "none" }}>
                    {c.n}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={estiloNomeOpcao}>{c.rotulo}</span>
                      {c.novo && <span className="selo">Novo</span>}
                    </span>
                    <span style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.35 }}>{c.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {q.tipo === "mapa" && <MapaRegioes sexo={sexo} selecionadas={r.regioes ?? []} onAlternar={(k) => alternar("regioes", k)} />}

          {q.tipo === "multi" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {q.opcoes?.map(([rotulo]) => {
                const sel = r.dores?.includes(rotulo) ?? false;
                return (
                  <button
                    type="button"
                    key={rotulo}
                    role="checkbox"
                    aria-checked={sel}
                    onClick={() => alternar("dores", rotulo)}
                    style={{
                      position: "relative",
                      height: 64,
                      textAlign: "left",
                      padding: sel ? "0 42px 0 12px" : "0 44px 0 14px",
                      background: "#fff",
                      border: sel ? "3px solid #111" : "1px solid #111",
                      cursor: "pointer",
                      fontSize: 22,
                      fontWeight: 850,
                      fontStretch: "74%",
                      letterSpacing: "-0.015em",
                      textTransform: "uppercase",
                    }}
                  >
                    {rotulo}
                    {sel && (
                      <span style={{ position: "absolute", right: 10, top: "50%", marginTop: -13 }}>
                        <Check tamanho={26} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {(q.tipo === "mapa" || q.tipo === "multi") && (
            <button type="button" className="botao botao--primario" style={{ marginTop: "auto", flex: "none", position: "relative", top: 12 }} disabled={!multiOk} onClick={() => avancar(r)}>
              Continuar
            </button>
          )}
        </div>
      )}
    </main>
  );
}

