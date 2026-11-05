import "server-only";
import { perfilDoQuiz, type PerfilAluno } from "../ia-treino/aluno";
import { itemDoCatalogo, type LinhaExercicio } from "../ia-treino/catalogo";
import { esqueletoDoAluno, gerarTreinoDoAluno, historicoDe, type ChamarModelo, type ItemCatalogoAluno, type TreinoGerado } from "../ia-treino/gerar-aluno";
import { chamarModeloReal } from "../ia-treino/modelo";
import { adaptarTreino, calcularAdaptacao, type Adaptacao, type ItemSerie, type SessaoHistorico } from "../ia-treino/adaptacao";
import { exerciciosDistintos, paraTreinoSessao, type InfoExercicio } from "../ia-treino/para-sessao";
import { opcoesDeTroca } from "../ia-treino/trocas-aluno";
import type { RespostasQuiz } from "../quiz";
import type { TreinoSessao } from "../tipos";
import { createAdminClient } from "../supabase/admin";

// Protocolo do aluno e a fila de geração dos treinos (migration 004). Um treino por vez: o
// próximo depende do histórico dos anteriores. Sempre alguns treinos à frente do que o aluno fez.

export const MAX_TENTATIVAS = 3;
/** "gerando" parado há mais que isso (função caiu) volta para a fila. */
const GERANDO_VENCIDO_MS = 6 * 60_000;

// ── catálogo (cache curto por instância) ───────────────────────────────────

let cacheCatalogo: { em: number; itens: ItemCatalogoAluno[] } | null = null;

export async function carregarCatalogoIA(): Promise<ItemCatalogoAluno[]> {
  if (cacheCatalogo && Date.now() - cacheCatalogo.em < 10 * 60_000) return cacheCatalogo.itens;
  const db = createAdminClient();
  const linhas: LinhaExercicio[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db
      .from("exercicios")
      .select("id, nome, modalidade, material, grupo_muscular, video_origem, video_url, niveis, categorias, posicao, impacto, fase, musculos, padroes, unilateral, equipamentos, acessorios, indicacoes, idoso, ativo")
      .eq("ativo", true)
      .order("id")
      .range(de, de + 999);
    if (error) throw new Error(`[catalogo] ${error.code}`);
    linhas.push(...((data ?? []) as LinhaExercicio[]));
    if (!data || data.length < 1000) break;
  }
  cacheCatalogo = { em: Date.now(), itens: linhas.map(itemDoCatalogo) };
  return cacheCatalogo.itens;
}

// ── protocolo ──────────────────────────────────────────────────────────────

const LOCAL: Record<string, string> = { "Em casa": "casa", "Condomínio": "condominio", Academia: "academia" };
const NIVEL: Record<string, string> = { Iniciante: "iniciante", "Intermediário": "intermediario", "Avançado": "avancado" };

export interface ProtocoloAtivo {
  id: string;
  perfil: PerfilAluno;
  totalTreinos: number;
  treinos: { id: string; posicao: number; status: string; titulo: string | null; tipo: string | null; duracaoMin: number | null; tentativas: number }[];
}

export async function protocoloAtivo(alunoId: string): Promise<ProtocoloAtivo | null> {
  const db = createAdminClient();
  const { data: p } = await db.from("protocolos").select("id, perfil, total_treinos").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle();
  if (!p?.perfil) return null;
  const { data: t } = await db.from("protocolo_treinos").select("id, posicao, status, titulo, tipo, duracao_min, tentativas").eq("protocolo_id", p.id).order("posicao");
  return {
    id: p.id,
    perfil: p.perfil as PerfilAluno,
    totalTreinos: p.total_treinos ?? 24,
    treinos: (t ?? []).map((x) => ({ id: x.id, posicao: x.posicao, status: x.status, titulo: x.titulo, tipo: x.tipo, duracaoMin: x.duracao_min, tentativas: x.tentativas })),
  };
}

/**
 * Depois do quiz: se o perfil mudou (ou não há protocolo), começa um protocolo novo com a primeira
 * leva de treinos na fila. Perfil igual: mantém o que existe.
 */
export async function prepararProtocolo(alunoId: string, quizId: string | null, r: RespostasQuiz): Promise<{ id: string; novo: boolean }> {
  const db = createAdminClient();
  const perfil = perfilDoQuiz(r);
  const atual = await protocoloAtivo(alunoId);
  if (atual && JSON.stringify(atual.perfil) === JSON.stringify(perfil)) return { id: atual.id, novo: false };

  const esq = esqueletoDoAluno(perfil, 1);
  const total = esq.ok ? esq.esqueleto.totalTreinos : 24;
  if (atual) await db.from("protocolos").update({ ativo: false }).eq("id", atual.id);
  const { data: novo, error } = await db
    .from("protocolos")
    .insert({
      aluno_id: alunoId,
      quiz_id: quizId,
      local: LOCAL[r.local ?? ""] ?? "casa",
      nivel: NIVEL[r.nivel ?? ""] ?? "iniciante",
      perfil,
      familia: perfil.familia,
      total_treinos: total,
    })
    .select("id")
    .single();
  if (error || !novo) throw new Error(`[protocolo] ${error?.code}`);
  const n = Math.min(total, perfil.diasSemana);
  const { error: e2 } = await db.from("protocolo_treinos").insert(Array.from({ length: n }, (_, i) => ({ protocolo_id: novo.id, posicao: i + 1, status: "pendente" })));
  if (e2) throw new Error(`[protocolo_treinos] ${e2.code}`);
  return { id: novo.id, novo: true };
}

/** Treinos do protocolo que o aluno já concluiu (sessão concluída). */
export async function treinosFeitos(p: ProtocoloAtivo): Promise<number> {
  const ids = p.treinos.map((t) => t.id);
  if (!ids.length) return 0;
  const { data } = await createAdminClient().from("sessoes").select("protocolo_treino_id").in("protocolo_treino_id", ids).not("concluida_em", "is", null);
  return new Set((data ?? []).map((x) => x.protocolo_treino_id)).size;
}

/** Garante a fila: treinos pendentes até `feitos + dias por semana`, sem passar do total. */
export async function garantirFila(p: ProtocoloAtivo, feitos: number): Promise<void> {
  const ate = Math.min(p.totalTreinos, feitos + (p.perfil.diasSemana ?? 3));
  const existentes = new Set(p.treinos.map((t) => t.posicao));
  const faltam = Array.from({ length: ate }, (_, i) => i + 1).filter((pos) => !existentes.has(pos));
  if (!faltam.length) return;
  const { error } = await createAdminClient().from("protocolo_treinos").insert(faltam.map((posicao) => ({ protocolo_id: p.id, posicao, status: "pendente" })));
  if (error && error.code !== "23505") throw new Error(`[fila] ${error.code}`);
}

// ── geração ────────────────────────────────────────────────────────────────

export type Conteudo = TreinoGerado["rascunho"];
const idsDoConteudo = (c: Conteudo) => c.blocks.flatMap((b) => b.exercises.map((x) => x.exerciseId));

export type ResultadoFila =
  | { situacao: "gerado"; posicao: number }
  | { situacao: "falhou"; posicao: number; erro: string; desistiu: boolean }
  | { situacao: "ocupado" | "nada" };

/** Gera o PRÓXIMO treino da fila (o de menor posição, com todos os anteriores prontos). */
export async function gerarProximo(protocoloId: string, opcoes: { chamarModelo?: ChamarModelo } = {}): Promise<ResultadoFila> {
  const db = createAdminClient();
  const { data: p } = await db.from("protocolos").select("id, perfil, aluno_id").eq("id", protocoloId).maybeSingle();
  if (!p?.perfil) return { situacao: "nada" };
  const { data: linhas } = await db
    .from("protocolo_treinos")
    .select("id, posicao, status, tentativas, iniciado_em, conteudo")
    .eq("protocolo_id", protocoloId)
    .order("posicao");
  const treinos = linhas ?? [];
  const alvo = treinos.find((t) => t.status !== "pronto");
  if (!alvo) return { situacao: "nada" };
  if (alvo.status === "erro" && alvo.tentativas >= MAX_TENTATIVAS) return { situacao: "nada" };
  if (alvo.status === "gerando" && alvo.iniciado_em && Date.now() - Date.parse(alvo.iniciado_em) < GERANDO_VENCIDO_MS) return { situacao: "ocupado" };

  const tentativa = alvo.tentativas + 1;
  // Reserva (só um gerador por treino): troca o status se ainda for o que lemos.
  const { data: reservado } = await db
    .from("protocolo_treinos")
    .update({ status: "gerando", iniciado_em: new Date().toISOString(), tentativas: tentativa })
    .eq("id", alvo.id)
    .eq("status", alvo.status)
    .eq("tentativas", alvo.tentativas)
    .select("id");
  if (!reservado?.length) return { situacao: "ocupado" };

  const anteriores = treinos.filter((t) => t.posicao < alvo.posicao && t.conteudo).map((t) => idsDoConteudo(t.conteudo as Conteudo));
  // Exercícios que o aluno marcou com dor ou trocou várias vezes ficam fora deste treino.
  const catalogo = await carregarCatalogoIA();
  const { evitar } = await adaptacaoDoAluno(p.aluno_id);
  const gerar = (lista: readonly ItemCatalogoAluno[]) =>
    gerarTreinoDoAluno(
      { perfil: p.perfil as PerfilAluno, posicao: alvo.posicao, catalogo: lista, historico: { ...historicoDe(anteriores), treinosAnteriores: anteriores }, protocoloId },
      { chamarModelo: opcoes.chamarModelo ?? chamarModeloReal },
    );
  let r = await gerar(evitar.size ? catalogo.filter((x) => !evitar.has(x.id)) : catalogo);
  // Sem eles o estoque não fecha o treino (antes de chamar a IA): monta com o catálogo inteiro.
  if (!r.ok && evitar.size && /^(sem exercícios|estrutura|estoque)/.test(r.error)) {
    r = await gerar(catalogo);
    r.diagnostico.avisos.unshift("exercícios a evitar mantidos: sem eles o estoque não fechava o treino");
  } else if (evitar.size) r.diagnostico.avisos.unshift(`fora deste treino (dor ou trocas): ${evitar.size} exercício(s)`);
  if (r.ok) {
    const { error } = await db
      .from("protocolo_treinos")
      .update({ status: "pronto", titulo: r.treino.titulo, tipo: r.treino.tipo, duracao_min: r.treino.duracaoMin, conteudo: r.treino.rascunho, diagnostico: r.diagnostico, erro: null, gerado_em: new Date().toISOString() })
      .eq("id", alvo.id);
    if (error) throw new Error(`[gerar] gravação: ${error.code}`);
    return { situacao: "gerado", posicao: alvo.posicao };
  }
  const desistiu = tentativa >= MAX_TENTATIVAS;
  await db.from("protocolo_treinos").update({ status: desistiu ? "erro" : "pendente", erro: r.error.slice(0, 500), diagnostico: r.diagnostico }).eq("id", alvo.id);
  console.error("[gerar] treino falhou", { protocolo: protocoloId, posicao: alvo.posicao, tentativa, erro: r.error.slice(0, 200) });
  return { situacao: "falhou", posicao: alvo.posicao, erro: r.error, desistiu };
}

/** Treino pronto do protocolo ativo, já no formato da tela de execução. */
/** Histórico do aluno para adaptar os próximos treinos (carga, volume, dor e trocas). */
export async function adaptacaoDoAluno(alunoId: string): Promise<Adaptacao> {
  const db = createAdminClient();
  const desde = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [{ data: sessoes }, { data: trocas }] = await Promise.all([
    db.from("sessoes").select("iniciada_em, concluida_em, avaliacao, series").eq("aluno_id", alunoId).order("iniciada_em", { ascending: false }).limit(120),
    db.from("trocas_exercicio").select("exercicio_de, criado_em").eq("aluno_id", alunoId).gte("criado_em", desde),
  ]);
  return calcularAdaptacao(
    (sessoes ?? []).map((x) => ({
      em: (x.concluida_em ?? x.iniciada_em) as string,
      concluida: !!x.concluida_em,
      avaliacao: (x.avaliacao ?? null) as SessaoHistorico["avaliacao"],
      series: (Array.isArray(x.series) ? x.series : []).filter((i): i is ItemSerie => !!i && typeof i === "object" && typeof (i as ItemSerie).exercicioId === "string"),
    })),
    (trocas ?? []).map((t) => ({ de: t.exercicio_de as string, em: t.criado_em as string })),
    Date.now(),
  );
}

/** Uma série feita (ou um registro de dor, com serie 0), como fica em sessoes.series. */
export type SerieFeita = ItemSerie;

/** Treino gerado + adaptação do aluno (troca o que deve evitar, ajusta o volume). */
async function treinoAdaptado(alunoId: string, conteudo: Conteudo, perfil: PerfilAluno, posicao: number) {
  const [catalogo, adaptacao] = await Promise.all([carregarCatalogoIA(), adaptacaoDoAluno(alunoId)]);
  const opcoesDe = (r: Conteudo) => {
    try {
      return opcoesDeTroca(r, perfil, posicao, catalogo);
    } catch (e) {
      console.error("[troca] substitutos falharam", e instanceof Error ? e.message : "erro");
      return new Map<string, { id: string; nome: string; videoUrl?: string }[]>();
    }
  };
  const precisa = adaptacao.menosVolume || conteudo.blocks.some((b) => b.exercises.some((x) => adaptacao.evitar.has(x.exerciseId)));
  const { rascunho, notas } = precisa ? adaptarTreino(conteudo, adaptacao, opcoesDe(conteudo)) : { rascunho: conteudo, notas: [] as string[] };
  return { catalogo, adaptacao, rascunho, notas, opcoes: opcoesDe(rascunho) };
}

export async function treinoParaSessao(alunoId: string, posicao: number): Promise<{ treino: TreinoSessao; protocoloTreinoId: string } | null> {
  const db = createAdminClient();
  const { data: p } = await db.from("protocolos").select("id, total_treinos, perfil, local").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle();
  if (!p) return null;
  const { data: t } = await db.from("protocolo_treinos").select("id, posicao, titulo, duracao_min, conteudo, status").eq("protocolo_id", p.id).eq("posicao", posicao).maybeSingle();
  if (!t || t.status !== "pronto" || !t.conteudo) return null;
  const { catalogo, adaptacao, rascunho, notas, opcoes } = await treinoAdaptado(alunoId, t.conteudo as Conteudo, p.perfil as PerfilAluno, posicao);
  const info = new Map<string, InfoExercicio>(catalogo.map((x) => [x.id, { musculos: x.musculos, grupoMuscular: x.muscularGroup, equipamentos: x.equipamentos }]));
  const { data: exp } = await db.from("explicacoes").select("exercicio_id, posicao_inicial, movimento, cuidado").in("exercicio_id", idsDoConteudo(rascunho)).in("status", ["aprovado", "com_audio"]);
  const explicacoes = new Map((exp ?? []).map((x) => [x.exercicio_id as string, { posicao: x.posicao_inicial as string, movimento: x.movimento as string, cuidado: x.cuidado as string }]));
  const treino = paraTreinoSessao(rascunho, {
    cargas: adaptacao.cargas,
    explicacoes,
    opcoes,
    id: `protocolo-${String(posicao).padStart(2, "0")}`,
    titulo: t.titulo ?? "Treino",
    posicao,
    total: p.total_treinos ?? 24,
    duracaoMin: t.duracao_min ?? 40,
    perfil: p.perfil as PerfilAluno,
    local: p.local,
    info,
  });
  return { treino: { ...treino, notas }, protocoloTreinoId: t.id };
}

export type Proximo =
  | { situacao: "pronto"; posicao: number; titulo: string; duracaoMin: number; exercicios: number; total: number; local: string; feitos: number; video: string | null }
  | { situacao: "montando"; feitos: number; total: number }
  | { situacao: "sem_protocolo" }
  | { situacao: "concluido"; total: number };

/** O treino de hoje: o primeiro pronto que o aluno ainda não concluiu. */
export async function proximoTreino(alunoId: string): Promise<Proximo> {
  const p = await protocoloAtivo(alunoId);
  if (!p) return { situacao: "sem_protocolo" };
  const db = createAdminClient();
  const ids = p.treinos.map((t) => t.id);
  const { data: s } = ids.length ? await db.from("sessoes").select("protocolo_treino_id").in("protocolo_treino_id", ids).not("concluida_em", "is", null) : { data: [] };
  const feitosIds = new Set((s ?? []).map((x) => x.protocolo_treino_id));
  const feitos = feitosIds.size;
  if (feitos >= p.totalTreinos) return { situacao: "concluido", total: p.totalTreinos };
  const prox = p.treinos.find((t) => !feitosIds.has(t.id));
  if (!prox || prox.status !== "pronto") return { situacao: "montando", feitos, total: p.totalTreinos };
  const { data: c } = await db.from("protocolo_treinos").select("conteudo").eq("id", prox.id).maybeSingle();
  const { data: pr } = await db.from("protocolos").select("local").eq("id", p.id).maybeSingle();
  return {
    situacao: "pronto",
    posicao: prox.posicao,
    titulo: prox.titulo ?? "Treino",
    duracaoMin: prox.duracaoMin ?? p.perfil.minutos,
    exercicios: c?.conteudo ? exerciciosDistintos(c.conteudo as Conteudo) : 0,
    total: p.totalTreinos,
    local: pr?.local ?? "casa",
    feitos,
    video: (c?.conteudo as Conteudo | undefined)?.blocks?.[1]?.exercises?.[0]?.videoUrl ?? (c?.conteudo as Conteudo | undefined)?.blocks?.[0]?.exercises?.[0]?.videoUrl ?? null,
  };
}

// ── telas: Meu plano e Detalhe ─────────────────────────────────────────────

const NIVEL_ROTULO: Record<string, string> = { N0: "Iniciante", N1: "Iniciante", N2: "Intermediário", N3: "Avançado" };
export const nivelRotulo = (p: PerfilAluno) => (p.familia === "reabilitacao" ? "Reabilitação" : (NIVEL_ROTULO[p.nivel ?? ""] ?? "Iniciante"));

export type SituacaoReal = "feito" | "atual" | "pronto" | "montando" | "futuro" | "erro";
export interface PlanoReal {
  total: number;
  feitos: number;
  atual: number | null;
  nivel: string;
  diasSemana: number;
  treinos: { posicao: number; situacao: SituacaoReal; titulo: string | null; duracaoMin: number | null }[];
}

async function feitosDo(p: ProtocoloAtivo): Promise<Set<string>> {
  const ids = p.treinos.map((t) => t.id);
  if (!ids.length) return new Set();
  const { data } = await createAdminClient().from("sessoes").select("protocolo_treino_id").in("protocolo_treino_id", ids).not("concluida_em", "is", null);
  return new Set((data ?? []).map((x) => x.protocolo_treino_id as string));
}

export async function planoDoAluno(alunoId: string): Promise<PlanoReal | null> {
  const p = await protocoloAtivo(alunoId);
  if (!p) return null;
  const feitos = await feitosDo(p);
  const porPosicao = new Map(p.treinos.map((t) => [t.posicao, t]));
  let atual: number | null = null;
  const treinos = Array.from({ length: p.totalTreinos }, (_, i) => {
    const posicao = i + 1;
    const t = porPosicao.get(posicao);
    let situacao: SituacaoReal;
    if (t && feitos.has(t.id)) situacao = "feito";
    else if (!t) situacao = "futuro";
    else if (t.status === "pronto") situacao = atual === null ? "atual" : "pronto";
    else if (t.status === "erro") situacao = "erro";
    else situacao = "montando";
    if (situacao === "atual") atual = posicao;
    if (atual === null && (situacao === "montando" || situacao === "erro")) atual = posicao;
    return { posicao, situacao, titulo: t?.titulo ?? null, duracaoMin: t?.duracaoMin ?? null };
  });
  return { total: p.totalTreinos, feitos: feitos.size, atual, nivel: nivelRotulo(p.perfil), diasSemana: p.perfil.diasSemana ?? 3, treinos };
}

export interface DetalheReal {
  posicao: number;
  total: number;
  /** Aluno com programa: treinos do protocolo liberados até aqui (1ª semana). */
  diasSemana: number;
  situacao: SituacaoReal;
  titulo: string | null;
  duracaoMin: number;
  nivel: string;
  local: string;
  equipamentos: string;
  musculos: string;
  video: string | null;
  exercicios: [string, string][];
  /** Ajustes da adaptação (volume, exercícios trocados). */
  notas: string[];
  // Treino pronto da vitrine (lib/dados/treinos-prontos.ts):
  sobretitulo?: string;
  /** Rota da execução. */
  execucao?: string;
  bloqueado?: boolean;
}

const LOCAL_ROTULO: Record<string, string> = { casa: "Em casa", condominio: "Condomínio", academia: "Academia" };
const PALAVRA_BONECO: Record<string, string> = { deltoide: "ombro", dorsal: "costas", peitoral: "peito", "bíceps": "braço", "tríceps": "braço", "posterior de coxa": "posterior", "abdômen": "abdômen" };

/** Lista "nome · séries" do treino gerado (Detalhe e auditoria do Master). */
export function exerciciosDoConteudo(c: Conteudo): [string, string][] {
  const lista: [string, string][] = [];
  for (const b of c.blocks) {
    const alternado = (b.method === "Circuito" || b.method === "Bi-Set") && b.exercises.length > 1;
    for (const x of b.exercises) {
      const alvos = x.series.map((s) => (s.type === "time" ? `${s.target.replace(/\D+$/, "")} s` : s.target));
      const iguais = alvos.every((a) => a === alvos[0]);
      const medida = `${x.series.length} × ${iguais ? alvos[0] : alvos.join("-")}`;
      lista.push([x.exerciseName, alternado ? `${b.method === "Bi-Set" ? "Bi-set" : "Circuito"} · ${medida}` : medida]);
    }
  }
  return lista;
}

export async function detalheDoTreino(alunoId: string, posicao: number): Promise<DetalheReal | null> {
  const p = await protocoloAtivo(alunoId);
  if (!p || posicao < 1 || posicao > p.totalTreinos) return null;
  const db = createAdminClient();
  const { data: pr } = await db.from("protocolos").select("local").eq("id", p.id).maybeSingle();
  const plano = await planoDoAluno(alunoId);
  const situacao = plano?.treinos[posicao - 1]?.situacao ?? "futuro";
  const base = {
    posicao,
    total: p.totalTreinos,
    situacao,
    nivel: nivelRotulo(p.perfil),
    local: LOCAL_ROTULO[pr?.local ?? ""] ?? "Em casa",
    duracaoMin: p.perfil.minutos,
    diasSemana: p.perfil.diasSemana ?? 3,
  };
  const t = p.treinos.find((x) => x.posicao === posicao);
  if (!t || t.status !== "pronto") return { ...base, titulo: t?.titulo ?? null, equipamentos: "", musculos: "", video: null, exercicios: [], notas: [] };

  const { data } = await db.from("protocolo_treinos").select("conteudo, duracao_min").eq("id", t.id).maybeSingle();
  const original = data?.conteudo as Conteudo | undefined;
  if (!original) return { ...base, titulo: t.titulo, equipamentos: "", musculos: "", video: null, exercicios: [], notas: [] };
  // Treino já feito mostra como foi montado; os próximos já com a adaptação do aluno.
  const adaptado = situacao === "feito" ? null : await treinoAdaptado(alunoId, original, p.perfil, posicao);
  const c = adaptado?.rascunho ?? original;
  const catalogo = adaptado?.catalogo ?? (await carregarCatalogoIA());
  const porId = new Map(catalogo.map((x) => [x.id, x]));
  const equip = new Set<string>();
  const musc = new Map<string, number>();
  for (const b of c.blocks)
    for (const x of b.exercises) {
      const item = porId.get(x.exerciseId);
      (item?.equipamentos ?? []).filter((e) => e !== "peso do corpo").forEach((e) => equip.add(e));
      (item?.musculos ?? []).forEach((m) => musc.set(m, (musc.get(m) ?? 0) + 1));
    }
  const exercicios = exerciciosDoConteudo(c);
  const primeiro = c.blocks[1]?.exercises[0] ?? c.blocks[0]?.exercises[0];
  const lista = [...equip];
  return {
    ...base,
    titulo: t.titulo,
    duracaoMin: data?.duracao_min ?? base.duracaoMin,
    equipamentos: lista.length ? lista.map((e, i) => (i ? e : e[0].toUpperCase() + e.slice(1))).join(", ") : "Peso do corpo",
    // Palavras que o boneco do mapa muscular reconhece (lib/midia.ts).
    musculos: [...musc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m]) => PALAVRA_BONECO[m] ?? m).join(" "),
    video: primeiro?.videoUrl ?? null,
    exercicios,
    notas: adaptado?.notas ?? [],
  };
}
