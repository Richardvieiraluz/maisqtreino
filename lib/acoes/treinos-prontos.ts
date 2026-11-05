"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "../auth";
import { carregarCatalogoIA } from "../dados/treinos";
import { lerPronto, listarProntos, perfilDoPronto } from "../dados/treinos-prontos";
import { gerarTreinoDoAluno, historicoDe } from "../ia-treino/gerar-aluno";
import { chamarModeloReal, iaConfigurada } from "../ia-treino/modelo";
import { opcoesDeTroca } from "../ia-treino/trocas-aluno";
import { createAdminClient } from "../supabase/admin";
import { supabaseConfigurado } from "../supabase/env";
import type { OpcaoTroca } from "../tipos";
import { ehIdPronto, limparConteudo, novoIdPronto, REGIOES_LESAO, type BasePronto, type ConteudoPronto, type TreinoPronto } from "../treinos-prontos";

// Master > Treinos prontos. Cada ação confere o papel master de novo.

type Res<T = object> = ({ ok: true; msg?: string } & T) | { ok: false; error: string };

async function exigirMaster(): Promise<string | null> {
  if (!supabaseConfigurado()) return "Disponível quando o banco estiver ligado.";
  const s = await getSessao();
  return s?.papel === "master" ? null : "Só o Master pode fazer isso.";
}

const TIPOS = ["vitrine", "programa", "rapido", "lesao"] as const;
const LOCAIS = ["casa", "condominio", "academia"] as const;
const NIVEIS = ["iniciante", "intermediario", "avancado"] as const;
const um = <T extends string>(v: unknown, lista: readonly T[], padrao: T): T => (lista.includes(v as T) ? (v as T) : padrao);

async function catalogoMapa() {
  const cat = await carregarCatalogoIA();
  return { cat, mapa: new Map(cat.map((x) => [x.id, { nome: x.nome, videoUrl: x.videoUrl }])) };
}

export type DadosPronto = Omit<TreinoPronto, "id" | "publicado" | "atualizadoEm"> & { id?: string };

/** Grava o treino (novo ou existente). Não muda o "publicado". */
export async function salvarProntoAction(d: DadosPronto): Promise<Res<{ id: string; problemas: string[] }>> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const titulo = typeof d.titulo === "string" ? d.titulo.replace(/[–—]/g, "-").trim().slice(0, 80) : "";
  if (!titulo) return { ok: false, error: "Dê um nome ao treino." };
  const tipo = um(d.tipo, TIPOS, "vitrine");
  const produtoId = tipo === "programa" && typeof d.produtoId === "string" ? d.produtoId : null;
  if (tipo === "programa" && !produtoId) return { ok: false, error: "Escolha o programa." };
  const lesaoRegiao = tipo === "lesao" ? um(d.lesaoRegiao ?? "", REGIOES_LESAO, "Lombar") : null;
  const lesaoFase = tipo === "lesao" ? Math.min(4, Math.max(1, Math.round(Number(d.lesaoFase) || 1))) : null;
  const duracao = Math.min(120, Math.max(5, Math.round(Number(d.duracaoMin) || 30)));
  const { mapa } = await catalogoMapa();
  const { conteudo, problemas } = limparConteudo(d.conteudo, mapa);
  const id = d.id && ehIdPronto(d.id) ? d.id : novoIdPronto();
  const { error } = await createAdminClient()
    .from("treinos")
    .upsert({
      id,
      titulo,
      tipo,
      produto_id: produtoId,
      local: um(d.local, LOCAIS, "casa"),
      nivel: um(d.nivel, NIVEIS, "iniciante"),
      duracao_min: duracao,
      regioes: (Array.isArray(d.regioes) ? d.regioes : []).filter((x): x is string => typeof x === "string").slice(0, 10),
      lesao_regiao: lesaoRegiao,
      lesao_fase: lesaoFase,
      ordem: Math.min(999, Math.max(0, Math.round(Number(d.ordem) || 0))),
      conteudo: { ...conteudo, name: titulo },
    });
  if (error) {
    console.error("[prontos] gravação falhou", { code: error.code });
    return { ok: false, error: "Não deu para salvar." };
  }
  // Sem exercício nenhum não pode ficar publicado.
  if (!conteudo.blocks.length) await createAdminClient().from("treinos").update({ publicado: false }).eq("id", id);
  revalidatePath("/master/treinos", "layout");
  revalidatePath("/", "layout");
  return { ok: true, id, problemas, msg: problemas.length ? `Salvo, com ajustes: ${problemas.join("; ")}.` : "Salvo." };
}

export async function publicarProntoAction(id: string, publicar: boolean): Promise<Res> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const t = ehIdPronto(id) ? await lerPronto(id) : null;
  if (!t) return { ok: false, error: "Treino não encontrado." };
  if (publicar && !t.conteudo.blocks.some((b) => b.exercises.length)) return { ok: false, error: "Coloque pelo menos um exercício antes de publicar." };
  const { error } = await createAdminClient().from("treinos").update({ publicado: publicar }).eq("id", id);
  if (error) return { ok: false, error: "Não deu para mudar." };
  revalidatePath("/master/treinos", "layout");
  revalidatePath("/", "layout");
  return { ok: true, msg: publicar ? "Publicado. Já aparece para os alunos." : "Tirado do ar." };
}

export async function excluirProntoAction(id: string): Promise<Res> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  if (!ehIdPronto(id)) return { ok: false, error: "Treino não encontrado." };
  // Treinos já feitos por alunos ficam no histórico deles (sessoes.treino_id vira nulo).
  const { error } = await createAdminClient().from("treinos").delete().eq("id", id);
  if (error) return { ok: false, error: "Não deu para excluir." };
  revalidatePath("/master/treinos", "layout");
  revalidatePath("/", "layout");
  return { ok: true, msg: "Excluído." };
}

/** Rascunho montado pela IA a partir da base (não grava: o editor mostra e você salva). */
export async function gerarRascunhoProntoAction(meta: Pick<TreinoPronto, "tipo" | "local" | "nivel" | "regioes" | "lesaoRegiao" | "ordem" | "produtoId"> & { id?: string; base: BasePronto }): Promise<Res<{ conteudo: ConteudoPronto; titulo: string; duracaoMin: number; avisos: string[] }>> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  if (!iaConfigurada()) return { ok: false, error: "Falta a chave da IA (ANTHROPIC_API_KEY) na Vercel." };
  const tipo = um(meta.tipo, TIPOS, "vitrine");
  const base: BasePronto = {
    objetivo: tipo === "lesao" ? "Aliviar dores" : ["Ganhar massa muscular", "Perder gordura", "Condicionamento", "Aliviar dores"].includes(meta.base?.objetivo) ? meta.base.objetivo : "Condicionamento",
    equipamentos: Array.isArray(meta.base?.equipamentos) ? meta.base.equipamentos.filter((x): x is string => typeof x === "string").slice(0, 20) : [],
    tempo: meta.base?.tempo === "20" || meta.base?.tempo === "60" ? meta.base.tempo : "40",
    regioes: Array.isArray(meta.base?.regioes) ? meta.base.regioes.filter((x): x is string => typeof x === "string").slice(0, 10) : [],
    dor: tipo === "lesao" ? um(meta.lesaoRegiao ?? "", REGIOES_LESAO, "Lombar") : null,
  };
  const fake: TreinoPronto = {
    id: "x", titulo: "", tipo, produtoId: meta.produtoId ?? null, local: um(meta.local, LOCAIS, "casa"), nivel: um(meta.nivel, NIVEIS, "iniciante"),
    duracaoMin: +base.tempo, regioes: base.regioes, lesaoRegiao: base.dor, lesaoFase: null, ordem: meta.ordem || 1, publicado: false,
    conteudo: { protocolId: "pronto", posicao: 1, familia: "", name: "", level: "", goal: "", modality: "", justificativa: "", avisos: [], blocks: [], base },
  };
  const perfil = perfilDoPronto(fake);
  // Programa: o treino N segue a progressão do motor e evita repetir os anteriores do programa.
  const posicao = tipo === "programa" ? Math.min(24, Math.max(1, meta.ordem || 1)) : 1;
  let anteriores: string[][] = [];
  if (tipo === "programa" && meta.produtoId) {
    const doProg = (await listarProntos()).filter((t) => t.produtoId === meta.produtoId && t.id !== meta.id && t.ordem < posicao).sort((a, b) => a.ordem - b.ordem);
    anteriores = doProg.map((t) => t.conteudo.blocks.flatMap((b) => b.exercises.map((x) => x.exerciseId)));
  }
  const r = await gerarTreinoDoAluno(
    { perfil, posicao, catalogo: await carregarCatalogoIA(), historico: { ...historicoDe(anteriores), treinosAnteriores: anteriores }, protocoloId: "pronto" },
    { chamarModelo: chamarModeloReal },
  );
  if (!r.ok) return { ok: false, error: `A IA não conseguiu montar: ${r.error}.` };
  return { ok: true, conteudo: { ...r.treino.rascunho, base }, titulo: r.treino.titulo, duracaoMin: r.treino.duracaoMin, avisos: r.diagnostico.avisos.slice(0, 6) };
}

export interface ExercicioBusca {
  id: string;
  nome: string;
  videoUrl: string;
  detalhe: string;
}

/** Busca no catálogo para incluir exercício no treino (nome, músculo, equipamento ou modalidade). */
export async function buscarExerciciosAction(q: string): Promise<Res<{ itens: ExercicioBusca[] }>> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const termos = norm(String(q ?? "").slice(0, 60)).split(/\s+/).filter(Boolean);
  if (!termos.length) return { ok: true, itens: [] };
  const { cat } = await catalogoMapa();
  const itens = cat
    .filter((x) => {
      const texto = norm([x.nome, x.modality, x.muscularGroup, ...(x.musculos ?? []), ...(x.equipamentos ?? [])].join(" "));
      return termos.every((t) => texto.includes(t));
    })
    .sort((a, b) => Number(!norm(a.nome).includes(termos[0])) - Number(!norm(b.nome).includes(termos[0])) || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 25)
    .map((x) => ({ id: x.id, nome: x.nome, videoUrl: x.videoUrl, detalhe: [x.modality, (x.equipamentos ?? []).join(", ") || "peso do corpo", (x.musculos ?? []).slice(0, 3).join(", ")].filter(Boolean).join(" · ") }));
  return { ok: true, itens };
}

/** Substitutos de um exercício do treino em edição. */
export async function substitutosProntoAction(t: Pick<TreinoPronto, "tipo" | "local" | "nivel" | "regioes" | "lesaoRegiao" | "conteudo">, bloco: number, exerciseId: string): Promise<Res<{ opcoes: OpcaoTroca[] }>> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const { cat, mapa } = await catalogoMapa();
  const { conteudo } = limparConteudo(t.conteudo, mapa);
  const fake = { ...t, id: "x", titulo: "", produtoId: null, duracaoMin: 40, lesaoFase: null, ordem: 1, publicado: false, conteudo } as TreinoPronto;
  const ops = opcoesDeTroca(conteudo, perfilDoPronto(fake), conteudo.posicao || 1, cat);
  return { ok: true, opcoes: ops.get(`${bloco}-${exerciseId}`) ?? [] };
}
