import "server-only";
import { cache } from "react";
import { calcularEvolucao, medalhas, type Evolucao, type SessaoFeita } from "../evolucao-calculos";
import { createAdminClient } from "../supabase/admin";
import { carregarCatalogoIA, protocoloAtivo } from "./treinos";

export interface EvolucaoReal extends Evolucao {
  medalhas: [string, boolean][];
}

/** Evolução do aluno (sessões concluídas). cache: Início, Evolução e treino usam na mesma requisição. */
export const evolucaoDoAluno = cache(async (alunoId: string): Promise<EvolucaoReal> => {
  const db = createAdminClient();
  const linhas: { concluida_em: string; series: unknown; protocolo_treino_id: string | null }[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db
      .from("sessoes")
      .select("concluida_em, series, protocolo_treino_id")
      .eq("aluno_id", alunoId)
      .not("concluida_em", "is", null)
      .order("concluida_em")
      .range(de, de + 999);
    if (error) throw new Error(`[evolucao] ${error.code}`);
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const [p, catalogo] = await Promise.all([protocoloAtivo(alunoId), linhas.length ? carregarCatalogoIA() : Promise.resolve([])]);
  const musculos = new Map(catalogo.map((x) => [x.id, x.musculos]));
  const sessoes: SessaoFeita[] = linhas.map((l) => ({
    concluidaEm: l.concluida_em,
    series: (Array.isArray(l.series) ? l.series : []).filter((x): x is SessaoFeita["series"][number] => !!x && typeof x === "object" && typeof (x as { exercicioId?: unknown }).exercicioId === "string" && !(x as { dor?: unknown }).dor),
  }));
  const e = calcularEvolucao(sessoes, Date.now(), p?.perfil.diasSemana ?? 3, (id) => musculos.get(id) ?? []);
  const ids = new Set(p?.treinos.map((t) => t.id) ?? []);
  const feitos = new Set(linhas.map((l) => l.protocolo_treino_id).filter((x): x is string => !!x && ids.has(x)));
  return { ...e, medalhas: medalhas(e, !!p && feitos.size >= p.totalTreinos) };
});
