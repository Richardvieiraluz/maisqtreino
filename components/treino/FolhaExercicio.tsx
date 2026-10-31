"use client";

import type { Dispatch } from "react";
import { fotoDe } from "@/lib/midia";
import type { Acao, Folha } from "@/lib/sessao";
import type { ExercicioSessao } from "@/lib/tipos";

/** Folha inferior do menu ⋯: trocar por um mais fácil e "Senti dor". */
export function FolhaExercicio({
  nome,
  exercicio,
  folha,
  despachar,
  onEncerrar,
}: {
  nome: string;
  exercicio: ExercicioSessao;
  folha: Exclude<Folha, null>;
  despachar: Dispatch<Acao>;
  onEncerrar: () => void;
}) {
  const fechar = () => despachar({ t: "folha", folha: null });
  const forte = folha === "dorForte";

  return (
    <>
      <div className="folha-fundo" onClick={fechar} />
      <div className="folha" role="dialog" aria-modal="true">
        {folha === "menu" && (
          <>
            <div className="rotulo">{nome}</div>
            <button type="button" className="botao botao--opcao" onClick={() => despachar({ t: "folha", folha: "trocar" })}>
              Trocar por um mais fácil
            </button>
            <button type="button" className="botao botao--opcao" onClick={() => despachar({ t: "folha", folha: "dor" })}>
              Senti dor
            </button>
            <button type="button" className="botao botao--primario" onClick={fechar}>
              Voltar ao exercício
            </button>
          </>
        )}

        {folha === "trocar" && (
          <>
            <div style={{ fontSize: 24, fontWeight: 850, fontStretch: "72%", letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 0.95 }}>
              Trocar por um mais fácil
            </div>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.4 }}>Mesmo músculo, menos exigência. O resto do treino continua igual.</p>
            {exercicio.alternativas.slice(0, 5).map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => despachar({ t: "trocar", nome: a })}
                style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: 8, background: "#fff", border: "1px solid #111", cursor: "pointer" }}
              >
                <img src={fotoDe(a)} alt="" style={{ width: 52, height: 64, flex: "none", objectFit: "cover", objectPosition: "center bottom", background: "#fff", border: "1px solid var(--line)" }} />
                <span style={{ fontSize: 17, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase", lineHeight: 1 }}>{a}</span>
              </button>
            ))}
          </>
        )}

        {folha === "dor" && (
          <>
            <div style={{ fontSize: 24, fontWeight: 850, fontStretch: "72%", letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 0.95 }}>
              Como está a dor?
            </div>
            <button type="button" className="botao botao--opcao" onClick={() => despachar({ t: "folha", folha: "dorLeve" })}>
              Leve, consigo continuar
            </button>
            <button type="button" className="botao botao--opcao" onClick={() => despachar({ t: "folha", folha: "dorForte" })}>
              Forte ou aguda
            </button>
          </>
        )}

        {(folha === "dorLeve" || folha === "dorForte") && (
          <>
            <div className="aviso">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="aviso__icone">!</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em" }}>{forte ? "PARE AGORA" : "DOR LEVE"}</span>
              </div>
              <p style={{ fontSize: 16, lineHeight: 1.45 }}>
                {forte
                  ? "Dor forte não é para treinar por cima. Encerre o treino e procure um profissional de saúde antes de voltar."
                  : "Reduza a carga ou troque por uma versão mais fácil. Se a dor aumentar, pare."}
              </p>
            </div>
            <button
              type="button"
              className="botao botao--primario"
              onClick={() => (forte ? onEncerrar() : despachar({ t: "folha", folha: "trocar" }))}
            >
              {forte ? "Encerrar treino" : "Trocar exercício"}
            </button>
            <button type="button" className="botao botao--secundario" onClick={fechar}>
              Voltar
            </button>
          </>
        )}
      </div>
    </>
  );
}
