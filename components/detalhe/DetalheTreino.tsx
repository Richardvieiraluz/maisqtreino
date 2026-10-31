"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TREINO_HOJE } from "@/lib/dados-exemplo";
import { useDemo } from "@/lib/demo";
import { bonecoDe, fotoDe } from "@/lib/midia";
import { PROGRAMA_GLUTEO, tipoDoTreino, TREINOS_TIPO } from "@/lib/plano";
import { RESPOSTAS_PADRAO, useRespostasSalvas } from "@/lib/quiz";
import { useAvisoRapido } from "../AvisoRapido";
import { Cadeado, Check, doisDigitos, Logo, Selo } from "../marca";
import { BotaoVoltar } from "../quiz/pecas";
import { RodapeAbas } from "../RodapeAbas";

/** id: "protocolo-07" (treino 7 do protocolo) ou "programa-gluteo" (próximo treino do programa). */
export function DetalheTreino({ id }: { id: string }) {
  const demo = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const aviso = useAvisoRapido();
  const [respostas] = useRespostasSalvas();
  const pausada = demo.estado === "pausada";
  const ehPrograma = id === PROGRAMA_GLUTEO.id;
  const n = ehPrograma ? 0 : parseInt(id.replace("protocolo-", ""), 10);
  const tipo = tipoDoTreino(n || 1);
  const dados = ehPrograma ? PROGRAMA_GLUTEO.proximo : TREINOS_TIPO[tipo];
  const bloqueado = pausada || (!ehPrograma && demo.estado === "programa" && n > 4);
  const sobretitulo = ehPrograma
    ? `PROGRAMA GLÚTEO · TREINO ${doisDigitos(PROGRAMA_GLUTEO.feitos + 1)} DE ${PROGRAMA_GLUTEO.total}`
    : `PROTOCOLO · TREINO ${doisDigitos(n)} DE 24`;
  const local = respostas?.local ?? RESPOSTAS_PADRAO.local;
  const tituloInteiro = dados.titulo.join("");
  const foto = fotoDe(ehPrograma ? "glúteo" : tituloInteiro);
  const mapa = bonecoDe(`${tituloInteiro} ${dados.exercicios.map((e) => e[0]).join(" ")}`, demo.sexo);
  const abaAtiva = params.get("de") === "inicio" ? "/" : "/plano";

  const abrirOferta = () =>
    aviso.mostrar(pausada ? "Abre a tela de reativação da assinatura. Próxima etapa." : "Abre a oferta da assinatura com 50% no primeiro mês. Próxima etapa.");

  const comecar = () => {
    if (bloqueado) return abrirOferta();
    // Só o treino de exemplo tem execução montada. Os outros entram com o catálogo real.
    if (!ehPrograma && tipo === "A") return router.push(`/treino/${TREINO_HOJE.id}${demo.qs}`);
    aviso.mostrar("A execução deste treino entra quando o catálogo real for ligado.");
  };

  const linha = (k: string, v: React.ReactNode, ultima = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "11px 0", borderBottom: ultima ? "var(--border-strong)" : "1px solid var(--line)" }}>
      <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{k}</span>
      {typeof v === "string" ? <span style={{ fontSize: 18, fontWeight: 850, fontStretch: "76%", textAlign: "right" }}>{v}</span> : v}
    </div>
  );

  const etapaAtual = PROGRAMA_GLUTEO.feitos; // índice do próximo

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div className="rolagem">
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px 8px" }}>
          <BotaoVoltar onClick={() => router.back()} />
          <Logo />
        </div>
        <div style={{ padding: "0 20px" }}>
          <div style={{ position: "relative", height: 240, background: `#fff url(${foto}) center bottom / contain no-repeat` }}>
            {bloqueado && (
              <div style={{ position: "absolute", inset: 0, background: "var(--track)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Cadeado tamanho="grande" />
              </div>
            )}
          </div>
          <div className="rotulo" style={{ marginTop: 16, whiteSpace: "normal" }}>
            {sobretitulo}
          </div>
          <h1 className="titulo-tela" style={{ margin: "8px 0 16px" }}>
            {dados.titulo[0]}
            <span className={bloqueado ? undefined : "destaque"} style={bloqueado ? { padding: "0 4px" } : undefined}>
              {dados.titulo[1]}
            </span>
          </h1>
          {linha("Duração", dados.duracao)}
          {linha("Nível", <Selo>Intermediário</Selo>)}
          {linha("Local", local)}
          {linha("Equipamentos", dados.equipamentos, true)}

          <div className="rotulo" style={{ marginTop: 28, marginBottom: 10 }}>
            MÚSCULOS DO TREINO
          </div>
          <img src={mapa} alt="Mapa muscular do treino, frente e costas" style={{ display: "block", width: "100%", height: 280, objectFit: "contain", background: "#fff", border: "1px solid var(--line)" }} />

          <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 4, borderBottom: "1px solid var(--line)" }}>
            <span className="titulo-secao">Exercícios</span>
            <span className="rotulo">{doisDigitos(dados.exercicios.length)}</span>
          </div>
          {dados.exercicios.map(([nome, series], i) => (
            <div key={nome} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i === dados.exercicios.length - 1 ? "var(--border-strong)" : "1px solid var(--line)" }}>
              <span className="numero-grande" style={{ fontSize: 48, lineHeight: 0.9, width: 44, flex: "none" }}>
                {doisDigitos(i + 1)}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "76%", letterSpacing: "-0.015em", textTransform: "uppercase", lineHeight: 1 }}>{nome}</span>
                <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{series}</span>
              </div>
            </div>
          ))}

          {ehPrograma && (
            <>
              <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 4, borderBottom: "1px solid var(--line)" }}>
                <span className="titulo-secao">Ordem sugerida</span>
                <span className="rotulo">
                  {doisDigitos(etapaAtual + 1)} DE {PROGRAMA_GLUTEO.total}
                </span>
              </div>
              {PROGRAMA_GLUTEO.etapas.map((nome, i) => {
                const feito = i < etapaAtual;
                const proximo = i === etapaAtual;
                return (
                  <div key={nome} style={{ display: "flex", alignItems: "center", gap: 12, height: 48, borderBottom: i === PROGRAMA_GLUTEO.etapas.length - 1 ? "var(--border-strong)" : "1px solid var(--line)" }}>
                    <span className="numero-grande" style={{ fontSize: 24, width: 30, color: feito ? "var(--ink-2)" : "#111" }}>
                      {doisDigitos(i + 1)}
                    </span>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: proximo ? 800 : 500, color: feito ? "var(--ink-2)" : "#111" }}>{nome}</span>
                    {feito && <Check tamanho={24} />}
                    {proximo && <Selo>Próximo</Selo>}
                  </div>
                );
              })}
            </>
          )}
          <div style={{ height: 24 }} />
        </div>
      </div>
      <div style={{ flex: "none", padding: "12px 20px", borderTop: "1px solid var(--line)", background: "#fff" }}>
        <button type="button" className={bloqueado ? "botao botao--destaque" : "botao botao--primario"} onClick={comecar}>
          {bloqueado ? (pausada ? "Reativar assinatura" : "Assinar para liberar") : "Começar treino"}
        </button>
      </div>
      <RodapeAbas ativa={abaAtiva} />
      {aviso.elemento}
    </main>
  );
}
