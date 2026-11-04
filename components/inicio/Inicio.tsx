"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect } from "react";
import { ALUNO_EXEMPLO, FILEIRAS_CARDS, FILEIRAS_TILES, RAPIDOS_MIN, TREINO_HOJE } from "@/lib/dados-exemplo";
import { useDemo } from "@/lib/demo";
import { useRespostasSalvas } from "@/lib/quiz";
import { bonecoDe, fotoDe, videoDe } from "@/lib/midia";
import { useAvisoRapido } from "../AvisoRapido";
import { Cadeado, doisDigitos, Logo, Selo, TituloDestaque } from "../marca";
import { RodapeAbas } from "../RodapeAbas";
import { CardTreino } from "./CardTreino";
import { useAlunoExibido } from "@/lib/conta";
import type { Proximo } from "@/lib/dados/treinos";
import { useGeracao } from "@/lib/geracao";
import { vitrineFinal, type Fileira } from "@/lib/vitrine";

const LOCAL_ROTULO: Record<string, string> = { casa: "Em casa", condominio: "Condomínio", academia: "Academia" };

/** proximo: treino real do protocolo (logado). Sem ele, a Início mostra o treino de exemplo. */
export function Inicio({ proximo, sequencia, vitrine }: { proximo?: Proximo; sequencia?: number; vitrine?: Fileira[] | null }) {
  const geracao = useGeracao();
  const aluno = useAlunoExibido();
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const [respostas] = useRespostasSalvas();
  const local = respostas?.local ?? TREINO_HOJE.local;
  const pausada = demo.estado === "pausada";
  const real = proximo?.situacao === "pronto" ? proximo : null;
  const palavras = real?.titulo.split(" ") ?? [];
  const t = real
    ? { ...TREINO_HOJE, id: `protocolo-${doisDigitos(real.posicao)}`, nome: real.titulo, palavraDestaque: palavras[palavras.length - 1], duracaoMin: real.duracaoMin, posicaoProtocolo: real.posicao, totalProtocolo: real.total }
    : TREINO_HOJE;
  const nExercicios = real ? real.exercicios : TREINO_HOJE.exercicios.length;
  const localHoje = real ? (LOCAL_ROTULO[real.local] ?? local) : local;
  const posicao = `PROTOCOLO ${doisDigitos(t.posicaoProtocolo)} / ${t.totalProtocolo}`;

  // Treino novo ficou pronto enquanto a tela estava aberta: busca de novo.
  const prontos = geracao?.prontos ?? 0;
  const montando = proximo?.situacao === "montando";
  useEffect(() => {
    if (montando && prontos > 0) router.refresh();
  }, [montando, prontos, router]);

  const abrirOferta = () => router.push(`${pausada ? "/reativar" : "/oferta"}${demo.qs}`);

  const sep = demo.qs ? "&" : "?";
  const abrirDetalhe = (id: string) => router.push(`/detalhe/${id}${demo.qs}${sep}de=inicio`);

  const comecar = () => {
    if (pausada) return abrirOferta();
    router.push(`/treino/${t.id}${demo.qs}`);
  };

  const fileiraCards = (f: (typeof FILEIRAS_CARDS)[number]) => (
          <section className="fileira" key={f.titulo}>
            <div className="fileira-cabeca">
              <h2 className="titulo-secao">{f.titulo}</h2>
              <button type="button" className="ver-tudo rotulo" onClick={() => router.push(`/ver-tudo${demo.qs}${sep}fileira=${encodeURIComponent(f.titulo)}`)}>
                VER TUDO
              </button>
            </div>
            <div className="fileira-trilho">
              {f.itens.map((c) => {
                const bloqueado = pausada || (demo.estado === "programa" && !c.doPrograma);
                return (
                  <CardTreino
                    key={c.id}
                    card={c}
                    sexo={demo.sexo}
                    bloqueado={bloqueado}
                    onToque={bloqueado ? abrirOferta : () => abrirDetalhe(c.id === "programa-gluteo" ? "programa-gluteo" : `protocolo-${doisDigitos(t.posicaoProtocolo)}`)}
                  />
                );
              })}
            </div>
          </section>
  );
  const fileiraTiles = (f: (typeof FILEIRAS_TILES)[number]) => (
          <section className="fileira" key={f.titulo}>
            <h2 className="titulo-secao" style={{ padding: "0 20px", marginBottom: 12 }}>
              {f.titulo}
            </h2>
            <div className="fileira-trilho fileira-trilho--tiles">
              {f.itens.map((n) => (
                <button type="button" className="tile" key={n} onClick={() => router.push(`/busca${demo.qs}${sep}q=${encodeURIComponent(n)}`)}>
                  {n}
                </button>
              ))}
            </div>
          </section>
  );
  const lesoes = (
<button
          type="button"
          onClick={() => router.push(`/lesoes${demo.qs}`)}
          style={{ margin: "32px 20px 0", width: "calc(100% - 40px)", background: "#111", color: "#fff", padding: 16, display: "flex", alignItems: "center", gap: 14, border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="rotulo" style={{ color: "var(--ink-on-dark-2)" }}>
              LESÕES · 4 TRILHAS
            </span>
            <span style={{ fontSize: 26, fontWeight: 850, fontStretch: "70%", letterSpacing: "-0.015em", textTransform: "uppercase", lineHeight: 0.95 }}>
              Treinar com dor, do jeito certo
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-on-dark-2)" }}>Lombar, joelho, ombro e quadril</span>
          </span>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path d="M6 3L12 9L6 15" fill="none" stroke="#fff" strokeWidth="2" />
          </svg>
        </button>
  );
  const rapidos = (
<section style={{ margin: "32px 0" }}>
          <h2 className="titulo-secao" style={{ padding: "0 20px", marginBottom: 12 }}>
            Rápidos
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, padding: "0 20px" }}>
            {RAPIDOS_MIN.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => router.push(`/ver-tudo${demo.qs}${sep}fileira=R%C3%A1pidos`)}
                style={{ border: "1px solid #111", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2, background: "#fff", cursor: "pointer", textAlign: "left" }}
              >
                <span className="numero-grande" style={{ fontSize: 48, lineHeight: 0.9 }}>
                  {m}
                </span>
                <span className="rotulo">MINUTOS</span>
              </button>
            ))}
          </div>
        </section>
  );

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div className="rolagem">
        {/* Cabeçalho: logo, sequência e perfil */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px" }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="numero-grande" style={{ fontSize: 34 }}>
                {sequencia ?? ALUNO_EXEMPLO.sequenciaDias}
              </span>
              <span className="rotulo" style={{ fontSize: 10, lineHeight: 1.15 }}>
                DIAS
                <br />
                SEGUIDOS
              </span>
            </div>
            <Link
              href={`/perfil${demo.qs}`}
              aria-label="Perfil"
              style={{ width: 38, height: 38, border: "2px solid #111", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#111", textDecoration: "none" }}
            >
              {aluno.iniciais}
            </Link>
          </div>
        </div>

        {/* Busca */}
        <div style={{ padding: "0 20px 20px" }}>
          <button
            type="button"
            onClick={() => router.push(`/busca${demo.qs}`)}
            style={{ width: "100%", height: 46, border: "1px solid #111", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", background: "#fff", cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <circle cx="7.5" cy="7.5" r="5.5" fill="none" stroke="#111" strokeWidth="2" />
              <path d="M11.5 11.5L16 16" stroke="#111" strokeWidth="2" />
            </svg>
            <span style={{ fontSize: 15, color: "#757575" }}>Treino, região ou aparelho</span>
          </button>
        </div>

        {pausada && (
          <div style={{ margin: "0 20px 24px", border: "var(--border-strong)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em" }}>ASSINATURA PAUSADA</div>
            <p className="texto" style={{ lineHeight: 1.4 }}>
              Seu histórico, fotos e medidas continuam guardados. Reative para voltar a treinar de onde parou.
            </p>
            <button type="button" className="botao botao--destaque" style={{ letterSpacing: ".06em" }} onClick={abrirOferta}>
              Reativar assinatura
            </button>
          </div>
        )}

        {demo.diaDescanso ? (
          <section style={{ padding: "0 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <span className="rotulo">HOJE · DIA DE DESCANSO</span>
              <span className="rotulo">{posicao}</span>
            </div>
            <div style={{ border: "var(--border-strong)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <h1 className="titulo-tela">
                Hoje o músculo <span className="destaque">recupera</span>.
              </h1>
              <p className="texto">É no descanso que o treino de ontem vira força. A sequência não quebra.</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <img
                  src={fotoDe(t.nome)}
                  alt=""
                  style={{ width: 64, height: 80, flex: "none", objectFit: "cover", objectPosition: "center bottom", border: "1px solid var(--line)", background: "#fff" }}
                />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span className="rotulo">PRÓXIMO · AMANHÃ, {ALUNO_EXEMPLO.proximoTreinoHora}</span>
                  <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "74%", textTransform: "uppercase", lineHeight: 1 }}>{t.nome}</span>
                  <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
                    {t.duracaoMin} min · {local}
                  </span>
                </div>
              </div>
              <button type="button" className="botao botao--secundario" onClick={() => abrirDetalhe(`protocolo-${doisDigitos(t.posicaoProtocolo)}`)}>
                Ver o próximo treino
              </button>
            </div>
            <p className="texto-apoio" style={{ marginTop: 10 }}>
              Quer se mexer mesmo assim? Mobilidade e alongamento leves estão em Rápidos.
            </p>
          </section>
        ) : proximo && proximo.situacao !== "pronto" ? (
          <section style={{ padding: "0 20px" }}>
            <span className="rotulo">SEU TREINO DE HOJE</span>
            <div style={{ border: "var(--border-strong)", padding: 16, display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
              {proximo.situacao === "sem_protocolo" ? (
                <>
                  <h1 className="titulo-tela">
                    Falta o seu <span className="destaque">quiz</span>
                  </h1>
                  <p className="texto">São 10 perguntas. Com elas eu monto os seus treinos com o equipamento que você tem.</p>
                  <button type="button" className="botao botao--primario" onClick={() => router.push("/quiz")}>
                    Responder o quiz
                  </button>
                </>
              ) : proximo.situacao === "concluido" ? (
                <>
                  <h1 className="titulo-tela">
                    Protocolo <span className="destaque">completo</span>
                  </h1>
                  <p className="texto">Você fez os {proximo.total} treinos. Refaça o quiz para montar o próximo protocolo.</p>
                  <button type="button" className="botao botao--primario" onClick={() => router.push("/quiz")}>
                    Refazer o quiz
                  </button>
                </>
              ) : (
                <>
                  <h1 className="titulo-tela">
                    Montando o seu <span className="destaque">treino</span>
                  </h1>
                  <p className="texto">
                    {geracao?.indisponivel
                      ? "A montagem automática ainda não está ligada. Assim que estiver, seus treinos aparecem aqui."
                      : geracao?.comErro
                        ? "Um treino não saiu como deveria e foi para revisão. Assim que estiver pronto, aparece aqui."
                        : "Cada treino é montado com o seu equipamento, o seu nível e o tempo que você tem. Leva uns minutos e você pode usar o app enquanto isso."}
                  </p>
                  {geracao && !geracao.indisponivel && (
                    <span className="rotulo">
                      {geracao.rodando ? "MONTANDO AGORA" : "NA FILA"} · {proximo.feitos} DE {proximo.total} FEITOS
                    </span>
                  )}
                  <button type="button" className="botao botao--secundario" onClick={() => router.refresh()}>
                    Atualizar
                  </button>
                </>
              )}
            </div>
          </section>
        ) : (
          <section style={{ padding: "0 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <span className="rotulo">SEU TREINO DE HOJE</span>
              <span className="rotulo">{posicao}</span>
            </div>
            <div style={{ position: "relative", height: 260, background: "#fff", borderBottom: "var(--border-strong)", overflow: "hidden" }}>
              <video
                src={real?.video ?? videoDe("elevacao-pelvica-com-barra")}
                autoPlay
                muted
                loop
                playsInline
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 60%" }}
              />
              {!real && (
                <img
                  src={bonecoDe("posterior glúteo", demo.sexo)}
                  alt="Mapa muscular: glúteo e posterior"
                  style={{ position: "absolute", right: 12, top: 12, width: 110, height: 92, objectFit: "contain", background: "#fff", border: "1px solid #111" }}
                />
              )}
              {pausada && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(226,225,220,.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Cadeado tamanho="grande" />
                </div>
              )}
            </div>
            <h1 className="titulo-tela" style={{ margin: "16px 0 10px" }}>
              <TituloDestaque texto={t.nome} palavra={t.palavraDestaque} semDestaque={pausada} />
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
                {t.duracaoMin} min · {nExercicios} exercícios · {localHoje}
              </span>
              <Selo>{t.nivel}</Selo>
            </div>
            <button type="button" className="botao botao--primario" onClick={comecar}>
              {pausada ? "Reativar para treinar" : "Começar"}
            </button>
          </section>
        )}

        {/* Fileiras na ordem da vitrine (Master > Vitrine) */}
        {vitrineFinal(vitrine)
          .filter((v) => v.visivel)
          .map((v) => {
            const fc = FILEIRAS_CARDS.find((x) => x.titulo === v.titulo);
            if (fc) return fileiraCards(fc);
            const ft = FILEIRAS_TILES.find((x) => x.titulo === v.titulo);
            if (ft) return fileiraTiles(ft);
            if (v.titulo === "Lesões") return <Fragment key="lesoes">{lesoes}</Fragment>;
            if (v.titulo === "Rápidos") return <Fragment key="rapidos">{rapidos}</Fragment>;
            return null;
          })}
      </div>
      <RodapeAbas />
      {aviso.elemento}
    </main>
  );
}
