"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  buscarExerciciosAction,
  excluirProntoAction,
  gerarRascunhoProntoAction,
  publicarProntoAction,
  salvarProntoAction,
  substitutosProntoAction,
  type ExercicioBusca,
} from "@/lib/acoes/treinos-prontos";
import { EQUIPAMENTOS, REGIOES } from "@/lib/quiz";
import type { OpcaoTroca } from "@/lib/tipos";
import {
  conteudoVazio,
  LOCAL_ROTULO,
  METODOS,
  NIVEL_ROTULO,
  REGIOES_LESAO,
  TIPO_ROTULO,
  type BasePronto,
  type ConteudoPronto,
  type LocalPronto,
  type NivelPronto,
  type TipoPronto,
  type TreinoPronto,
} from "@/lib/treinos-prontos";
import { useAvisoRapido } from "../AvisoRapido";
import { MiniVideo } from "../MiniVideo";
import { doisDigitos, Selo } from "../marca";
import { cartao, LayoutMaster, pagina, Segmentado, TituloMaster } from "./LayoutMaster";

const campo: React.CSSProperties = { width: "100%", height: 44, border: "1px solid #111", padding: "0 10px", fontSize: 16, fontFamily: "inherit", background: "#fff", color: "#111", borderRadius: 0 };
const rotulo: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" };
const botaoMini: React.CSSProperties = { height: 36, padding: "0 10px", background: "#fff", border: "1px solid #111", fontWeight: 800, fontSize: 11, letterSpacing: ".06em", cursor: "pointer", textTransform: "uppercase" };
const chip = (ativo: boolean): React.CSSProperties => ({ height: 36, padding: "0 11px", background: ativo ? "#111" : "#fff", color: ativo ? "#fff" : "#111", border: "1px solid #111", fontWeight: 700, fontSize: 13, cursor: "pointer" });

type Programa = { id: string; nome: string };

// ── lista ───────────────────────────────────────────────────────────────────

export function ListaProntos({ treinos, programas }: { treinos?: TreinoPronto[]; programas?: Programa[] }) {
  const [filtro, setFiltro] = useState<TipoPronto | "todos">("todos");
  const nomeProg = new Map((programas ?? []).map((p) => [p.id, p.nome]));
  const lista = (treinos ?? []).filter((t) => filtro === "todos" || t.tipo === filtro);
  const publicados = (treinos ?? []).filter((t) => t.publicado).length;
  return (
    <LayoutMaster aviso={treinos ? null : "DISPONÍVEL QUANDO O BANCO ESTIVER LIGADO"}>
      <div style={pagina}>
        <TituloMaster sub="Treinos iguais para todos, que aparecem nas fileiras da Início. Só os publicados aparecem.">Treinos prontos</TituloMaster>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div style={{ ...cartao, padding: 12 }}>
            <div className="rotulo">PUBLICADOS</div>
            <div className="numero-grande" style={{ fontSize: 40 }}>{publicados}</div>
          </div>
          <div style={{ ...cartao, padding: 12 }}>
            <div className="rotulo">RASCUNHOS</div>
            <div className="numero-grande" style={{ fontSize: 40 }}>{(treinos?.length ?? 0) - publicados}</div>
          </div>
        </div>
        <Link href="/master/treinos/novo" className="botao botao--primario" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", marginBottom: 16 }}>
          Novo treino
        </Link>
        <div className="fileira-trilho" style={{ gap: 6, margin: "0 -20px 12px" }}>
          {(["todos", "vitrine", "programa", "rapido", "lesao"] as const).map((k) => (
            <button type="button" key={k} aria-pressed={filtro === k} onClick={() => setFiltro(k)} style={{ ...chip(filtro === k), flex: "none" }}>
              {k === "todos" ? "Todos" : TIPO_ROTULO[k]}
            </button>
          ))}
        </div>
        {!lista.length && <p className="texto-apoio" style={{ padding: "10px 0", borderBottom: "var(--border-strong)" }}>Nenhum treino aqui ainda. Comece por &quot;Novo treino&quot;.</p>}
        {lista.map((t, i) => {
          const n = t.conteudo.blocks.reduce((s, b) => s + b.exercises.length, 0);
          const sub = [
            t.tipo === "programa" ? `${nomeProg.get(t.produtoId ?? "") ?? "Programa"} · treino ${doisDigitos(t.ordem)}` : t.tipo === "lesao" ? `${t.lesaoRegiao} · fase ${t.lesaoFase}` : TIPO_ROTULO[t.tipo],
            LOCAL_ROTULO[t.local],
            `${t.duracaoMin} min`,
            `${n} exercícios`,
          ].join(" · ");
          return (
            <Link
              key={t.id}
              href={`/master/treinos/${t.id}`}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: i === lista.length - 1 ? "var(--border-strong)" : "1px solid var(--line)", textDecoration: "none", color: "#111" }}
            >
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 18, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase", lineHeight: 1 }}>{t.titulo}</span>
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{sub}</span>
              </span>
              <Selo pequeno>{t.publicado ? "Publicado" : "Rascunho"}</Selo>
            </Link>
          );
        })}
      </div>
    </LayoutMaster>
  );
}

// ── editor ──────────────────────────────────────────────────────────────────

type Bloco = ConteudoPronto["blocks"][number];
type Exercicio = Bloco["exercises"][number];

/** "12, 10, 8" ou "40s, 40s" ↔ séries. */
const textoDasSeries = (e: Exercicio) => e.series.map((s) => (s.type === "time" ? `${s.target.replace(/\D+$/, "")}s` : s.target)).join(", ");
function seriesDoTexto(t: string): Exercicio["series"] {
  return t
    .split(/[,;]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10)
    .map((x) => (/s(eg)?$/.test(x) ? { type: "time" as const, target: `${parseInt(x, 10) || 30}s`, weight: "" } : { type: "repetition" as const, target: x.replace(/[^\d-]/g, "") || "10", weight: "" }));
}

const BASE_PADRAO: BasePronto = { objetivo: "Condicionamento", equipamentos: [], tempo: "40", regioes: [], dor: null };

export function EditorPronto({ treino, programas }: { treino?: TreinoPronto | null; programas: Programa[] }) {
  const router = useRouter();
  const aviso = useAvisoRapido();
  const [id, setId] = useState(treino?.id);
  const [publicado, setPublicado] = useState(!!treino?.publicado);
  const [titulo, setTitulo] = useState(treino?.titulo ?? "");
  const [tipo, setTipo] = useState<TipoPronto>(treino?.tipo ?? "vitrine");
  const [produtoId, setProdutoId] = useState(treino?.produtoId ?? programas[0]?.id ?? "");
  const [ordem, setOrdem] = useState(treino?.ordem || 1);
  const [lesaoRegiao, setLesaoRegiao] = useState(treino?.lesaoRegiao ?? "Lombar");
  const [lesaoFase, setLesaoFase] = useState(treino?.lesaoFase ?? 1);
  const [local, setLocal] = useState<LocalPronto>(treino?.local ?? "casa");
  const [nivel, setNivel] = useState<NivelPronto>(treino?.nivel ?? "iniciante");
  const [duracao, setDuracao] = useState(String(treino?.duracaoMin ?? 30));
  const [conteudo, setConteudo] = useState<ConteudoPronto>(treino?.conteudo ?? conteudoVazio(""));
  const [base, setBase] = useState<BasePronto>(treino?.conteudo.base ?? BASE_PADRAO);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [busca, setBusca] = useState<{ bloco: number; q: string; itens: ExercicioBusca[] } | null>(null);
  const [troca, setTroca] = useState<{ bloco: number; ex: number; opcoes: OpcaoTroca[] } | null>(null);
  const [avisosIA, setAvisosIA] = useState<string[]>([]);

  const regioes = treino?.regioes ?? [];
  const [focos, setFocos] = useState<string[]>(regioes);
  const blocos = conteudo.blocks;
  const total = blocos.reduce((s, b) => s + b.exercises.length, 0);

  const mudarBloco = (bi: number, f: (b: Bloco) => Bloco) => setConteudo({ ...conteudo, blocks: blocos.map((b, i) => (i === bi ? f(b) : b)) });
  const mudarEx = (bi: number, ei: number, f: (e: Exercicio) => Exercicio) => mudarBloco(bi, (b) => ({ ...b, exercises: b.exercises.map((e, j) => (j === ei ? f(e) : e)) }));
  const mover = <T,>(lista: T[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= lista.length) return lista;
    const a = [...lista];
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  };

  const dados = () => ({
    id,
    titulo,
    tipo,
    produtoId: tipo === "programa" ? produtoId : null,
    local,
    nivel,
    duracaoMin: Number(duracao) || 30,
    regioes: focos,
    lesaoRegiao: tipo === "lesao" ? lesaoRegiao : null,
    lesaoFase: tipo === "lesao" ? lesaoFase : null,
    ordem: tipo === "programa" ? ordem : 0,
    conteudo: { ...conteudo, base: { ...base, regioes: focos, dor: tipo === "lesao" ? lesaoRegiao : null } },
  });

  const salvar = async () => {
    setOcupado("salvar");
    const r = await salvarProntoAction(dados());
    setOcupado(null);
    if (!r.ok) return aviso.mostrar(r.error);
    aviso.mostrar(r.msg ?? "Salvo.");
    if (!id) {
      setId(r.id);
      router.replace(`/master/treinos/${r.id}`);
    } else router.refresh();
    return r.id;
  };

  const publicar = async (sim: boolean) => {
    const salvo = await salvar();
    if (!salvo) return;
    setOcupado("publicar");
    const r = await publicarProntoAction(salvo, sim);
    setOcupado(null);
    aviso.mostrar(r.ok ? (r.msg ?? "") : r.error);
    if (r.ok) setPublicado(sim);
  };

  const excluir = async () => {
    if (!id) return router.push("/master/treinos");
    if (!window.confirm(`Excluir "${titulo || "este treino"}"? Não dá para desfazer.`)) return;
    const r = await excluirProntoAction(id);
    aviso.mostrar(r.ok ? (r.msg ?? "") : r.error);
    if (r.ok) router.push("/master/treinos");
  };

  const montarComIA = async () => {
    if (total && !window.confirm("O rascunho da IA substitui os exercícios que estão no treino. Continuar?")) return;
    setOcupado("ia");
    const r = await gerarRascunhoProntoAction({ id, tipo, local, nivel, regioes: focos, lesaoRegiao: tipo === "lesao" ? lesaoRegiao : null, ordem, produtoId: tipo === "programa" ? produtoId : null, base: { ...base, regioes: focos } });
    setOcupado(null);
    if (!r.ok) return aviso.mostrar(r.error);
    setConteudo(r.conteudo);
    setAvisosIA(r.avisos);
    if (!titulo) setTitulo(r.titulo);
    setDuracao(String(r.duracaoMin));
    aviso.mostrar("Rascunho pronto. Revise, ajuste e salve.");
  };

  const buscar = async (bloco: number, q: string) => {
    setBusca({ bloco, q, itens: busca?.itens ?? [] });
    if (q.trim().length < 2) return;
    const r = await buscarExerciciosAction(q);
    if (r.ok) setBusca({ bloco, q, itens: r.itens });
  };

  const incluir = (bi: number, x: ExercicioBusca) => {
    const tempo = /alongamento|mobilidade|prancha|isometr/i.test(`${x.nome} ${x.detalhe}`);
    const n = Math.max(2, blocos[bi]?.numberSeries || 3);
    mudarBloco(bi, (b) => ({
      ...b,
      exercises: [...b.exercises, { exerciseId: x.id, exerciseName: x.nome, videoUrl: x.videoUrl, series: Array.from({ length: n }, () => (tempo ? { type: "time" as const, target: "30s", weight: "" } : { type: "repetition" as const, target: "12", weight: "" })), restSec: 30, comments: "" }],
    }));
    setBusca(null);
    aviso.mostrar(`${x.nome} entrou no bloco ${bi + 1}.`);
  };

  const abrirTroca = async (bi: number, ei: number) => {
    // O servidor descarta blocos vazios: o índice conta só os blocos com exercício.
    const indice = blocos.slice(0, bi).filter((b) => b.exercises.length).length;
    setOcupado(`troca-${bi}-${ei}`);
    const r = await substitutosProntoAction({ tipo, local, nivel, regioes: focos, lesaoRegiao: tipo === "lesao" ? lesaoRegiao : null, conteudo: dados().conteudo }, indice, blocos[bi].exercises[ei].exerciseId);
    setOcupado(null);
    if (!r.ok) return aviso.mostrar(r.error);
    if (!r.opcoes.length) return aviso.mostrar("Sem substituto parecido no catálogo. Use a busca do bloco.");
    setTroca({ bloco: bi, ex: ei, opcoes: r.opcoes });
  };

  return (
    <LayoutMaster voltar="/master/treinos" aviso={null}>
      <div style={pagina}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span className="rotulo">{id ? "EDITAR TREINO" : "NOVO TREINO"}</span>
          <Selo pequeno>{publicado ? "Publicado" : "Rascunho"}</Selo>
        </div>
        <TituloMaster>{titulo || "Sem nome"}</TituloMaster>

        {/* Dados */}
        <div style={{ ...cartao, padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={rotulo}>
            Nome
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Glúteo com mini band" maxLength={80} style={campo} />
          </label>
          <div style={rotulo}>
            Tipo
            <Segmentado opcoes={["vitrine", "programa", "rapido", "lesao"] as TipoPronto[]} valor={tipo} onTroca={setTipo} render={(k) => TIPO_ROTULO[k]} />
          </div>
          {tipo === "programa" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8 }}>
              <label style={rotulo}>
                Programa
                <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} style={campo}>
                  {programas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label style={rotulo}>
                Treino nº
                <input type="number" min={1} max={99} value={ordem} onChange={(e) => setOrdem(Number(e.target.value) || 1)} style={campo} />
              </label>
            </div>
          )}
          {tipo === "lesao" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8 }}>
              <label style={rotulo}>
                Região
                <select value={lesaoRegiao} onChange={(e) => setLesaoRegiao(e.target.value)} style={campo}>
                  {REGIOES_LESAO.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label style={rotulo}>
                Fase
                <select value={lesaoFase} onChange={(e) => setLesaoFase(Number(e.target.value))} style={campo}>
                  {[1, 2, 3, 4].map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div style={rotulo}>
            Local
            <Segmentado opcoes={["casa", "condominio", "academia"] as LocalPronto[]} valor={local} onTroca={setLocal} render={(k) => LOCAL_ROTULO[k]} />
          </div>
          <div style={rotulo}>
            Nível
            <Segmentado opcoes={["iniciante", "intermediario", "avancado"] as NivelPronto[]} valor={nivel} onTroca={setNivel} render={(k) => NIVEL_ROTULO[k]} />
          </div>
          <label style={rotulo}>
            Duração (min)
            <input type="number" min={5} max={120} value={duracao} onChange={(e) => setDuracao(e.target.value)} style={{ ...campo, width: 110 }} />
          </label>
          <div style={rotulo}>
            Regiões (busca e foco)
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.values(REGIOES).map((r) => (
                <button type="button" key={r} aria-pressed={focos.includes(r)} onClick={() => setFocos(focos.includes(r) ? focos.filter((x) => x !== r) : [...focos, r])} style={chip(focos.includes(r))}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* IA */}
        <h2 className="titulo-secao" style={{ marginTop: 24, marginBottom: 8 }}>
          Montar com a IA
        </h2>
        <div style={{ ...cartao, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 14, lineHeight: 1.4, color: "var(--ink-2)" }}>A IA monta um rascunho com as mesmas regras dos protocolos. Você revisa e ajusta antes de publicar.</p>
          {tipo !== "lesao" && (
            <label style={rotulo}>
              Objetivo
              <select value={base.objetivo} onChange={(e) => setBase({ ...base, objetivo: e.target.value })} style={campo}>
                {["Ganhar massa muscular", "Perder gordura", "Condicionamento", "Aliviar dores"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          )}
          {local !== "academia" && (
            <div style={rotulo}>
              Equipamentos que o aluno precisa ter
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EQUIPAMENTOS.map((e) => {
                  const ativo = base.equipamentos.includes(e);
                  return (
                    <button type="button" key={e} aria-pressed={ativo} onClick={() => setBase({ ...base, equipamentos: ativo ? base.equipamentos.filter((x) => x !== e) : [...base.equipamentos, e] })} style={chip(ativo)}>
                      {e}
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 0, textTransform: "none", color: "var(--ink-2)" }}>Nenhum marcado: só peso do corpo.</span>
            </div>
          )}
          <div style={rotulo}>
            Estrutura de
            <Segmentado opcoes={["20", "40", "60"] as BasePronto["tempo"][]} valor={base.tempo} onTroca={(v) => setBase({ ...base, tempo: v })} render={(k) => `${k} min`} />
          </div>
          <button type="button" className="botao botao--secundario" disabled={!!ocupado} onClick={montarComIA}>
            {ocupado === "ia" ? "Montando, leva até 2 minutos" : "Montar rascunho com a IA"}
          </button>
          {!!avisosIA.length && (
            <div className="ajuste" style={{ fontSize: 13 }}>
              <b>Avisos da montagem:</b> {avisosIA.join(" · ")}
            </div>
          )}
        </div>

        {/* Blocos */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 24, marginBottom: 8 }}>
          <h2 className="titulo-secao">Exercícios</h2>
          <span className="rotulo">{total} NO TREINO</span>
        </div>
        <p className="texto-apoio" style={{ marginBottom: 10 }}>
          Séries: repetições separadas por vírgula (12, 10, 8) ou tempo com s (40s, 40s, 40s).
        </p>
        {blocos.map((b, bi) => (
          <div key={bi} style={{ ...cartao, padding: 12, marginBottom: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="rotulo" style={{ flex: 1 }}>
                BLOCO {bi + 1}
              </span>
              <button type="button" style={botaoMini} aria-label={`Subir bloco ${bi + 1}`} onClick={() => setConteudo({ ...conteudo, blocks: mover(blocos, bi, -1) })}>
                ↑
              </button>
              <button type="button" style={botaoMini} aria-label={`Descer bloco ${bi + 1}`} onClick={() => setConteudo({ ...conteudo, blocks: mover(blocos, bi, 1) })}>
                ↓
              </button>
              <button type="button" style={botaoMini} onClick={() => (b.exercises.length && !window.confirm(`Tirar o bloco ${bi + 1} inteiro?`) ? null : setConteudo({ ...conteudo, blocks: blocos.filter((_, i) => i !== bi) }))}>
                Tirar
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <label style={rotulo}>
                Método
                <select value={b.method} onChange={(e) => mudarBloco(bi, (x) => ({ ...x, method: e.target.value }))} style={{ ...campo, fontSize: 14, padding: "0 4px" }}>
                  {METODOS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label style={rotulo}>
                Descanso (s)
                <input type="number" min={0} max={600} value={b.restBetweenSeriesSec} onChange={(e) => mudarBloco(bi, (x) => ({ ...x, restBetweenSeriesSec: Number(e.target.value) || 0 }))} style={campo} />
              </label>
              <label style={rotulo}>
                Depois (s)
                <input type="number" min={0} max={600} value={b.restAfterBlockSec ?? b.restBetweenSeriesSec} onChange={(e) => mudarBloco(bi, (x) => ({ ...x, restAfterBlockSec: Number(e.target.value) || 0 }))} style={campo} />
              </label>
            </div>
            {b.exercises.map((e, ei) => (
              <div key={`${e.exerciseId}-${ei}`} style={{ borderTop: "1px solid var(--line)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <MiniVideo src={e.videoUrl} rotulo={`Vídeo de ${e.exerciseName}`} />
                  <span style={{ flex: 1, fontSize: 16, fontWeight: 850, fontStretch: "78%", textTransform: "uppercase", lineHeight: 1.05 }}>{e.exerciseName}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 6 }}>
                  <label style={rotulo}>
                    Séries
                    <input defaultValue={textoDasSeries(e)} key={textoDasSeries(e)} onBlur={(ev) => mudarEx(bi, ei, (x) => ({ ...x, series: seriesDoTexto(ev.target.value) }))} style={campo} />
                  </label>
                  <label style={rotulo}>
                    Desc. (s)
                    <input type="number" min={0} max={600} value={e.restSec} onChange={(ev) => mudarEx(bi, ei, (x) => ({ ...x, restSec: Number(ev.target.value) || 0 }))} style={campo} />
                  </label>
                </div>
                <label style={rotulo}>
                  Observação
                  <input value={e.comments} onChange={(ev) => mudarEx(bi, ei, (x) => ({ ...x, comments: ev.target.value }))} maxLength={300} placeholder="Opcional" style={campo} />
                </label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" style={botaoMini} aria-label="Subir" onClick={() => mudarBloco(bi, (x) => ({ ...x, exercises: mover(x.exercises, ei, -1) }))}>
                    ↑
                  </button>
                  <button type="button" style={botaoMini} aria-label="Descer" onClick={() => mudarBloco(bi, (x) => ({ ...x, exercises: mover(x.exercises, ei, 1) }))}>
                    ↓
                  </button>
                  <button type="button" style={botaoMini} disabled={!!ocupado} onClick={() => abrirTroca(bi, ei)}>
                    {ocupado === `troca-${bi}-${ei}` ? "Buscando" : "Trocar"}
                  </button>
                  <button type="button" style={botaoMini} onClick={() => mudarBloco(bi, (x) => ({ ...x, exercises: x.exercises.filter((_, j) => j !== ei) }))}>
                    Tirar
                  </button>
                </div>
              </div>
            ))}
            {busca?.bloco === bi ? (
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <input autoFocus value={busca.q} onChange={(e) => buscar(bi, e.target.value)} placeholder="Nome, músculo ou equipamento" aria-label="Buscar exercício" style={campo} />
                {busca.itens.map((x) => (
                  <div key={x.id} style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid var(--line)", padding: 6 }}>
                    <MiniVideo src={x.videoUrl} largura={44} altura={54} rotulo={`Vídeo de ${x.nome}`} />
                    <button type="button" onClick={() => incluir(bi, x)} style={{ flex: 1, textAlign: "left", padding: "4px 2px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{x.nome}</span>
                      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{x.detalhe}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em" }}>+ INCLUIR</span>
                    </button>
                  </div>
                ))}
                <button type="button" style={botaoMini} onClick={() => setBusca(null)}>
                  Fechar busca
                </button>
              </div>
            ) : (
              <button type="button" className="botao botao--secundario" style={{ height: 44, fontSize: 12 }} onClick={() => setBusca({ bloco: bi, q: "", itens: [] })}>
                Incluir exercício
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="botao botao--secundario"
          style={{ height: 44, fontSize: 12 }}
          onClick={() => setConteudo({ ...conteudo, blocks: [...blocos, { method: "Convencional", numberSeries: 3, restBetweenSeriesSec: 60, restAfterBlockSec: 60, comments: "", exercises: [] }] })}
        >
          Novo bloco
        </button>

        {/* Ações */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
          <button type="button" className="botao botao--primario" disabled={!!ocupado} onClick={salvar}>
            {ocupado === "salvar" ? "Salvando" : "Salvar"}
          </button>
          <button type="button" className="botao botao--secundario" disabled={!!ocupado || !total} onClick={() => publicar(!publicado)}>
            {publicado ? "Tirar do ar" : "Salvar e publicar"}
          </button>
          {id && (
            <Link href={`/detalhe/${id}`} className="botao botao--secundario" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
              Ver como o aluno vê
            </Link>
          )}
          <button type="button" className="botao botao--secundario" onClick={excluir}>
            {id ? "Excluir treino" : "Descartar"}
          </button>
        </div>
      </div>

      {troca && (
        <>
          <div className="folha-fundo" onClick={() => setTroca(null)} />
          <div className="folha" role="dialog" aria-modal="true">
            <div style={{ fontSize: 24, fontWeight: 850, fontStretch: "72%", textTransform: "uppercase", lineHeight: 0.95 }}>Trocar exercício</div>
            <p style={{ fontSize: 14, color: "var(--ink-2)" }}>No lugar de {blocos[troca.bloco]?.exercises[troca.ex]?.exerciseName}. Séries e descanso continuam.</p>
            {troca.opcoes.map((o) => (
              <div key={o.id} style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #111", padding: 6 }}>
                <MiniVideo src={o.videoUrl} largura={44} altura={54} rotulo={`Vídeo de ${o.nome}`} />
                <button
                  type="button"
                  onClick={() => {
                    mudarEx(troca.bloco, troca.ex, (x) => ({ ...x, exerciseId: o.id, exerciseName: o.nome, videoUrl: o.videoUrl ?? "", comments: "" }));
                    setTroca(null);
                  }}
                  style={{ flex: 1, textAlign: "left", padding: "6px 2px", background: "none", border: "none", cursor: "pointer", fontSize: 16, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase" }}
                >
                  {o.nome}
                </button>
              </div>
            ))}
            <button type="button" className="botao botao--secundario" onClick={() => setTroca(null)}>
              Voltar
            </button>
          </div>
        </>
      )}
      {aviso.elemento}
    </LayoutMaster>
  );
}
