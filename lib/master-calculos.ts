// Contas do painel Master a partir das linhas do banco. Funções puras: recebem as linhas já
// lidas (lib/dados/master.ts) e devolvem o que as telas mostram, no mesmo formato dos dados de
// exemplo (lib/master-exemplo.ts).
import { estadoDosAcessos, type LinhaAcesso } from "./acesso";
import type { AlunoMaster } from "./master-exemplo";

const DIA = 86_400_000;

export interface BaseMaster {
  alunos: { id: string; nome: string; email: string; criado_em: string }[];
  acessos: (LinhaAcesso & { aluno_id: string; nome_produto: string; inicio: string })[];
  quizzes: { aluno_id: string; criado_em: string }[];
  sessoes: { aluno_id: string; concluida_em: string; avaliacao: string | null }[];
}

export interface AlunoLista extends AlunoMaster {
  /** Dias sem treinar (desde o cadastro, se nunca treinou). */
  dias: number;
  nunca: boolean;
}

const vigente = (a: LinhaAcesso, agora: number) => a.status === "ativo" && (!a.valido_ate || Date.parse(a.valido_ate) > agora);
const diasEntre = (iso: string, agora: number) => Math.max(0, Math.floor((agora - Date.parse(iso)) / DIA));

export function textoUltimoTreino(dias: number | null): string {
  if (dias === null) return "nunca";
  return dias === 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
}

export function listaDeAlunos(b: BaseMaster, agora = Date.now()): AlunoLista[] {
  const ultimo = new Map<string, number>();
  for (const s of b.sessoes) ultimo.set(s.aluno_id, Math.max(ultimo.get(s.aluno_id) ?? 0, Date.parse(s.concluida_em)));
  return b.alunos
    .map((a) => {
      const meus = b.acessos.filter((x) => x.aluno_id === a.id);
      const { estado } = estadoDosAcessos(meus, agora);
      const assinatura = meus.find((x) => x.tipo === "assinatura" && vigente(x, agora));
      const programas = meus.filter((x) => x.tipo === "programa" && vigente(x, agora)).map((x) => x.nome_produto);
      const antiga = meus.find((x) => x.tipo === "assinatura" && x.status !== "reembolsado");
      const produto = assinatura?.nome_produto ?? (programas.length ? programas.join(" + ") : antiga?.nome_produto ?? "Sem compra");
      const t = ultimo.get(a.id);
      const diasTreino = t ? diasEntre(new Date(t).toISOString(), agora) : null;
      return {
        id: a.id,
        nome: a.nome || a.email.split("@")[0],
        email: a.email,
        produto,
        ultimoTreino: textoUltimoTreino(diasTreino),
        estado: estado === "sem_acesso" ? ("pausada" as const) : estado,
        dias: diasTreino ?? diasEntre(a.criado_em, agora),
        nunca: diasTreino === null,
      };
    })
    .sort((x, y) => x.dias - y.dias || x.nome.localeCompare(y.nome, "pt-BR"));
}

export interface PainelDados {
  ativos: number;
  novosNoMes: number;
  mensal: number;
  anual: number;
  /** [produto, legenda, % do total]. No real: acessos vigentes por produto (valores em R$ entram com a Eduzz). */
  faturamento: [string, string, number][];
  conversao: { pct: number; compraram: number; comCupom?: number; assinaramComCupom?: number };
  pararam: number;
}

export function painel(b: BaseMaster, agora = Date.now()): PainelDados {
  const lista = listaDeAlunos(b, agora);
  const inicioMes = new Date(agora);
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const ativos = new Set(b.sessoes.filter((s) => agora - Date.parse(s.concluida_em) <= 14 * DIA).map((s) => s.aluno_id)).size;
  const vig = b.acessos.filter((a) => vigente(a, agora));
  const porProduto = new Map<string, number>();
  for (const a of vig) porProduto.set(a.nome_produto, (porProduto.get(a.nome_produto) ?? 0) + 1);
  const total = vig.length || 1;
  const comPrograma = new Set(b.acessos.filter((a) => a.tipo === "programa" && a.status !== "reembolsado").map((a) => a.aluno_id));
  const assinaram = [...comPrograma].filter((id) => b.acessos.some((a) => a.aluno_id === id && a.tipo === "assinatura" && a.status !== "reembolsado")).length;
  return {
    ativos,
    novosNoMes: b.alunos.filter((a) => Date.parse(a.criado_em) >= inicioMes.getTime()).length,
    mensal: vig.filter((a) => a.produto_id === "assinatura-mensal").length,
    anual: vig.filter((a) => a.produto_id === "assinatura-anual").length,
    faturamento: [...porProduto.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([nome, n]) => [nome, `${n} ${n === 1 ? "ativo" : "ativos"}`, Math.round((n / total) * 100)]),
    conversao: { pct: comPrograma.size ? Math.round((assinaram / comPrograma.size) * 100) : 0, compraram: comPrograma.size },
    pararam: lista.filter((a) => a.estado !== "pausada" && a.dias >= 10).length,
  };
}

export type Periodo = "7 DIAS" | "30 DIAS" | "90 DIAS";

/** Por período de compra do programa: [fizeram o quiz, treinaram na semana liberada, assinaram]. */
export function funil(b: BaseMaster, agora = Date.now()): Record<Periodo, [number, number, number]> {
  const calc = (dias: number): [number, number, number] => {
    const compras = new Map<string, number>();
    for (const a of b.acessos)
      if (a.tipo === "programa" && agora - Date.parse(a.inicio) <= dias * DIA)
        compras.set(a.aluno_id, Math.min(compras.get(a.aluno_id) ?? Infinity, Date.parse(a.inicio)));
    const quiz = [...compras.keys()].filter((id) => b.quizzes.some((q) => q.aluno_id === id));
    const treinou = quiz.filter((id) => b.sessoes.some((s) => s.aluno_id === id && Date.parse(s.concluida_em) - (compras.get(id) ?? 0) <= 7 * DIA));
    const assinou = treinou.filter((id) => b.acessos.some((a) => a.aluno_id === id && a.tipo === "assinatura" && a.status !== "reembolsado"));
    return [quiz.length, treinou.length, assinou.length];
  };
  return { "7 DIAS": calc(7), "30 DIAS": calc(30), "90 DIAS": calc(90) };
}

export interface Parado {
  id: string;
  dias: number;
  nome: string;
  produto: string;
  status: string;
  quando: string;
}

/** Quem tem acesso vigente e parou de treinar (ou nunca treinou). Mensagens automáticas ainda não existem. */
export function parados(b: BaseMaster, agora = Date.now()): Parado[] {
  return listaDeAlunos(b, agora)
    .filter((a) => a.estado !== "pausada" && a.dias >= 5)
    .map((a) => ({ id: a.id, dias: a.dias, nome: a.nome, produto: a.produto, status: "SEM ENVIO", quando: a.nunca ? "Nunca treinou" : `Último treino ${a.ultimoTreino}` }));
}
