"use client";

import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/demo";
import { REGIOES, RESPOSTAS_PADRAO, type RespostasQuiz } from "@/lib/quiz";
import { doisDigitos, Logo } from "../marca";

const TOTAL = 24;

/** Tela preta "Seu plano está pronto." */
export function ResultadoQuiz({ respostas }: { respostas: RespostasQuiz }) {
  const demo = useDemo();
  const router = useRouter();
  const a = { ...RESPOSTAS_PADRAO, ...respostas };
  const dias = parseInt(a.dias) || 4;
  const programa = demo.estado === "programa";
  const foco = respostas.regioes?.length ? respostas.regioes.map((k) => REGIOES[k]).join(", ") : "Corpo todo";
  const linhas: [string, string][] = [
    ["Nível", a.nivel],
    ["Dias", `${a.dias} por semana`],
    ["Tempo", `${a.tempo} min`],
    ["Local", a.local],
    ["Foco", foco],
  ];

  return (
    <main className="app app--escuro">
      <div className="topo-seguro" />
      <div className="rolagem" style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px calc(24px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", flex: 1 }}>
          <Logo variante="escuro" />
          <h1 className="titulo-capa" style={{ margin: "32px 0 20px" }}>
            Seu plano está <span style={{ color: "var(--accent)" }}>pronto</span>.
          </h1>
          {linhas.map(([k, v], i) => (
            <div
              key={k}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "11px 0", borderBottom: i === linhas.length - 1 ? "3px solid #fff" : "1px solid #5C5C5C" }}
            >
              <span style={{ fontSize: 14, color: "var(--ink-on-dark-2)" }}>{k}</span>
              <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "76%", textAlign: "right" }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 24, marginBottom: 10 }}>
            <span className="rotulo" style={{ color: "var(--ink-on-dark-2)" }}>
              PROTOCOLO · {TOTAL} TREINOS
            </span>
            <span className="rotulo" style={{ color: "var(--ink-on-dark-2)" }}>
              {Math.ceil(TOTAL / dias)} SEMANAS
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 6 }}>
            {Array.from({ length: TOTAL }, (_, i) => {
              const aberto = !programa || i < dias;
              const primeiro = i === 0;
              return (
                <div
                  key={i}
                  style={{
                    height: 38,
                    border: `1px solid ${aberto ? "#fff" : "#5C5C5C"}`,
                    background: primeiro ? "#fff" : "transparent",
                    color: primeiro ? "#111" : aberto ? "#fff" : "#5C5C5C",
                    fontSize: 16,
                    fontWeight: 900,
                    fontStretch: "65%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {doisDigitos(i + 1)}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 14, color: "var(--ink-on-dark-2)", lineHeight: 1.45, marginTop: 12 }}>
            {programa
              ? "Semana 1 liberada com o seu programa. As outras abrem com a assinatura."
              : "Montado com os seus equipamentos. Cada treino ajusta a carga pela sua avaliação."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto", paddingTop: 24 }}>
            <button type="button" className="botao botao--branco" onClick={() => router.push(`/detalhe/protocolo-01${demo.qs}`)}>
              Começar primeiro treino
            </button>
            <button type="button" className="botao botao--contorno-claro" onClick={() => router.push(`/plano${demo.qs}`)}>
              Ver meu plano
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
