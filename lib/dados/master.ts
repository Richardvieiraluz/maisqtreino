import "server-only";
import type { LinhaAcesso } from "../acesso";
import { estadoDosAcessos } from "../acesso";
import type { BaseMaster } from "../master-calculos";
import type { RespostasQuiz } from "../quiz";
import { createAdminClient } from "../supabase/admin";

// Leituras do Master no banco (chave de serviço). Quem chama já passou pelo app/master/layout.tsx,
// que barra quem não é master; as ações em lib/acoes/master.ts conferem de novo.

/** Lê todas as linhas, de 1000 em 1000 (limite do Supabase por consulta). */
async function todas<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta(de, de + 999);
    if (error) throw new Error(`[master] leitura falhou: ${error.code}`);
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) return linhas;
  }
}

type LinhaAcessoBanco = { aluno_id: string; produto_id: string; status: LinhaAcesso["status"]; valido_ate: string | null; inicio: string; produtos: { tipo: LinhaAcesso["tipo"]; nome: string } | null };

export async function carregarBaseMaster(): Promise<BaseMaster> {
  const db = createAdminClient();
  const [alunos, acessos, quizzes, sessoes] = await Promise.all([
    todas<BaseMaster["alunos"][number]>((de, ate) => db.from("perfis").select("id, nome, email, criado_em").eq("papel", "aluno").order("criado_em").range(de, ate)),
    todas<LinhaAcessoBanco>((de, ate) => db.from("acessos").select("aluno_id, produto_id, status, valido_ate, inicio, produtos(tipo, nome)").order("inicio").range(de, ate) as never),
    todas<BaseMaster["quizzes"][number]>((de, ate) => db.from("respostas_quiz").select("aluno_id, criado_em").order("criado_em").range(de, ate)),
    todas<BaseMaster["sessoes"][number]>((de, ate) =>
      db.from("sessoes").select("aluno_id, concluida_em, avaliacao").not("concluida_em", "is", null).order("concluida_em").range(de, ate),
    ),
  ]);
  return {
    alunos,
    acessos: acessos.map((a) => ({ ...a, tipo: a.produtos?.tipo ?? "programa", nome_produto: a.produtos?.nome ?? a.produto_id })),
    quizzes,
    sessoes,
  };
}

export interface ProdutoOpcao {
  id: string;
  nome: string;
}

export async function listarProdutos(): Promise<ProdutoOpcao[]> {
  const { data } = await createAdminClient().from("produtos").select("id, nome").eq("ativo", true).order("ordem");
  return data ?? [];
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).replace(".", "");

export interface FichaDados {
  id: string;
  nome: string;
  email: string;
  desde: string;
  estado: string;
  produtos: { nome: string; situacao: string }[];
  quiz: RespostasQuiz | null;
  treinos: { total: number; facil: number; ideal: number; dificil: number; ultimo: string | null };
}

export async function fichaAluno(id: string): Promise<FichaDados | null> {
  const db = createAdminClient();
  const [perfil, acessos, quiz, sessoes] = await Promise.all([
    db.from("perfis").select("id, nome, email, criado_em").eq("id", id).maybeSingle(),
    db.from("acessos").select("produto_id, status, valido_ate, inicio, liberado_por, produtos(tipo, nome)").eq("aluno_id", id).order("inicio"),
    db.from("respostas_quiz").select("respostas").eq("aluno_id", id).order("criado_em", { ascending: false }).limit(1).maybeSingle(),
    db.from("sessoes").select("concluida_em, avaliacao").eq("aluno_id", id).not("concluida_em", "is", null).order("concluida_em", { ascending: false }),
  ]);
  if (!perfil.data) return null;
  const linhas = (acessos.data ?? []).map((a) => {
    const p = a.produtos as unknown as { tipo: LinhaAcesso["tipo"]; nome: string } | null;
    return { produto_id: a.produto_id, status: a.status, valido_ate: a.valido_ate, tipo: p?.tipo ?? "programa", nome: p?.nome ?? a.produto_id, inicio: a.inicio, liberado_por: a.liberado_por };
  });
  const rotulo: Record<string, string> = { assinante: "Assinante", programa: "Programa", pausada: "Pausada", sem_acesso: "Sem compra" };
  const s = sessoes.data ?? [];
  return {
    id,
    nome: perfil.data.nome || perfil.data.email.split("@")[0],
    email: perfil.data.email,
    desde: dataCurta(perfil.data.criado_em),
    estado: rotulo[estadoDosAcessos(linhas).estado],
    produtos: linhas.map((l) => ({
      nome: l.nome,
      situacao: [
        l.status === "ativo" ? "Ativo" : l.status === "pausado" ? "Pausado" : l.status === "cancelado" ? "Cancelado" : "Reembolsado",
        `desde ${dataCurta(l.inicio)}`,
        l.valido_ate ? `até ${dataCurta(l.valido_ate)}` : l.tipo === "programa" ? "vitalício" : "",
        l.liberado_por === "master" ? "liberado por você" : "",
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    quiz: (quiz.data?.respostas as RespostasQuiz | undefined) ?? null,
    treinos: {
      total: s.length,
      facil: s.filter((x) => x.avaliacao === "facil").length,
      ideal: s.filter((x) => x.avaliacao === "ideal").length,
      dificil: s.filter((x) => x.avaliacao === "dificil").length,
      ultimo: s[0]?.concluida_em ? dataCurta(s[0].concluida_em) : null,
    },
  };
}
