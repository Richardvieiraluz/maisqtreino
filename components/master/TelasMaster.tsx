"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { aprovarExplicacoesAction, auditarProtocoloAction, convidarAlunoAction, gerarExplicacoesAction, liberarAcessoAction, publicarVitrineAction, reenviarLoginAction, salvarExplicacaoAction } from "@/lib/acoes/master";
import type { ExplicacoesDados, ExplicacaoMaster, ProtocolosDados, StatusExplicacao } from "@/lib/dados/master-conteudo";
import { vitrineFinal, type Fileira } from "@/lib/vitrine";
import type { FichaDados, ProdutoOpcao } from "@/lib/dados/master";
import type { AlunoLista, PainelDados, Parado, Periodo } from "@/lib/master-calculos";
import { ALUNOS, AUDITORIA, AVALIACOES, diasDesde, EXPLICACOES, EXPLICACOES_OUTRAS, FUNIL as FUNIL_EXEMPLO, iniciais, MAIS_TROCADOS, PAINEL as PAINEL_EXEMPLO, PARADOS as PARADOS_EXEMPLO } from "@/lib/master-exemplo";
import { useAvisoRapido } from "../AvisoRapido";
import { MiniVideo } from "../MiniVideo";
import { doisDigitos, Selo } from "../marca";
import { cartao, LayoutMaster, pagina, Segmentado, TituloMaster } from "./LayoutMaster";

const fmtNum = (n: number) => n.toLocaleString("pt-BR");
const linhaFinal = (i: number, n: number) => (i === n - 1 ? "var(--border-strong)" : "1px solid var(--line)");
const tituloSecao: React.CSSProperties = { marginTop: 28, marginBottom: 10 };

function Numero({ rotulo, valor, sub }: { rotulo: string; valor: string; sub: string }) {
  return (
    <div style={{ ...cartao, padding: 14 }}>
      <div className="rotulo">{rotulo}</div>
      <div className="numero-grande" style={{ fontSize: 48, lineHeight: 0.9, marginTop: 6 }}>
        {valor}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

// ── Painel ───────────────────────────────────────────────────────────────────

export function PainelMaster({ dados }: { dados?: PainelDados }) {
  const real = !!dados;
  const PAINEL: PainelDados = dados ?? PAINEL_EXEMPLO;
  const maior = Math.max(1, ...PAINEL.faturamento.map((f) => f[2]));
  const mes = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return (
    <LayoutMaster aviso={real ? "VALORES EM REAIS ENTRAM COM A EDUZZ" : undefined}>
      <div style={pagina}>
        <TituloMaster sub={`${mes[0].toUpperCase()}${mes.slice(1)}, até hoje.`}>Painel</TituloMaster>
        <div style={{ ...cartao, padding: 16 }}>
          <div className="rotulo">ALUNOS ATIVOS</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
            <span className="numero-grande" style={{ fontSize: 64, lineHeight: 0.85 }}>
              {fmtNum(PAINEL.ativos)}
            </span>
            <Selo>+{PAINEL.novosNoMes} no mês</Selo>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>Treinaram pelo menos uma vez nos últimos 14 dias.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <Numero rotulo="MENSAL" valor={String(PAINEL.mensal)} sub="assinantes" />
          <Numero rotulo="ANUAL" valor={String(PAINEL.anual)} sub="assinantes" />
        </div>

        <h2 className="titulo-secao" style={tituloSecao}>
          {real ? "Acessos ativos por produto" : "Faturamento por produto"}
        </h2>
        <div style={{ ...cartao, padding: "4px 14px 14px" }}>
          {PAINEL.faturamento.map(([nome, vendas, pct], i) => (
            <div key={nome} style={{ padding: "10px 0", borderBottom: linhaFinal(i, PAINEL.faturamento.length) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</span>
                <span style={{ flex: "none", fontSize: 13, color: "var(--ink-2)", whiteSpace: "nowrap" }}>{vendas}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <div className="trilho" style={{ flex: 1 }}>
                  <span style={{ width: `${(pct / maior) * 100}%`, background: i === 0 ? "var(--accent)" : "#111", transition: "none" }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 850, fontStretch: "76%", width: 56, textAlign: "right" }}>{pct}%</span>
              </div>
            </div>
          ))}
          {!PAINEL.faturamento.length && <p style={{ fontSize: 14, padding: "12px 0 0" }}>Nenhum acesso ativo ainda.</p>}
          <p style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 10 }}>
            {real ? "Barras mostram a parte de cada produto nos acessos ativos. Valores em reais entram com a Eduzz." : "Valores em reais vêm da Eduzz. Barras mostram a parte de cada produto no total do mês."}
          </p>
        </div>

        <h2 className="titulo-secao" style={tituloSecao}>
          Programa → assinatura
        </h2>
        <div style={{ ...cartao, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <span className="numero-grande" style={{ fontSize: 64, lineHeight: 0.85 }}>
            {PAINEL.conversao.pct}%
          </span>
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>
            dos {PAINEL.conversao.compraram} que compraram um programa assinaram depois.
            {PAINEL.conversao.comCupom !== undefined && ` Com o cupom de 50%: ${PAINEL.conversao.assinaramComCupom} dos ${PAINEL.conversao.comCupom}.`}
          </span>
        </div>

        <Link
          href="/master/parou"
          style={{ marginTop: 20, height: 64, padding: "0 16px", background: "#fff", border: "var(--border-strong)", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "#111" }}
        >
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="rotulo">PRECISA DE ATENÇÃO</span>
            <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase" }}>Quem parou de treinar</span>
          </span>
          <span className="numero-grande" style={{ fontSize: 40 }}>
            {PAINEL.pararam}
          </span>
        </Link>
      </div>
    </LayoutMaster>
  );
}

// ── Funil ────────────────────────────────────────────────────────────────────

export function FunilMaster({ dados }: { dados?: Record<Periodo, [number, number, number]> }) {
  const FUNIL = dados ?? FUNIL_EXEMPLO;
  const [periodo, setPeriodo] = useState<Periodo>("30 DIAS");
  const P = FUNIL[periodo];
  const pct = (v: number, de: number) => (de ? Math.round((v / de) * 100) : 0);
  const quedas = [pct(P[0] - P[1], P[0]), pct(P[1] - P[2], P[1])];
  const etapas: [string, number][] = [
    ["FIZERAM O QUIZ", P[0]],
    ["TREINARAM NA SEMANA LIBERADA", P[1]],
    ["ASSINARAM", P[2]],
  ];
  return (
    <LayoutMaster aviso={dados ? null : undefined}>
      <div style={pagina}>
        <TituloMaster sub="Quem comprou um programa e fez o quiz.">Funil do quiz</TituloMaster>
        <div style={{ marginBottom: 18 }}>
          <Segmentado opcoes={Object.keys(FUNIL) as (keyof typeof FUNIL)[]} valor={periodo} onTroca={setPeriodo} />
        </div>
        {etapas.map(([k, v], i) => {
          const ultima = i === etapas.length - 1;
          const prox = etapas[i + 1];
          return (
            <div key={k}>
              <div style={{ background: "#fff", border: ultima ? "var(--border-strong)" : "1px solid #111", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="rotulo" style={{ whiteSpace: "normal" }}>
                    0{i + 1} · {k}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{pct(v, P[0])}%</span>
                </div>
                <div className="numero-grande" style={{ fontSize: 56, lineHeight: 0.9, margin: "6px 0 10px" }}>
                  {fmtNum(v)}
                </div>
                <div className="trilho">
                  <span style={{ width: `${pct(v, P[0])}%`, background: ultima ? "var(--accent)" : "#111", transition: "none" }} />
                </div>
              </div>
              {prox && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0 10px 16px" }}>
                  <div style={{ width: 3, height: 28, background: "#111" }} />
                  <span style={{ fontSize: 14 }}>
                    <b style={{ fontWeight: 800 }}>−{quedas[i]}%</b> {i === 0 ? "não treinaram na semana liberada" : "treinaram, mas não assinaram"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        <div className="ajuste" style={{ marginTop: 18 }}>
          {!dados ? (
            <>
              <b>Maior queda:</b> entre treinar a semana liberada e assinar. Quem treinou 3 ou mais vezes assina 2,4× mais.
            </>
          ) : !P[0] ? (
            <>
              <b>Sem dados no período:</b> ninguém que comprou um programa fez o quiz ainda.
            </>
          ) : (
            <>
              <b>Maior queda:</b> {quedas[0] >= quedas[1] ? "entre fazer o quiz e treinar a semana liberada" : "entre treinar a semana liberada e assinar"}.
            </>
          )}
        </div>
      </div>
    </LayoutMaster>
  );
}

// ── Alunos e ficha ───────────────────────────────────────────────────────────

const FILTROS = ["Todos", "Assinantes", "Programa", "Pausada", "Parados há 7+ dias"];

const campoMaster: React.CSSProperties = { height: 48, border: "1px solid #111", padding: "0 12px", fontSize: 16, color: "#111", background: "#fff", width: "100%" };
const rotuloMaster: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".09em", color: "var(--ink-2)", margin: "12px 0 6px", display: "block" };

/** Escolha de produto, usada no convite e no "Liberar acesso". */
function SeletorProduto({ produtos, valor, onTroca, comNenhum }: { produtos: ProdutoOpcao[]; valor: string; onTroca: (v: string) => void; comNenhum?: boolean }) {
  return (
    <select value={valor} onChange={(e) => onTroca(e.target.value)} style={{ ...campoMaster, appearance: "auto" }} aria-label="Produto">
      {comNenhum && <option value="">Só criar a conta, sem acesso</option>}
      {produtos.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nome}
        </option>
      ))}
    </select>
  );
}

function Folha({ titulo, children, onFechar }: { titulo: string; children: React.ReactNode; onFechar: () => void }) {
  return (
    <>
      <div className="folha-fundo" onClick={onFechar} />
      <div className="folha" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxHeight: "90%", overflowY: "auto" }}>
        <div style={{ fontSize: 26, fontWeight: 850, fontStretch: "72%", letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 0.95 }}>{titulo}</div>
        {children}
      </div>
    </>
  );
}

export function AlunosMaster({ alunos, produtos }: { alunos?: AlunoLista[]; produtos?: ProdutoOpcao[] }) {
  const router = useRouter();
  const aviso = useAvisoRapido();
  const real = !!alunos;
  const base: AlunoLista[] = alunos ?? ALUNOS.map((a) => ({ ...a, dias: diasDesde(a.ultimoTreino), nunca: false }));
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [convite, setConvite] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [produto, setProduto] = useState(produtos?.[0]?.id ?? "");
  const [enviando, setEnviando] = useState(false);

  const lista = base.filter((a) => {
    if (q && !`${a.nome} ${a.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filtro === "Assinantes") return a.estado === "assinante";
    if (filtro === "Programa") return a.estado === "programa";
    if (filtro === "Pausada") return a.estado === "pausada";
    if (filtro === "Parados há 7+ dias") return a.dias >= 7;
    return true;
  });

  const enviarConvite = async () => {
    if (!real) return aviso.mostrar("O convite funciona quando o banco estiver ligado.");
    if (enviando) return;
    setEnviando(true);
    const r = await convidarAlunoAction(nome, email, produto).catch(() => ({ ok: false as const, error: "Sem conexão. Tente de novo." }));
    setEnviando(false);
    if (!r.ok) return aviso.mostrar(r.error);
    setConvite(false);
    setNome("");
    setEmail("");
    aviso.mostrar(r.msg);
    router.refresh();
  };

  return (
    <LayoutMaster aviso={real ? null : undefined}>
      <div style={pagina}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <TituloMaster>Alunos</TituloMaster>
          <button type="button" className="botao botao--secundario" style={{ width: "auto", height: 40, padding: "0 12px", fontSize: 12, letterSpacing: ".06em", flex: "none" }} onClick={() => setConvite(true)}>
            Convidar aluno
          </button>
        </div>
        <label style={{ height: 46, border: "1px solid #111", background: "#fff", display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <circle cx="7.5" cy="7.5" r="5.5" fill="none" stroke="#111" strokeWidth="2" />
            <path d="M11.5 11.5L16 16" stroke="#111" strokeWidth="2" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou e-mail" aria-label="Buscar aluno" style={{ border: "none", flex: 1, fontSize: 15, color: "#111", background: "transparent" }} />
        </label>
        <div className="fileira-trilho" style={{ gap: 6, margin: "12px -20px 4px" }}>
          {FILTROS.map((f) => (
            <button
              type="button"
              key={f}
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
              style={{ flex: "none", height: 36, padding: "0 12px", background: filtro === f ? "#111" : "#fff", color: filtro === f ? "#fff" : "#111", border: filtro === f ? "2px solid #111" : "1px solid #111", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="rotulo" style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 6px", borderBottom: "1px solid var(--line)" }}>
          <span>
            {lista.length} {lista.length === 1 ? "ALUNO" : "ALUNOS"}
          </span>
          <span>ÚLTIMO TREINO</span>
        </div>
        {!base.length && <p style={{ fontSize: 14, padding: "16px 0" }}>Nenhum aluno ainda. Use Convidar aluno para dar acesso a alguém.</p>}
        {lista.map((a, j) => (
          <Link
            key={a.id}
            href={`/master/alunos/${a.id}`}
            style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "8px 0", borderBottom: linhaFinal(j, lista.length), textDecoration: "none", color: "#111" }}
          >
            <span style={{ width: 40, height: 40, flex: "none", border: "2px solid #111", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{iniciais(a.nome)}</span>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nome}</span>
              <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{a.produto}</span>
                {a.estado === "pausada" && <Selo pequeno>Pausada</Selo>}
              </span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: a.dias >= 7 ? "#111" : "var(--ink-2)", flex: "none" }}>{a.ultimoTreino}</span>
          </Link>
        ))}
      </div>
      {convite && (
        <Folha titulo="Convidar aluno" onFechar={() => setConvite(false)}>
          <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.4 }}>A pessoa recebe um e-mail para criar a senha. Assinatura liberada aqui vale 30 dias (mensal) ou 1 ano (anual).</p>
          <label style={rotuloMaster} htmlFor="conv-nome">
            NOME
          </label>
          <input id="conv-nome" value={nome} onChange={(e) => setNome(e.target.value)} style={campoMaster} autoComplete="off" />
          <label style={rotuloMaster} htmlFor="conv-email">
            E-MAIL
          </label>
          <input id="conv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={campoMaster} autoComplete="off" />
          <label style={rotuloMaster}>ACESSO</label>
          <SeletorProduto produtos={produtos ?? []} valor={produto} onTroca={setProduto} comNenhum />
          <button type="button" className="botao botao--primario" style={{ marginTop: 16 }} onClick={enviarConvite}>
            {enviando ? "Enviando" : "Enviar convite"}
          </button>
        </Folha>
      )}
      {aviso.elemento}
    </LayoutMaster>
  );
}

export function FichaAluno({ id, ficha, produtos }: { id: string; ficha?: FichaDados; produtos?: ProdutoOpcao[] }) {
  const router = useRouter();
  const aviso = useAvisoRapido();
  const [liberar, setLiberar] = useState(false);
  const [produto, setProduto] = useState(produtos?.[0]?.id ?? "");
  const [enviando, setEnviando] = useState(false);
  const a = ALUNOS.find((x) => x.id === id) ?? ALUNOS[0];
  const q = ficha?.quiz;
  const lista = (v?: string[]) => (v?.length ? v.join(", ") : "Nenhuma");
  const nome = ficha ? ficha.nome : a.nome;
  const email = ficha ? ficha.email : a.email;

  const grupos: [string, [string, string][]][] = ficha
    ? [
        ["CONTA", [["Desde", ficha.desde], ["Situação", ficha.estado]]],
        ["PRODUTOS", ficha.produtos.length ? ficha.produtos.map((p) => [p.nome, p.situacao] as [string, string]) : [["Compras", "Nenhuma"]]],
        q
          ? ["QUIZ", [["Objetivo", q.objetivo ?? "-"], ["Nível", q.nivel ?? "-"], ["Dias e tempo", `${q.dias ?? "-"} · ${q.tempo ?? "-"}`], ["Foco", lista(q.regioes)], ["Dores", lista(q.dores)]]]
          : ["QUIZ", [["Respostas", "Ainda não fez o quiz"]]],
        ["EQUIPAMENTOS", q ? [["Local", q.local ?? "-"], ["Itens", q.equip === "Academia completa" ? "Academia completa" : lista(q.equipamentos)], ["Informado por", q.equip ?? "-"]] : [["Itens", "Ainda não informou"]]],
        ["TREINOS", [["Feitos", String(ficha.treinos.total)], ["Último", ficha.treinos.ultimo ?? "Nunca treinou"]]],
      ]
    : [
        ["PRODUTOS", [["Atual", a.produto], ["Desde", "12 ago 2026"], ["Estado", a.estado === "pausada" ? "Pausada · cartão recusado" : "Ativo"]]],
        ["QUIZ", [["Objetivo", "Ganhar massa muscular"], ["Nível", "Intermediário"], ["Dias e tempo", "4 por semana · 40 min"], ["Foco", "Glúteo, posterior"], ["Dores", "Lombar"]]],
        ["EQUIPAMENTOS", [["Local", "Em casa"], ["Itens", "Halter, elástico, banco, mini band"], ["Informado por", "Fotos · conferido"]]],
      ];

  const avaliacoes: [string, number][] = ficha ? [["FÁCIL", ficha.treinos.facil], ["IDEAL", ficha.treinos.ideal], ["DIFÍCIL", ficha.treinos.dificil]] : [["FÁCIL", 1], ["IDEAL", 6], ["DIFÍCIL", 1]];

  const executar = async (acao: () => Promise<{ ok: true; msg: string } | { ok: false; error: string }>) => {
    if (enviando) return;
    setEnviando(true);
    const r = await acao().catch(() => ({ ok: false as const, error: "Sem conexão. Tente de novo." }));
    setEnviando(false);
    aviso.mostrar(r.ok ? r.msg : r.error);
    if (r.ok) {
      setLiberar(false);
      router.refresh();
    }
  };

  return (
    <LayoutMaster voltar="/master/alunos" aviso={ficha ? null : undefined}>
      <div style={pagina}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <span style={{ width: 56, height: 56, border: "var(--border-strong)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, fontStretch: "70%", flex: "none" }}>{iniciais(nome)}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 28, fontWeight: 850, fontStretch: "70%", letterSpacing: "-0.02em", lineHeight: 0.95, textTransform: "uppercase" }}>{nome}</span>
            <span style={{ fontSize: 13, color: "var(--ink-2)", overflowWrap: "anywhere" }}>{email}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "16px 0 24px" }}>
          <button type="button" className="botao botao--primario" style={{ fontSize: 13, letterSpacing: ".06em" }} onClick={() => (ficha ? setLiberar(true) : aviso.mostrar(`Acesso liberado para ${a.nome}. Vale até a próxima cobrança.`))}>
            Liberar acesso
          </button>
          <button
            type="button"
            className="botao botao--secundario"
            style={{ fontSize: 13, letterSpacing: ".06em" }}
            onClick={() => (ficha ? executar(() => reenviarLoginAction(ficha.id)) : aviso.mostrar(`Login reenviado para ${a.email}.`))}
          >
            Reenviar login
          </button>
        </div>
        {grupos.map(([titulo, linhas]) => (
          <div key={titulo} style={{ ...cartao, padding: "4px 14px 2px", marginBottom: 12 }}>
            <div className="rotulo" style={{ padding: "10px 0 6px", borderBottom: "1px solid var(--line)" }}>
              {titulo}
            </div>
            {linhas.map(([k, v], i) => (
              <div key={k + i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, padding: "10px 0", borderBottom: linhaFinal(i, linhas.length) }}>
                <span style={{ fontSize: 14, color: "var(--ink-2)", flex: "none", maxWidth: "45%" }}>{k}</span>
                <span style={{ fontSize: 15, fontWeight: 800, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ ...cartao, padding: 14 }}>
          {ficha ? (
            <div className="rotulo" style={{ marginBottom: 8 }}>
              AVALIAÇÃO DOS TREINOS
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span className="rotulo">PROTOCOLO</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>09 de 24</span>
              </div>
              <div className="segmentos" style={{ gap: 4 }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <span key={i} className={i < 8 ? "feito" : i === 8 ? "atual" : undefined} />
                ))}
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: ficha ? 0 : 14 }}>
            {avaliacoes.map(([k, v]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="numero-grande" style={{ fontSize: 32, lineHeight: 0.9 }}>
                  {v}
                </span>
                <span className="rotulo">{k}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 12, lineHeight: 1.4 }}>Fotos do corpo e medidas não aparecem aqui. Só o aluno vê.</p>
      </div>
      {liberar && ficha && (
        <Folha titulo="Liberar acesso" onFechar={() => setLiberar(false)}>
          <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.4 }}>Assinatura liberada aqui vale 30 dias (mensal) ou 1 ano (anual). Programa é vitalício.</p>
          <label style={rotuloMaster}>PRODUTO</label>
          <SeletorProduto produtos={produtos ?? []} valor={produto} onTroca={setProduto} />
          <button type="button" className="botao botao--primario" style={{ marginTop: 16 }} onClick={() => executar(() => liberarAcessoAction(ficha.id, produto))}>
            {enviando ? "Liberando" : "Liberar"}
          </button>
        </Folha>
      )}
      {aviso.elemento}
    </LayoutMaster>
  );
}

// ── Quem parou ───────────────────────────────────────────────────────────────

export function QuemParou({ dados }: { dados?: Parado[] }) {
  const aviso = useAvisoRapido();
  const [minimo, setMinimo] = useState(10);
  const base: (Omit<Parado, "id"> & { id?: string })[] = dados ?? PARADOS_EXEMPLO;
  const lista = base.filter((p) => p.dias >= minimo).sort((a, b) => a.dias - b.dias);
  return (
    <LayoutMaster voltar="/master" aviso={dados ? "MENSAGENS AUTOMÁTICAS AINDA NÃO LIGADAS" : undefined}>
      <div style={pagina}>
        <TituloMaster sub="Sem treinar há pelo menos:">Quem parou</TituloMaster>
        <div style={{ marginBottom: 16 }}>
          <Segmentado
            opcoes={[5, 10, 15]}
            valor={minimo}
            onTroca={setMinimo}
            altura={56}
            render={(n) => (
              <span style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
                <span className="numero-grande" style={{ fontSize: 28, letterSpacing: 0 }}>
                  {n}
                </span>
                <span>DIAS</span>
              </span>
            )}
          />
        </div>
        <div className="rotulo" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
          <span>{lista.length} ALUNOS</span>
          <span>MENSAGEM AUTOMÁTICA</span>
        </div>
        {!lista.length && <p style={{ fontSize: 14, padding: "16px 0" }}>Ninguém com acesso ativo está parado há {minimo} dias ou mais.</p>}
        {lista.map((p, i) => {
          const voltou = p.status === "VOLTOU";
          const conteudo = (
            <>
              <span className="numero-grande" style={{ fontSize: 32, width: 40, flex: "none", lineHeight: 0.9 }}>
                {p.dias}
              </span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{p.nome}</span>
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{p.produto}</span>
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: ".08em",
                    padding: "3px 5px",
                    background: voltou ? "#111" : "#fff",
                    color: voltou ? "var(--accent)" : "#111",
                    border: p.status === "SEM RESPOSTA" ? "var(--border-strong)" : "1px solid #111",
                  }}
                >
                  {p.status}
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-2)" }}>{p.quando}</span>
              </span>
            </>
          );
          const estilo: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "8px 0", background: "none", border: "none", borderBottom: linhaFinal(i, lista.length), cursor: "pointer", textAlign: "left", textDecoration: "none", color: "#111" };
          return p.id ? (
            <Link key={p.id} href={`/master/alunos/${p.id}`} style={estilo}>
              {conteudo}
            </Link>
          ) : (
            <button type="button" key={p.nome} onClick={() => aviso.mostrar(`A ficha de ${p.nome} entra com o banco.`)} style={estilo}>
              {conteudo}
            </button>
          );
        })}
        <div className="ajuste" style={{ marginTop: 16, fontSize: 14 }}>
          <b>Regra:</b> WhatsApp com 5 dias, e-mail com 10 e lembrete do Richard em vídeo com 15.
        </div>
      </div>
      {aviso.elemento}
    </LayoutMaster>
  );
}

// ── Conteúdo: protocolos, explicações e vitrine ──────────────────────────────


const PROTOCOLOS_EXEMPLO: ProtocolosDados = {
  ativos: 186,
  prontos: 1240,
  erros: 3,
  avaliacoes: AVALIACOES.map(([n, f, i, d]) => [n, f, i, d, 100]),
  maisTrocados: MAIS_TROCADOS,
  auditoria: AUDITORIA.map((a) => ({ protocoloId: "", para: a.para, titulo: a.titulo, exercicios: a.exercicios as [string, string][] })),
  auditoriaPendentes: 20,
};

/** dados: banco (Master real). Sem eles, o exemplo do protótipo. */
export function ProtocolosMaster({ dados }: { dados?: ProtocolosDados }) {
  const router = useRouter();
  const aviso = useAvisoRapido();
  const D = dados ?? PROTOCOLOS_EXEMPLO;
  const [amostra, setAmostra] = useState(0);
  const [nota, setNota] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const au = D.auditoria.length ? D.auditoria[amostra % D.auditoria.length] : null;
  const legenda = (cor: string, rotulo: string, borda = false) => (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <i style={{ width: 10, height: 10, background: cor, border: borda ? "1px solid #111" : "none", display: "inline-block" }} />
      {rotulo}
    </span>
  );
  const auditar = async (aprovado: boolean) => {
    if (!au) return;
    if (!au.protocoloId) {
      setNota(null);
      setAmostra(amostra + 1);
      return aviso.mostrar(aprovado ? "Aprovado. Próxima amostra." : "Problema anotado.");
    }
    setOcupado(true);
    const r = await auditarProtocoloAction(au.protocoloId, aprovado, nota ?? "");
    setOcupado(false);
    aviso.mostrar(r.ok ? r.msg : r.error);
    if (r.ok) {
      setNota(null);
      router.refresh();
    }
  };
  return (
    <LayoutMaster aviso={dados ? null : undefined}>
      <div style={pagina}>
        <TituloMaster>Protocolos</TituloMaster>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
          <Numero rotulo="PROTOCOLOS ATIVOS" valor={fmtNum(D.ativos)} sub="um por aluno" />
          <Numero rotulo="TREINOS GERADOS" valor={fmtNum(D.prontos)} sub={D.erros ? `${D.erros} com erro` : "nenhum com erro"} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h2 className="titulo-secao">Avaliações</h2>
          <span style={{ display: "flex", gap: 10, fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "var(--ink-2)" }}>
            {legenda("var(--line)", "FÁCIL")}
            {legenda("#111", "IDEAL")}
            {legenda("var(--accent)", "DIFÍCIL", true)}
          </span>
        </div>
        <div style={{ ...cartao, padding: "4px 14px 6px" }}>
          {!D.avaliacoes.length && <p className="texto-apoio" style={{ padding: "10px 0" }}>Aparece quando os alunos avaliarem os treinos no fim de cada sessão.</p>}
          {D.avaliacoes.map(([nome, f, i, d, n], k) => {
            const revisar = d >= 25 && n >= 5;
            return (
              <div key={nome} style={{ padding: "10px 0", borderBottom: linhaFinal(k, D.avaliacoes.length) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{nome}</span>
                  <span style={{ fontSize: 12, color: revisar ? "#111" : "var(--ink-2)", fontWeight: revisar ? 800 : 500, whiteSpace: "nowrap" }}>
                    {revisar ? `${d}% difícil · revisar` : f >= 20 ? `${f}% fácil` : `${i}% ideal`}
                    {dados ? ` · ${n}` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", height: 12 }} aria-label={`${f}% fácil, ${i}% ideal, ${d}% difícil`}>
                  <div style={{ width: `${f}%`, background: "var(--line)" }} />
                  <div style={{ width: `${i}%`, background: "#111" }} />
                  <div style={{ width: `${d}%`, background: "var(--accent)", border: d ? "1px solid #111" : "none" }} />
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="titulo-secao" style={{ marginTop: 28, marginBottom: 6 }}>
          Mais trocados
        </h2>
        {!D.maisTrocados.length && <p className="texto-apoio" style={{ padding: "8px 0", borderBottom: "var(--border-strong)" }}>Nenhuma troca ainda. Cada &quot;Trocar exercício&quot; na execução aparece aqui.</p>}
        {D.maisTrocados.map(([nome, por, n], i) => (
          <div key={nome} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: linhaFinal(i, D.maisTrocados.length) }}>
            <span className="numero-grande" style={{ fontSize: 32, width: 30, lineHeight: 0.9 }}>
              {doisDigitos(i + 1)}
            </span>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 17, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase", lineHeight: 1 }}>{nome}</span>
              <span style={{ fontSize: 12, color: "var(--ink-2)" }}>Trocado por: {por}</span>
            </span>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{n}</span>
          </div>
        ))}

        <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h2 className="titulo-secao">Auditar gerados</h2>
          {au && <span className="rotulo">{(amostra % D.auditoria.length) + 1} DE {D.auditoriaPendentes} A AUDITAR</span>}
        </div>
        {!au ? (
          <p className="texto-apoio" style={{ padding: "8px 0", borderBottom: "var(--border-strong)" }}>Nenhum protocolo esperando auditoria.</p>
        ) : (
          <div style={{ background: "#fff", border: "var(--border-strong)", padding: 14 }}>
            <div className="rotulo" style={{ whiteSpace: "normal" }}>
              {au.para}
            </div>
            <div style={{ fontSize: 24, fontWeight: 850, fontStretch: "72%", textTransform: "uppercase", lineHeight: 1, margin: "6px 0 10px" }}>{au.titulo}</div>
            {au.exercicios.map(([n, s], k) => (
              <div key={`${n}-${k}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                <span>{n}</span>
                <span style={{ color: "var(--ink-2)", whiteSpace: "nowrap" }}>{s}</span>
              </div>
            ))}
            {nota !== null && (
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="O que está errado neste protocolo?"
                aria-label="Descrição do problema"
                rows={3}
                style={{ width: "100%", marginTop: 12, border: "1px solid #111", padding: 10, fontSize: 15, fontFamily: "inherit", resize: "vertical" }}
              />
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="botao botao--secundario"
                disabled={ocupado}
                style={{ height: 48, fontSize: 12, letterSpacing: ".06em" }}
                onClick={() => (nota === null ? setNota("") : auditar(false))}
              >
                {nota === null ? "Marcar problema" : "Salvar problema"}
              </button>
              <button type="button" className="botao botao--primario" disabled={ocupado} style={{ height: 48, fontSize: 12, letterSpacing: ".06em" }} onClick={() => (nota === null ? auditar(true) : setNota(null))}>
                {nota === null ? "Aprovar" : "Cancelar"}
              </button>
            </div>
          </div>
        )}
      </div>
      {aviso.elemento}
    </LayoutMaster>
  );
}

const EXPLICACOES_EXEMPLO: ExplicacoesDados = {
  contagem: { pendente: EXPLICACOES.length - 1 + EXPLICACOES_OUTRAS.pendente, aprovado: EXPLICACOES_OUTRAS.aprovado, com_audio: 1 + EXPLICACOES_OUTRAS.audio },
  semExplicacao: 0,
  lista: EXPLICACOES.map((e, i) => ({ exercicioId: "", nome: e.nome, videoUrl: null, posicao: e.posicao, movimento: e.movimento, cuidado: e.cuidado, status: i === 3 ? "com_audio" : "pendente" })),
};

export function ExplicacoesMaster({ dados }: { dados?: ExplicacoesDados }) {
  const router = useRouter();
  const aviso = useAvisoRapido();
  const D = dados ?? EXPLICACOES_EXEMPLO;
  const [aba, setAba] = useState<StatusExplicacao>("pendente");
  const [editando, setEditando] = useState<ExplicacaoMaster | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const lista = D.lista.filter((e) => e.status === aba);
  const rotulos: Record<StatusExplicacao, string> = { pendente: "REVISAR", aprovado: "APROVADOS", com_audio: "COM ÁUDIO" };

  const rodar = async (chave: string, f: () => Promise<{ ok: true; msg: string } | { ok: false; error: string }>) => {
    if (!dados) return aviso.mostrar("No exemplo nada é gravado. Com o banco ligado, isto salva de verdade.");
    setOcupado(chave);
    const r = await f();
    setOcupado(null);
    aviso.mostrar(r.ok ? r.msg : r.error);
    if (r.ok) router.refresh();
    return r.ok;
  };

  return (
    <LayoutMaster aviso={dados ? null : undefined}>
      <div style={pagina}>
        <TituloMaster sub="Texto escrito pela IA a partir do cadastro do exercício. Você revisa e aprova; o áudio com a sua voz entra quando a voz guia for ligada.">Explicações</TituloMaster>
        <div style={{ marginBottom: 14 }}>
          <Segmentado
            opcoes={["pendente", "aprovado", "com_audio"] as StatusExplicacao[]}
            valor={aba}
            onTroca={setAba}
            altura={44}
            render={(k) => (
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <span>{rotulos[k]}</span>
                <span style={{ fontSize: 15, fontWeight: 900 }}>{fmtNum(D.contagem[k])}</span>
              </span>
            )}
          />
        </div>
        {aba === "pendente" && (
          <div style={{ ...cartao, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 14, lineHeight: 1.4 }}>
              <b style={{ fontWeight: 800 }}>{fmtNum(D.semExplicacao)}</b> exercícios ainda sem texto. Os que já aparecem nos treinos gerados vêm primeiro.
            </span>
            <button type="button" className="botao botao--secundario" disabled={!!ocupado} onClick={() => rodar("gerar", () => gerarExplicacoesAction(8))}>
              {ocupado === "gerar" ? "Escrevendo, leva até 1 minuto" : "Gerar mais 8"}
            </button>
          </div>
        )}
        {!lista.length && <p className="texto-apoio" style={{ padding: "8px 0 16px" }}>Nada aqui por enquanto.</p>}
        {lista.map((e, idx) => {
          const st = e.status;
          const emEdicao = editando && editando.exercicioId === e.exercicioId && editando.nome === e.nome;
          return (
            <div key={`${e.exercicioId}-${idx}`} style={{ background: "#fff", border: st === "pendente" ? "1px solid #111" : "1px solid var(--line)", padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 12 }}>
                {e.videoUrl ? (
                  <MiniVideo src={e.videoUrl} largura={64} altura={84} rotulo={`Vídeo de ${e.nome}`} />
                ) : (
                  <div style={{ width: 64, height: 84, flex: "none", background: "var(--bg-soft)", fontSize: 7, fontWeight: 700, color: "var(--ink-2)", display: "flex", alignItems: "flex-end", padding: 3 }}>VÍDEO</div>
                )}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase", lineHeight: 1 }}>{e.nome}</span>
                    <span style={{ flex: "none", fontSize: 9, fontWeight: 800, letterSpacing: ".08em", padding: "3px 5px", background: st === "com_audio" ? "#111" : "#fff", color: st === "com_audio" ? "var(--accent)" : "#111", border: "1px solid #111" }}>
                      {st === "pendente" ? "REVISAR" : st === "aprovado" ? "APROVADO" : "COM ÁUDIO"}
                    </span>
                  </div>
                  {emEdicao ? (
                    (
                      [
                        ["posicao", "Posição inicial"],
                        ["movimento", "Movimento"],
                        ["cuidado", "Cuidado"],
                      ] as const
                    ).map(([k, rotulo]) => (
                      <label key={k} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, fontWeight: 800 }}>
                        {rotulo}
                        <textarea
                          value={editando[k]}
                          onChange={(ev) => setEditando({ ...editando, [k]: ev.target.value })}
                          rows={2}
                          style={{ border: "1px solid #111", padding: 8, fontSize: 14, fontFamily: "inherit", fontWeight: 400, resize: "vertical" }}
                        />
                      </label>
                    ))
                  ) : (
                    (
                      [
                        ["Posição inicial", e.posicao],
                        ["Movimento", e.movimento],
                        ["Cuidado", e.cuidado],
                      ] as [string, string][]
                    ).map(([k, v]) => (
                      <p key={k} style={{ fontSize: 13, lineHeight: 1.35 }}>
                        <b style={{ fontWeight: 800 }}>{k}:</b> {v}
                      </p>
                    ))
                  )}
                </div>
              </div>
              {emEdicao ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                  <button type="button" className="botao botao--secundario" style={{ height: 44, fontSize: 12, letterSpacing: ".06em" }} onClick={() => setEditando(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="botao botao--primario"
                    disabled={!!ocupado}
                    style={{ height: 44, fontSize: 12, letterSpacing: ".06em" }}
                    onClick={async () => {
                      const ok = await rodar(`salvar-${e.exercicioId}`, () => salvarExplicacaoAction(editando));
                      if (ok) setEditando(null);
                    }}
                  >
                    Salvar e aprovar
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: st === "pendente" ? "1fr 1fr" : "1fr", gap: 8, marginTop: 10 }}>
                  <button type="button" className="botao botao--secundario" style={{ height: 44, fontSize: 12, letterSpacing: ".06em" }} onClick={() => setEditando(e)}>
                    Editar
                  </button>
                  {st === "pendente" && (
                    <button type="button" className="botao botao--primario" disabled={!!ocupado} style={{ height: 44, fontSize: 12, letterSpacing: ".06em" }} onClick={() => rodar(`aprovar-${e.exercicioId}`, () => aprovarExplicacoesAction([e.exercicioId]))}>
                      Aprovar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {aba === "pendente" && lista.length > 1 && (
          <button type="button" className="botao botao--primario" disabled={!!ocupado} style={{ marginTop: 6 }} onClick={() => rodar("lote", () => aprovarExplicacoesAction(lista.map((e) => e.exercicioId)))}>
            Aprovar todos desta página
          </button>
        )}
      </div>
      {aviso.elemento}
    </LayoutMaster>
  );
}

const ESTILO_ROTULO: Record<Fileira["estilo"], string> = { automatica: "Automática", cards: "Cards de treino", tiles: "Atalhos" };

export function VitrineMaster({ salva }: { salva?: Fileira[] | null }) {
  const router = useRouter();
  const aviso = useAvisoRapido();
  const [fileiras, setFileiras] = useState<Fileira[]>(() => vitrineFinal(salva));
  const [ocupado, setOcupado] = useState(false);
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= fileiras.length) return;
    const a = [...fileiras];
    [a[i], a[j]] = [a[j], a[i]];
    setFileiras(a);
  };
  const seta = (d: string) => (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d={d} fill="none" stroke="#111" strokeWidth="2" />
    </svg>
  );
  const btn: React.CSSProperties = { width: 40, height: 40, background: "#fff", border: "1px solid #111", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 };
  const publicar = async () => {
    setOcupado(true);
    const r = await publicarVitrineAction(fileiras);
    setOcupado(false);
    aviso.mostrar(r.ok ? r.msg : r.error);
    if (r.ok) router.refresh();
  };
  return (
    <LayoutMaster aviso={salva === undefined ? undefined : null}>
      <div style={pagina}>
        <TituloMaster sub={`Ordem das fileiras na tela Início. "Seu treino de hoje" fica sempre no topo.`}>Vitrine</TituloMaster>
        <div style={{ background: "#111", color: "#fff", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Seu treino de hoje</span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: "var(--accent)" }}>FIXO</span>
        </div>
        {fileiras.map((f, i) => (
          <div key={f.titulo} style={{ background: "#fff", border: "1px solid #111", display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 12px", marginBottom: 6, opacity: f.visivel ? 1 : 0.55 }}>
            <span className="numero-grande" style={{ fontSize: 24, width: 26 }}>
              {doisDigitos(i + 1)}
            </span>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{f.titulo}</span>
              <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{f.visivel ? ESTILO_ROTULO[f.estilo] : "Oculta"}</span>
            </span>
            <button type="button" aria-label={`Subir ${f.titulo}`} style={btn} onClick={() => mover(i, -1)}>
              {seta("M2 9L7 4L12 9")}
            </button>
            <button type="button" aria-label={`Descer ${f.titulo}`} style={btn} onClick={() => mover(i, 1)}>
              {seta("M2 5L7 10L12 5")}
            </button>
            <button
              type="button"
              aria-pressed={f.visivel}
              onClick={() => setFileiras(fileiras.map((x, j) => (j === i ? { ...x, visivel: !x.visivel } : x)))}
              style={{ width: 66, flex: "none", height: 40, background: f.visivel ? "#111" : "#fff", color: f.visivel ? "#fff" : "#111", border: "1px solid #111", fontWeight: 800, fontSize: 10, letterSpacing: ".06em", cursor: "pointer" }}
            >
              {f.visivel ? "VISÍVEL" : "OCULTA"}
            </button>
          </div>
        ))}
        <p className="texto-apoio" style={{ marginTop: 10 }}>
          Novas coleções entram quando os treinos prontos da vitrine forem cadastrados.
        </p>
        <button type="button" className="botao botao--primario" disabled={ocupado} style={{ marginTop: 10 }} onClick={publicar}>
          {ocupado ? "Publicando" : "Publicar vitrine"}
        </button>
      </div>
      {aviso.elemento}
    </LayoutMaster>
  );
}
