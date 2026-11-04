// +Q Treino: monta UM treino do protocolo do aluno. Mesmo fluxo da v2 do +Q Pilates
// (lib/ai-treino/v2/gerar.ts), com o perfil do quiz no lugar do protocolo da master:
//   esqueleto (+ tempo do quiz) → candidatos (catálogo do aluno) → prompt → IA → validar →
//   1 nova tentativa com os erros → ordenar → rascunho.
// Não grava nada. `chamarModelo` é injetável: os testes usam um modelo falso.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ajustarAoTempo, catalogoDoAluno, tituloDoTreino, type PerfilAluno } from "./aluno";
import { candidatosPorBloco, type Historico as HistoricoMotor, type ResultadoCandidatos } from "./v2/candidatos";

/** Histórico do motor + a lista de treinos anteriores (permite encurtar a janela de repetição). */
export type Historico = HistoricoMotor & { treinosAnteriores?: readonly (readonly string[])[] };
import { montarEsqueleto, type Esqueleto } from "./v2/esqueleto";
import type { ItemCatalogo } from "./v2/pastas";
import { montarPromptV2 } from "./v2/prompt";
import { avisosUnilateralNaoMarcado, paraRascunhoV2, type RascunhoV2 } from "./v2/rascunho";
import { montarSchemaV2, normalizarResposta, type BlocoResposta, type RespostaV2 } from "./v2/schema";
import { ordenarRespostaV2 } from "./v2/sequencia";
import { avisoAparelhoCardioV2, avisosMaquinaV2, montarMensagemCorrecao, validarRespostaV2 } from "./v2/validar";

export const MAX_TOKENS = 8192;
export const TIMEOUT_MS = 120_000;

export interface ChamadaModelo {
  sistema: string;
  messages: Anthropic.MessageParam[];
  jsonSchema: Record<string, unknown>;
}
export interface RespostaModelo {
  texto: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
}
/** O 2º argumento só serve aos testes (modelo falso que responde a partir dos candidatos). */
export type ChamarModelo = (c: ChamadaModelo, contexto: { esqueleto: Esqueleto; candidatos: ResultadoCandidatos; historico: Historico }) => Promise<RespostaModelo>;

export type ItemCatalogoAluno = ItemCatalogo & { equipamentos: string[] | null };

export interface Diagnostico {
  familia: string;
  nivel: string | null;
  posicao: number;
  totalTreinos: number | null;
  /** Treino com preparação do nível seguinte (19 a 24). */
  preparacao?: boolean;
  avisos: string[];
  tentativas: { erros: string[]; inputTokens: number; outputTokens: number; ms: number }[];
  inputTokens: number;
  outputTokens: number;
  ms: number;
}

export interface TreinoGerado {
  titulo: string;
  tipo: "A" | "B" | "C" | "D";
  duracaoMin: number;
  rascunho: RascunhoV2;
  totalTreinos: number;
}

export type Resultado = { ok: true; treino: TreinoGerado; diagnostico: Diagnostico } | { ok: false; error: string; diagnostico: Diagnostico };

/** O sistema do prompt original fala de "estúdios"; aqui o aluno treina sozinho pelo app. */
const ABERTURA_ORIGINAL = "Você monta UM treino de um protocolo de uma rede de estúdios de Pilates e treinamento funcional.";
const ABERTURA_ALUNO =
  "Você monta UM treino do protocolo de um aluno do +Q Treino, app em que a pessoa treina sozinha (em casa, no condomínio ou na academia), guiada por vídeo. Os treinos são do Richard Vieira, profissional de educação física. Seja claro e seguro: o aluno não tem professor ao lado.";

export function esqueletoDoAluno(p: PerfilAluno, posicao: number, semPreparacao = false): { ok: true; esqueleto: Esqueleto } | { ok: false; motivo: string } {
  const r = montarEsqueleto({ familia: p.familia, nivel: p.nivel, fase: p.fase, condicoes: p.condicoes, posicao });
  if (!r.ok) return r;
  const e = ajustarAoTempo(r.esqueleto, p.minutos);
  if (!semPreparacao || !e.preparacaoNivelSeguinte) return { ok: true, esqueleto: e };
  // Saída de segurança: estoque pequeno demais para a preparação do nível seguinte.
  return {
    ok: true,
    esqueleto: { ...e, preparacaoNivelSeguinte: false, cotaNivelSeguinte: 0, regrasParaPrompt: e.regrasParaPrompt.filter((x) => !/preparação para o N/.test(x)) },
  };
}

/** Tipo A/B/C/D pela posição (rodízio de 4). */
export const tipoDaPosicao = (posicao: number) => (["A", "B", "C", "D"] as const)[(posicao - 1) % 4];

function avaliar(texto: string, stopReason: string | null, e: Esqueleto, c: ResultadoCandidatos, hist: Historico, schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } } }) {
  if (stopReason === "max_tokens") return { resposta: null as RespostaV2 | null, erros: ["a resposta foi cortada (limite de tamanho); responda de forma mais enxuta"] };
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { resposta: null, erros: ["a resposta não é um JSON válido no formato pedido"] };
  }
  const p = schema.safeParse(bruto);
  if (!p.success) {
    const erros = (p.error?.issues ?? []).slice(0, 8).map((i) => `${i.path.map(String).join(".") || "resposta"}: ${i.message}`);
    return { resposta: null, erros: erros.length ? erros : ["a resposta não segue o formato pedido"] };
  }
  const resposta = normalizarResposta(p.data as { justificativa: string; blocos: Record<string, BlocoResposta> }, e.blocos.length);
  return { resposta, erros: validarRespostaV2(resposta, e, c, hist, { contagemReformer: false }) };
}

/** Treinos anteriores do protocolo, do mais antigo ao mais recente (ids dos exercícios). */
export function historicoDe(treinosAnteriores: readonly (readonly string[])[], janela = 6): Historico {
  const ult = treinosAnteriores.slice(-janela);
  return {
    recentes: new Set(ult.flat()),
    anterior: [...(treinosAnteriores[treinosAnteriores.length - 1] ?? [])],
    totalAnteriores: treinosAnteriores.length,
    usoUltimos12: treinosAnteriores.slice(-12).flat(),
  };
}

/**
 * Cada grupo de blocos (blocos com a mesma lista) tem candidatos UTILIZÁVEIS para todos os seus
 * exercícios? Nível seguinte só conta até a cota do treino; nível abaixo de aquecimento só nos
 * primeiros exercícios de cada bloco. Sem isso a IA fica sem como fechar o bloco (fase de
 * preparação, treinos 19 a 24, com estoque pequeno).
 */
export function faltaUtilizavel(e: Esqueleto, c: ResultadoCandidatos): boolean {
  const grupos = new Map<string, { precisa: number; aquecimento: number; lista: ResultadoCandidatos["blocos"][number]["candidatos"] }>();
  e.blocos.forEach((b, i) => {
    const cb = c.blocos[i];
    const g = grupos.get(cb.grupo) ?? { precisa: 0, aquecimento: 0, lista: cb.candidatos };
    g.precisa += b.exercicios;
    g.aquecimento += b.aquecimentoPermiteNivelAbaixo;
    grupos.set(cb.grupo, g);
  });
  // Por grupo e no treino inteiro: o mesmo exercício pode estar na lista de dois grupos
  // (ativação e principal se sobrepõem), mas só entra uma vez.
  const total = e.blocos.reduce((t, b) => t + b.exercicios, 0);
  const idsBase = new Set<string>(), idsAquec = new Set<string>(), idsSeg = new Set<string>();
  let aquecimentoTotal = 0;
  for (const g of grupos.values()) {
    const base = g.lista.filter((k) => !k.nivelSeguinte && !k.soAquecimento);
    const aquec = Math.min(g.aquecimento, g.lista.filter((k) => k.soAquecimento).length);
    const seg = Math.min(e.cotaNivelSeguinte, g.lista.filter((k) => k.nivelSeguinte).length);
    if (base.length + aquec + seg < g.precisa) return true;
    base.forEach((k) => idsBase.add(k.exerciseId));
    g.lista.filter((k) => k.soAquecimento).forEach((k) => idsAquec.add(k.exerciseId));
    g.lista.filter((k) => k.nivelSeguinte).forEach((k) => idsSeg.add(k.exerciseId));
    aquecimentoTotal += g.aquecimento;
  }
  const distintos = idsBase.size + Math.min(aquecimentoTotal, idsAquec.size) + Math.min(e.cotaNivelSeguinte, idsSeg.size);
  return distintos < total;
}

/** Janelas de "recentes" tentadas quando o estoque do aluno é pequeno (6 é a regra do motor). */
export const JANELAS = [6, 4, 3, 2, 1, 0];
/** Candidatos por bloco: 40 é o padrão do motor; 80 só quando o estoque útil não fecha o treino. */
export const LIMITES = [40, 80];

/**
 * Regra dos 2/3 com estoque pequeno (aluno em casa, só peso do corpo, N0): com 6 treinos de
 * janela, os inéditos acabam e o bloco fica sem candidatos. Encurta a janela até todo bloco ter
 * candidatos e nenhum aviso de estoque insuficiente. Sem custo de IA (é antes da chamada).
 */
export function candidatosCabiveis(e: Esqueleto, catalogo: readonly ItemCatalogo[], h: Historico, seed: number) {
  const anteriores = h.treinosAnteriores;
  let ultimo: { historico: Historico; candidatos: ResultadoCandidatos; janela: number } | null = null;
  for (const janela of anteriores ? JANELAS : [JANELAS[0]]) {
    const historico = anteriores ? { ...historicoDe(anteriores, janela), treinosAnteriores: anteriores } : h;
    for (const limite of LIMITES) {
      const candidatos = candidatosPorBloco(e, catalogo, historico, { seed, limite });
      ultimo = { historico, candidatos, janela };
      const vazio = candidatos.blocos.some((b) => !b.candidatos.length);
      const curto = candidatos.avisos.some((a) => a.includes("estoque insuficiente"));
      if (!vazio && !curto && !faltaUtilizavel(e, candidatos)) return ultimo;
    }
  }
  return ultimo!;
}

type Entrada = { perfil: PerfilAluno; posicao: number; catalogo: readonly ItemCatalogoAluno[]; historico: Historico; protocoloId: string };
type Opcoes = { chamarModelo: ChamarModelo; seed?: number; agora?: () => number };

/**
 * Monta o treino. Na fase de preparação (treinos 19 a 24), se o estoque do aluno não fecha o
 * treino com exercícios do nível seguinte, monta de novo sem a preparação (anotado no diagnóstico).
 */
export async function gerarTreinoDoAluno(entrada: Entrada, opcoes: Opcoes): Promise<Resultado> {
  const r = await gerarUmaVez(entrada, opcoes, false);
  if (r.ok || !r.diagnostico.preparacao) return r;
  const r2 = await gerarUmaVez(entrada, opcoes, true);
  r2.diagnostico.avisos.unshift(`sem preparação do nível seguinte (estoque pequeno); 1ª tentativa: ${r.error}`);
  r2.diagnostico.tentativas.unshift(...r.diagnostico.tentativas);
  r2.diagnostico.inputTokens += r.diagnostico.inputTokens;
  r2.diagnostico.outputTokens += r.diagnostico.outputTokens;
  return r2;
}

async function gerarUmaVez(entrada: Entrada, opcoes: Opcoes, semPreparacao: boolean): Promise<Resultado> {
  const agora = opcoes.agora ?? Date.now;
  const t0 = agora();
  const { perfil: p, posicao } = entrada;
  const diag: Diagnostico = { familia: p.familia, nivel: p.nivel, posicao, totalTreinos: null, avisos: [...p.motivos], tentativas: [], inputTokens: 0, outputTokens: 0, ms: 0 };
  const falha = (error: string): Resultado => {
    diag.ms = agora() - t0;
    return { ok: false, error, diagnostico: diag };
  };

  const re = esqueletoDoAluno(p, posicao, semPreparacao);
  if (!re.ok) return falha(`estrutura: ${re.motivo}`);
  const e = re.esqueleto;
  diag.totalTreinos = e.totalTreinos;
  diag.preparacao = e.preparacaoNivelSeguinte;

  const catalogo = catalogoDoAluno(entrada.catalogo, p);
  const seed = opcoes.seed ?? Math.floor(Math.random() * 1e9);
  const { historico, candidatos: c, janela } = candidatosCabiveis(e, catalogo, entrada.historico, seed);
  if (janela < JANELAS[0]) diag.avisos.push(`estoque pequeno: inéditos contados nos últimos ${janela} treino(s), não 6`);
  if (e.preparacaoNivelSeguinte && faltaUtilizavel(e, c)) return falha("estoque pequeno para a preparação do nível seguinte");
  diag.avisos.push(...e.avisos, ...c.avisos);
  const sch = montarSchemaV2(e, c);
  if (!sch.ok) return falha(`sem exercícios para montar o treino (${sch.motivo})`);

  const titulo = tituloDoTreino(p, posicao, e.ladoHipertrofia);
  const prompt = montarPromptV2({
    protocolo: { nome: `${titulo} · +Q Treino`, familia: p.familia, nivel: p.nivel, fase: p.fase, condicoes: p.condicoes, descricao: null },
    esqueleto: e,
    candidatos: c,
    foco: p.foco,
  });
  const sistema = prompt.sistema.replace(ABERTURA_ORIGINAL, ABERTURA_ALUNO);
  const jsonSchema = zodOutputFormat(sch.schema).schema as Record<string, unknown>;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt.usuario }];
  let final: RespostaV2 | null = null;
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const ti = agora();
    let resp: RespostaModelo;
    try {
      resp = await opcoes.chamarModelo({ sistema, messages, jsonSchema }, { esqueleto: e, candidatos: c, historico });
    } catch (err) {
      diag.tentativas.push({ erros: [err instanceof Error ? err.name : "erro"], inputTokens: 0, outputTokens: 0, ms: agora() - ti });
      return falha(err instanceof Anthropic.APIError ? `a IA retornou um erro (HTTP ${err.status ?? "?"})` : "falha ao chamar a IA");
    }
    const { resposta, erros } = avaliar(resp.texto, resp.stopReason, e, c, historico, sch.schema);
    diag.tentativas.push({ erros, inputTokens: resp.inputTokens, outputTokens: resp.outputTokens, ms: agora() - ti });
    diag.inputTokens += resp.inputTokens;
    diag.outputTokens += resp.outputTokens;
    if (resposta && !erros.length) {
      final = resposta;
      break;
    }
    if (tentativa === 1) messages.push({ role: "assistant", content: resp.texto || "{}" }, { role: "user", content: montarMensagemCorrecao(erros) });
  }
  if (!final) {
    const ult = diag.tentativas[diag.tentativas.length - 1]?.erros ?? [];
    return falha(`a IA não montou um treino válido: ${ult.slice(0, 3).join("; ")}`);
  }

  const ordenada = ordenarRespostaV2(final, e, c);
  diag.avisos.push(...avisosMaquinaV2(ordenada, c), ...avisosUnilateralNaoMarcado(ordenada, c), ...avisoAparelhoCardioV2(ordenada, e, c));
  const rascunho = paraRascunhoV2(ordenada, e, c, { id: entrada.protocoloId, nome: titulo, modalidade: "Funcional" });
  diag.ms = agora() - t0;
  return { ok: true, treino: { titulo, tipo: tipoDaPosicao(posicao), duracaoMin: p.minutos, rascunho, totalTreinos: e.totalTreinos }, diagnostico: diag };
}
