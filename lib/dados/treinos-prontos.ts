import "server-only";
import type { Sessao } from "../auth";
import type { TreinoVitrine } from "../catalogo-exemplo";
import { calcularAdaptacao } from "../ia-treino/adaptacao";
import { perfilDoQuiz, type PerfilAluno } from "../ia-treino/aluno";
import { paraTreinoSessao, type InfoExercicio } from "../ia-treino/para-sessao";
import { opcoesDeTroca } from "../ia-treino/trocas-aluno";
import type { CardTreino, TreinoSessao } from "../tipos";
import { createAdminClient } from "../supabase/admin";
import { fileiraDo, LOCAL_ROTULO, NIVEL_ROTULO, prontoBloqueado, quizDaBase, type ConteudoPronto, type TreinoPronto } from "../treinos-prontos";
import { adaptacaoDoAluno, carregarCatalogoIA, exerciciosDoConteudo, type DetalheReal } from "./treinos";

// Treinos prontos (tabela `treinos`): leitura para o Master e para a vitrine do aluno.

const COLUNAS = "id, titulo, tipo, produto_id, local, nivel, duracao_min, regioes, lesao_regiao, lesao_fase, ordem, publicado, conteudo, atualizado_em";

type Linha = {
  id: string;
  titulo: string;
  tipo: TreinoPronto["tipo"];
  produto_id: string | null;
  local: TreinoPronto["local"];
  nivel: TreinoPronto["nivel"];
  duracao_min: number;
  regioes: string[] | null;
  lesao_regiao: string | null;
  lesao_fase: number | null;
  ordem: number;
  publicado: boolean;
  conteudo: ConteudoPronto;
  atualizado_em: string;
};

const mapPronto = (l: Linha): TreinoPronto => ({
  id: l.id,
  titulo: l.titulo,
  tipo: l.tipo,
  produtoId: l.produto_id,
  local: l.local,
  nivel: l.nivel,
  duracaoMin: l.duracao_min,
  regioes: l.regioes ?? [],
  lesaoRegiao: l.lesao_regiao,
  lesaoFase: l.lesao_fase,
  ordem: l.ordem,
  publicado: l.publicado,
  conteudo: l.conteudo,
  atualizadoEm: l.atualizado_em,
});

export async function listarProntos(soPublicados = false): Promise<TreinoPronto[]> {
  let q = createAdminClient().from("treinos").select(COLUNAS).order("tipo").order("produto_id").order("ordem").order("titulo").limit(1000);
  if (soPublicados) q = q.eq("publicado", true);
  const { data, error } = await q;
  if (error) throw new Error(`[prontos] ${error.code}`);
  return ((data ?? []) as Linha[]).map(mapPronto);
}

export async function lerPronto(id: string): Promise<TreinoPronto | null> {
  const { data } = await createAdminClient().from("treinos").select(COLUNAS).eq("id", id).maybeSingle();
  return data ? mapPronto(data as Linha) : null;
}

export async function programasDisponiveis(): Promise<{ id: string; nome: string }[]> {
  const { data } = await createAdminClient().from("produtos").select("id, nome").eq("tipo", "programa").order("ordem");
  return (data ?? []).map((x) => ({ id: x.id as string, nome: x.nome as string }));
}

/** Perfil equivalente ao treino (para substitutos na troca e para a IA montar o rascunho). */
export function perfilDoPronto(t: TreinoPronto): PerfilAluno {
  const base = t.conteudo.base ?? { objetivo: t.tipo === "lesao" ? "Aliviar dores" : "Condicionamento", equipamentos: [], tempo: "40" as const, regioes: t.regioes, dor: t.lesaoRegiao };
  return perfilDoQuiz(quizDaBase(t, base));
}

// ── vitrine do aluno ────────────────────────────────────────────────────────

export interface VitrineReal {
  /** Para Busca e Ver tudo. */
  lista: TreinoVitrine[];
  /** Fileiras de cards da Início (só as que têm treino publicado). */
  fileiras: { titulo: string; itens: CardTreino[] }[];
  /** Minutos dos rápidos publicados (10, 15...). */
  rapidos: number[];
  temLesoes: boolean;
  /** Itens dos atalhos (material, região...) que acham pelo menos um treino. */
  etiquetas: string[];
}

export async function vitrineDoAluno(sessao: Pick<Sessao, "id" | "estado" | "programas"> | null): Promise<VitrineReal> {
  const [treinos, catalogo, programas] = await Promise.all([listarProntos(true), carregarCatalogoIA(), programasDisponiveis()]);
  const porId = new Map(catalogo.map((x) => [x.id, x]));
  const nomePrograma = new Map(programas.map((p) => [p.id, p.nome]));
  let feitos = new Set<string>();
  if (sessao) {
    const { data } = await createAdminClient().from("sessoes").select("treino_id").eq("aluno_id", sessao.id).not("treino_id", "is", null).not("concluida_em", "is", null);
    feitos = new Set((data ?? []).map((x) => x.treino_id as string));
  }
  const estado = sessao?.estado ?? "assinante";
  const lista: TreinoVitrine[] = treinos.map((t) => {
    const etiq = new Set<string>([...t.regioes]);
    if (t.lesaoRegiao) etiq.add(t.lesaoRegiao);
    for (const b of t.conteudo.blocks)
      for (const x of b.exercises) {
        const item = porId.get(x.exerciseId);
        etiq.add(x.exerciseName);
        (item?.equipamentos ?? []).forEach((e) => etiq.add(e));
        (item?.musculos ?? []).forEach((m) => etiq.add(m));
        if (item?.modality) etiq.add(item.modality);
      }
    return {
      id: t.id,
      nome: t.titulo,
      minutos: t.duracaoMin,
      nivel: NIVEL_ROTULO[t.nivel],
      local: t.local === "academia" ? "Academia" : "Casa",
      etiquetas: [...etiq],
      fileira: fileiraDo(t),
      programa: t.produtoId ?? undefined,
      programaNome: t.produtoId ? (nomePrograma.get(t.produtoId) ?? t.produtoId) : undefined,
      ordem: t.ordem,
      bloqueado: prontoBloqueado(t, estado, sessao?.programas ?? []),
      feito: feitos.has(t.id),
      sub: t.tipo === "lesao" ? `${t.lesaoRegiao} · fase ${t.lesaoFase}` : t.tipo === "programa" ? `Treino ${String(t.ordem).padStart(2, "0")}` : undefined,
    };
  });

  const card = (t: TreinoVitrine): CardTreino => ({ id: t.id!, nome: t.nome, duracao: `${t.minutos} min`, nivel: t.nivel, doPrograma: !t.bloqueado, feito: t.feito });
  const fileiras: VitrineReal["fileiras"] = [];
  // Programas: um card por programa, que abre a lista dele em ordem.
  const progs = [...new Set(lista.filter((t) => t.fileira === "Programas").map((t) => t.programa!))];
  if (progs.length)
    fileiras.push({
      titulo: "Programas",
      itens: progs.map((p) => {
        const doProg = lista.filter((t) => t.programa === p);
        const niveis = [...new Set(doProg.map((t) => t.nivel))];
        return { id: `programa:${p}`, nome: doProg[0].programaNome!, duracao: `${doProg.length} ${doProg.length === 1 ? "treino" : "treinos"}`, nivel: niveis.length === 1 ? niveis[0] : "Todos", doPrograma: !doProg[0].bloqueado, feito: doProg.every((t) => t.feito) };
      }),
    });
  for (const titulo of ["Treino em casa", "Treino na academia"]) {
    const itens = lista.filter((t) => t.fileira === titulo);
    if (itens.length) fileiras.push({ titulo, itens: itens.slice(0, 12).map(card) });
  }
  const atalhos = ["Mini band", "Elástico", "Halter", "Kettlebell", "TRX", "Bola suíça", "Peso do corpo", "Musculação", "Funcional", "Calistenia", "HIIT", "Alongamento", "Mobilidade", "Glúteo", "Pernas", "Abdômen", "Costas", "Peito", "Ombros", "Braços", "Lombar"];
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const etiquetas = atalhos.filter((a) => lista.some((t) => norm([t.nome, ...t.etiquetas].join(" ")).includes(norm(a))));
  return {
    lista,
    fileiras,
    rapidos: [...new Set(lista.filter((t) => t.fileira === "Rápidos").map((t) => t.minutos))].sort((a, b) => a - b),
    temLesoes: lista.some((t) => t.fileira === "Lesões"),
    etiquetas,
  };
}

// ── detalhe e execução ──────────────────────────────────────────────────────

const PALAVRA_BONECO: Record<string, string> = { deltoide: "ombro", dorsal: "costas", peitoral: "peito", "bíceps": "braço", "tríceps": "braço", "posterior de coxa": "posterior" };

export async function detalheDoPronto(sessao: Pick<Sessao, "estado" | "programas" | "papel"> | null, id: string): Promise<(DetalheReal & { bloqueado: boolean }) | null> {
  const t = await lerPronto(id);
  if (!t || (!t.publicado && sessao?.papel !== "master")) return null;
  const catalogo = await carregarCatalogoIA();
  const porId = new Map(catalogo.map((x) => [x.id, x]));
  const equip = new Set<string>();
  const musc = new Map<string, number>();
  for (const b of t.conteudo.blocks)
    for (const x of b.exercises) {
      const item = porId.get(x.exerciseId);
      (item?.equipamentos ?? []).filter((e) => e !== "peso do corpo").forEach((e) => equip.add(e));
      (item?.musculos ?? []).forEach((m) => musc.set(m, (musc.get(m) ?? 0) + 1));
    }
  const lista = [...equip];
  const primeiro = t.conteudo.blocks[1]?.exercises[0] ?? t.conteudo.blocks[0]?.exercises[0];
  const sobre = t.tipo === "programa" ? `PROGRAMA · TREINO ${String(t.ordem).padStart(2, "0")}` : t.tipo === "lesao" ? `LESÃO · ${(t.lesaoRegiao ?? "").toUpperCase()} · FASE ${t.lesaoFase}` : t.tipo === "rapido" ? "TREINO RÁPIDO" : "TREINO PRONTO";
  return {
    posicao: 0,
    total: 0,
    diasSemana: 7,
    situacao: "pronto",
    titulo: t.titulo,
    duracaoMin: t.duracaoMin,
    nivel: NIVEL_ROTULO[t.nivel],
    local: LOCAL_ROTULO[t.local],
    equipamentos: lista.length ? lista.map((e, i) => (i ? e : e[0].toUpperCase() + e.slice(1))).join(", ") : "Peso do corpo",
    musculos: [...musc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m]) => PALAVRA_BONECO[m] ?? m).join(" "),
    video: primeiro?.videoUrl ?? null,
    exercicios: exerciciosDoConteudo(t.conteudo),
    notas: [],
    sobretitulo: sobre,
    execucao: `/treino/${t.id}`,
    bloqueado: sessao?.papel === "master" ? false : prontoBloqueado(t, sessao?.estado ?? "sem_acesso", sessao?.programas ?? []),
  };
}

/** Treino pronto na tela de execução, com a carga e a troca do aluno. */
export async function prontoParaSessao(sessao: Pick<Sessao, "id" | "estado" | "programas" | "papel">, id: string): Promise<{ treino: TreinoSessao; treinoId: string } | null> {
  const t = await lerPronto(id);
  if (!t || (!t.publicado && sessao.papel !== "master")) return null;
  if (sessao.papel !== "master" && prontoBloqueado(t, sessao.estado, sessao.programas)) return null;
  const [catalogo, adaptacao] = await Promise.all([carregarCatalogoIA(), sessao.papel === "aluno" ? adaptacaoDoAluno(sessao.id) : Promise.resolve(calcularAdaptacao([], [], Date.now()))]);
  const info = new Map<string, InfoExercicio>(catalogo.map((x) => [x.id, { musculos: x.musculos, grupoMuscular: x.muscularGroup, equipamentos: x.equipamentos }]));
  let opcoes = new Map<string, { id: string; nome: string; videoUrl?: string }[]>();
  try {
    opcoes = opcoesDeTroca(t.conteudo, perfilDoPronto(t), t.conteudo.posicao || 1, catalogo);
  } catch (e) {
    console.error("[pronto] substitutos falharam", e instanceof Error ? e.message : "erro");
  }
  const ids = t.conteudo.blocks.flatMap((b) => b.exercises.map((x) => x.exerciseId));
  const { data: exp } = await createAdminClient().from("explicacoes").select("exercicio_id, posicao_inicial, movimento, cuidado").in("exercicio_id", ids).in("status", ["aprovado", "com_audio"]);
  const explicacoes = new Map((exp ?? []).map((x) => [x.exercicio_id as string, { posicao: x.posicao_inicial as string, movimento: x.movimento as string, cuidado: x.cuidado as string }]));
  const treino = paraTreinoSessao(t.conteudo, {
    id: t.id,
    titulo: t.titulo,
    posicao: t.ordem || 1,
    total: 0,
    duracaoMin: t.duracaoMin,
    perfil: { nivel: perfilDoPronto(t).nivel },
    local: t.local,
    info,
    cargas: adaptacao.cargas,
    opcoes,
    explicacoes,
  });
  return { treino, treinoId: t.id };
}
