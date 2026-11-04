import "server-only";
import type { PerfilAluno } from "../ia-treino/aluno";
import { createAdminClient } from "../supabase/admin";
import { exerciciosDoConteudo, nivelRotulo, type Conteudo } from "./treinos";

// Master: Protocolos (avaliações, mais trocados, auditoria), Explicações e Vitrine, lidos do banco.

const FAMILIA: Record<string, string> = { hipertrofia: "Hipertrofia", condicionamento: "Condicionamento", cardio_hiit: "Cardio e HIIT", reabilitacao: "Reabilitação" };
const LOCAL: Record<string, string> = { casa: "casa", condominio: "condomínio", academia: "academia" };

async function todas<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta(de, de + 999);
    if (error) throw new Error(`[master] ${error.code}`);
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return linhas;
}

export interface Auditoria {
  protocoloId: string;
  para: string;
  titulo: string;
  exercicios: [string, string][];
}

export interface ProtocolosDados {
  ativos: number;
  prontos: number;
  erros: number;
  /** [grupo, % fácil, % ideal, % difícil, avaliações] */
  avaliacoes: [string, number, number, number, number][];
  /** [exercício, trocado por (mais comum), vezes] */
  maisTrocados: [string, string, number][];
  auditoria: Auditoria[];
  auditoriaPendentes: number;
}

export async function protocolosMaster(): Promise<ProtocolosDados> {
  const db = createAdminClient();
  const protocolos = await todas<{ id: string; aluno_id: string; local: string; perfil: PerfilAluno | null; ativo: boolean; auditoria: string; criado_em: string }>((de, ate) =>
    db.from("protocolos").select("id, aluno_id, local, perfil, ativo, auditoria, criado_em").order("criado_em", { ascending: false }).range(de, ate),
  );
  const porProtocolo = new Map(protocolos.map((p) => [p.id, p]));
  const treinos = await todas<{ id: string; protocolo_id: string; status: string; titulo: string | null; gerado_em: string | null }>((de, ate) =>
    db.from("protocolo_treinos").select("id, protocolo_id, status, titulo, gerado_em").order("id").range(de, ate),
  );
  const treinoProtocolo = new Map(treinos.map((t) => [t.id, t.protocolo_id]));

  // Avaliações por grupo (objetivo · nível · local).
  const sessoes = await todas<{ protocolo_treino_id: string | null; avaliacao: string | null }>((de, ate) =>
    db.from("sessoes").select("protocolo_treino_id, avaliacao").not("avaliacao", "is", null).order("id").range(de, ate),
  );
  const grupos = new Map<string, { facil: number; ideal: number; dificil: number }>();
  for (const s of sessoes) {
    const p = porProtocolo.get(treinoProtocolo.get(s.protocolo_treino_id ?? "") ?? "");
    if (!p?.perfil) continue;
    const nome = `${FAMILIA[p.perfil.familia] ?? p.perfil.familia} · ${nivelRotulo(p.perfil).toLowerCase()} · ${LOCAL[p.local] ?? p.local}`;
    const g = grupos.get(nome) ?? { facil: 0, ideal: 0, dificil: 0 };
    if (s.avaliacao === "facil" || s.avaliacao === "ideal" || s.avaliacao === "dificil") g[s.avaliacao]++;
    grupos.set(nome, g);
  }
  const avaliacoes = [...grupos.entries()]
    .map(([nome, g]): [string, number, number, number, number] => {
      const t = g.facil + g.ideal + g.dificil || 1;
      const f = Math.round((g.facil / t) * 100), d = Math.round((g.dificil / t) * 100);
      return [nome, f, 100 - f - d, d, g.facil + g.ideal + g.dificil];
    })
    .sort((a, b) => b[4] - a[4])
    .slice(0, 8);

  // Mais trocados.
  const trocas = await todas<{ exercicio_de: string; exercicio_para: string }>((de, ate) => db.from("trocas_exercicio").select("exercicio_de, exercicio_para").order("id").range(de, ate));
  const porDe = new Map<string, Map<string, number>>();
  for (const t of trocas) {
    const m = porDe.get(t.exercicio_de) ?? new Map<string, number>();
    m.set(t.exercicio_para, (m.get(t.exercicio_para) ?? 0) + 1);
    porDe.set(t.exercicio_de, m);
  }
  const topo = [...porDe.entries()].map(([de, m]) => ({ de, total: [...m.values()].reduce((a, b) => a + b, 0), para: [...m.entries()].sort((a, b) => b[1] - a[1])[0][0] })).sort((a, b) => b.total - a.total).slice(0, 6);
  const ids = [...new Set(topo.flatMap((x) => [x.de, x.para]))];
  const { data: nomes } = ids.length ? await db.from("exercicios").select("id, nome").in("id", ids) : { data: [] };
  const nome = new Map((nomes ?? []).map((x) => [x.id, x.nome as string]));
  const maisTrocados = topo.map((x): [string, string, number] => [nome.get(x.de) ?? "Exercício", nome.get(x.para) ?? "Exercício", x.total]);

  // Auditoria: protocolos pendentes com pelo menos um treino pronto; mostra o último gerado.
  const pendentes = protocolos.filter((p) => p.auditoria === "pendente" && p.perfil);
  const ultimoPronto = new Map<string, { id: string; titulo: string | null; gerado_em: string | null }>();
  for (const t of treinos)
    if (t.status === "pronto") {
      const u = ultimoPronto.get(t.protocolo_id);
      if (!u || (t.gerado_em ?? "") > (u.gerado_em ?? "")) ultimoPronto.set(t.protocolo_id, t);
    }
  const amostra = pendentes.filter((p) => ultimoPronto.has(p.id)).slice(0, 20);
  const alunos = amostra.length ? (await db.from("perfis").select("id, nome, email").in("id", [...new Set(amostra.map((p) => p.aluno_id))])).data ?? [] : [];
  const nomeAluno = new Map(alunos.map((a) => [a.id, (a.nome as string) || (a.email as string).split("@")[0]]));
  const conteudos = amostra.length
    ? ((await db.from("protocolo_treinos").select("id, conteudo").in("id", amostra.map((p) => ultimoPronto.get(p.id)!.id))).data ?? [])
    : [];
  const conteudo = new Map(conteudos.map((c) => [c.id, c.conteudo as Conteudo]));
  const auditoria = amostra.flatMap((p): Auditoria[] => {
    const t = ultimoPronto.get(p.id)!;
    const c = conteudo.get(t.id);
    if (!c || !p.perfil) return [];
    const n = (nomeAluno.get(p.aluno_id) ?? "aluno").split(" ");
    const curto = n.length > 1 ? `${n[0]} ${n[n.length - 1][0]}.` : n[0];
    return [{ protocoloId: p.id, para: `GERADO PARA ${curto} · ${(LOCAL[p.local] ?? p.local)} · ${nivelRotulo(p.perfil)}`.toUpperCase(), titulo: t.titulo ?? "Treino", exercicios: exerciciosDoConteudo(c) }];
  });

  return {
    ativos: protocolos.filter((p) => p.ativo).length,
    prontos: treinos.filter((t) => t.status === "pronto").length,
    erros: treinos.filter((t) => t.status === "erro").length,
    avaliacoes,
    maisTrocados,
    auditoria,
    auditoriaPendentes: pendentes.filter((p) => ultimoPronto.has(p.id)).length,
  };
}

// ── Explicações ─────────────────────────────────────────────────────────────

export type StatusExplicacao = "pendente" | "aprovado" | "com_audio";
export interface ExplicacaoMaster {
  exercicioId: string;
  nome: string;
  videoUrl: string | null;
  posicao: string;
  movimento: string;
  cuidado: string;
  status: StatusExplicacao;
}
export interface ExplicacoesDados {
  contagem: Record<StatusExplicacao, number>;
  /** Exercícios ativos ainda sem explicação. */
  semExplicacao: number;
  /** Até 30 por status, os mais recentes. */
  lista: ExplicacaoMaster[];
}

export async function explicacoesMaster(): Promise<ExplicacoesDados> {
  const db = createAdminClient();
  const contar = async (status: StatusExplicacao) => (await db.from("explicacoes").select("exercicio_id", { count: "exact", head: true }).eq("status", status)).count ?? 0;
  const [pendente, aprovado, com_audio, ativos] = await Promise.all([
    contar("pendente"),
    contar("aprovado"),
    contar("com_audio"),
    db.from("exercicios").select("id", { count: "exact", head: true }).eq("ativo", true).then((r) => r.count ?? 0),
  ]);
  const lista: ExplicacaoMaster[] = [];
  for (const status of ["pendente", "aprovado", "com_audio"] as StatusExplicacao[]) {
    const { data } = await db
      .from("explicacoes")
      .select("exercicio_id, posicao_inicial, movimento, cuidado, status, exercicios(nome, video_url, video_origem)")
      .eq("status", status)
      .order("atualizado_em", { ascending: false })
      .limit(30);
    for (const x of data ?? []) {
      const e = x.exercicios as unknown as { nome: string; video_url: string | null; video_origem: string | null } | null;
      lista.push({ exercicioId: x.exercicio_id, nome: e?.nome ?? "Exercício", videoUrl: e?.video_url || e?.video_origem || null, posicao: x.posicao_inicial, movimento: x.movimento, cuidado: x.cuidado, status: x.status as StatusExplicacao });
    }
  }
  return { contagem: { pendente, aprovado, com_audio }, semExplicacao: Math.max(0, ativos - pendente - aprovado - com_audio), lista };
}

// ── Vitrine ─────────────────────────────────────────────────────────────────

export interface FileiraVitrine {
  titulo: string;
  estilo: "cards" | "tiles" | "automatica";
  visivel: boolean;
}

/** Ordem e visibilidade das fileiras da Início. null = nunca publicada (usa a ordem padrão). */
export async function lerVitrine(): Promise<FileiraVitrine[] | null> {
  const { data, error } = await createAdminClient().from("fileiras_vitrine").select("titulo, estilo, visivel, ordem").order("ordem");
  if (error || !data?.length) return null;
  return data.map((x) => ({ titulo: x.titulo, estilo: x.estilo, visivel: x.visivel }));
}
