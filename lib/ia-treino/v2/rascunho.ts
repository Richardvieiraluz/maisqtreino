// IA de treino v2 — resposta validada → RASCUNHO do editor (PR V2-3). PURO.
//
// Devolve a estrutura que o editor de treinos abre (mesmos campos do DraftBlock /
// DraftExercise do WorkoutsClient): blocos com método, séries, descansos e
// observação; exercícios com exerciseId, séries {type, target, weight: ""},
// descanso e comentário. Carga SEMPRE em branco (quem preenche é o professor).
// Só converte: a resposta já passou por validarRespostaV2 (e por ordenarRespostaV2).
//
// Unilateral (classificação unilateral = true; Richard, 23/10 — V2-4):
//   - REFORMER: a IA lista UMA vez e aqui vira 2 linhas SEGUIDAS do mesmo exercício
//     (mesmo vídeo e séries): 1ª "lado direito", 2ª "lado esquerdo" (a dupla ocupa 2
//     das posições do bloco). O "dir/esq" do nome é só o lado do vídeo: não há par.
//   - Pilates e as outras famílias: 1 linha só, com a observação dos dois lados pela
//     série calculada ("12 do lado direito e 12 do lado esquerdo" / "30 s do lado
//     direito e 30 s do lado esquerdo"). Observação da IA junta com " · ".

import type { Esqueleto } from "./esqueleto";
import type { ResultadoCandidatos } from "./candidatos";
import type { RespostaV2, SerieResposta } from "./schema";
import { repsDoAlvo, segundosDoAlvo } from "./validar";

export interface ProtocoloRascunho { id: string; nome: string; modalidade: string | null }

/** Aviso "possível unilateral não marcado" (25/10/2026): a IA escreveu "cada lado" /
 *  "lado direito" / "lado esquerdo" na observação de um exercício que a classificação
 *  NÃO marca como unilateral. Só avisa (não recusa, não gasta nova tentativa); o painel
 *  /master/ia lista os mais apontados para a master corrigir na revisão. */
export const PREFIXO_AVISO_UNILATERAL = "possível unilateral não marcado: ";
const CITA_LADO = /cada lado|lado direito|lado esquerdo/i;
export function avisosUnilateralNaoMarcado(r: RespostaV2, c: ResultadoCandidatos): string[] {
  const nomes = new Set<string>();
  r.blocos.forEach((b, i) => {
    if (!b) return;
    for (const x of b.exercicios) {
      const cand = c.blocos[i]?.candidatos.find((k) => k.ref === x.ref);
      if (cand && cand.unilateral !== true && CITA_LADO.test(x.observacao)) nomes.add(cand.nome);
    }
  });
  return [...nomes].map((n) => `${PREFIXO_AVISO_UNILATERAL}${n}`);
}

export interface RascunhoV2 {
  protocolId: string;
  /** Contexto da v2 que o editor usa para "Trocar" e para o painel de regras: a POSIÇÃO
   *  do treino gerado (a estrutura depende dela) e a família. Só informativo no jsonb. */
  posicao: number;
  familia: string;
  name: string;
  level: string;
  goal: string;
  modality: string;
  justificativa: string;
  /** Avisos da sequência (076: "bloco X começa com mola"); a tela mostra junto da justificativa. */
  avisos: string[];
  blocks: Array<{
    method: string;
    numberSeries: number;
    restBetweenSeriesSec: number;
    restAfterBlockSec: number | null;
    comments: string;
    exercises: Array<{
      exerciseId: string;
      exerciseName: string;
      videoUrl: string;
      series: Array<{ type: "repetition" | "time"; target: string; weight: string }>;
      restSec: number;
      comments: string;
    }>;
  }>;
}

export const LADO_DIREITO = "lado direito";
export const LADO_ESQUERDO = "lado esquerdo";
export const SEPARADOR_OBS = " · ";
/** Modalidades do editor de treinos. */
export const MODALIDADES_TREINO = ["Pilates", "Reformer", "Funcional"] as const;

/** Nível do treino (campo do editor) pelo nível base do protocolo. Reabilitação/sem nível: Iniciante. */
export function nivelDoTreino(nivelBase: number | null): string {
  if (nivelBase === null || nivelBase <= 1) return "Iniciante";
  return nivelBase <= 3 ? "Intermediário" : "Avançado";
}

/** Objetivo do treino (campo do editor) pela família. */
export function objetivoDoTreino(familia: string): string {
  if (familia === "hipertrofia") return "Hipertrofia";
  if (familia === "condicionamento" || familia === "extreme" || familia === "cardio_hiit") return "Condicionamento";
  if (familia === "reabilitacao" || familia === "protocolo_dor") return "Recuperação";
  return "Saúde";
}

/** Modalidade do treino: a do protocolo se for uma do editor; senão, pela família
 *  (famílias de aparelho mqpilates → Pilates; reformer → Reformer; o resto Funcional). */
export function modalidadeDoTreino(familia: string, modalidadeProtocolo: string | null): string {
  if (modalidadeProtocolo && (MODALIDADES_TREINO as readonly string[]).includes(modalidadeProtocolo)) return modalidadeProtocolo;
  if (familia === "reformer") return "Reformer";
  if (familia === "pilates" || familia === "protocolo_dor" || familia === "gestante" || familia === "alongamento") return "Pilates";
  return "Funcional";
}

export const juntarObs = (...partes: string[]) => partes.map((p) => p.trim()).filter(Boolean).join(SEPARADOR_OBS);
/** "cada lado" solto vira redundante quando o código escreve os lados. */
const semCadaLado = (s: string) => s.replace(/\(?\s*(de\s+)?cada lado\s*\)?/gi, "").replace(/\s{2,}/g, " ").trim();

/** Quantidade por lado a partir da série: reps → "12" (ou "10 a 12"); tempo → "30 s". */
export function quantidadePorLado(s: SerieResposta): string {
  const nums = s.tipo === "time" ? segundosDoAlvo(s.alvo) : repsDoAlvo(s.alvo);
  if (!nums || !nums.length) return semCadaLado(s.alvo);
  const q = nums.length === 1 || nums[0] === nums[nums.length - 1] ? String(nums[0]) : `${nums[0]} a ${nums[nums.length - 1]}`;
  return s.tipo === "time" ? `${q} s` : q;
}
/** Observação dos dois lados para o unilateral de UMA linha (Pilates e outras famílias). */
export function observacaoDosLados(s: SerieResposta): string {
  const q = quantidadePorLado(s);
  return `${q} do ${LADO_DIREITO} e ${q} do ${LADO_ESQUERDO}`;
}

export const nomeDoTreino = (nomeProtocolo: string, posicao: number) => `${nomeProtocolo} - Treino ${String(posicao).padStart(2, "0")}`;

export function paraRascunhoV2(r: RespostaV2, e: Esqueleto, c: ResultadoCandidatos, protocolo: ProtocoloRascunho): RascunhoV2 {
  return {
    protocolId: protocolo.id,
    posicao: e.posicao,
    familia: e.familia,
    name: nomeDoTreino(protocolo.nome, e.posicao),
    level: nivelDoTreino(e.nivelBase),
    goal: objetivoDoTreino(e.familia),
    modality: modalidadeDoTreino(e.familia, protocolo.modalidade),
    justificativa: r.justificativa.trim(),
    avisos: [],
    blocks: r.blocos.map((b, i) => ({
      method: b.metodo,
      numberSeries: e.blocos[i].series,
      restBetweenSeriesSec: b.descansoEntreSeriesSeg,
      restAfterBlockSec: b.descansoAposBlocoSeg,
      comments: b.observacaoBloco.trim(),
      exercises: b.exercicios.flatMap((x) => {
        const cand = c.blocos[i].candidatos.find((k) => k.ref === x.ref);
        if (!cand) throw new Error(`rascunho: ${x.ref} não é candidato do bloco ${i + 1} (valide antes)`);
        const uni = cand.unilateral === true;
        const linha = (comments: string) => ({
          exerciseId: cand.exerciseId,
          exerciseName: cand.nome,
          videoUrl: cand.videoUrl,
          series: x.series.map((s) => ({ type: s.tipo, target: uni ? semCadaLado(s.alvo) : s.alvo.trim(), weight: "" })),
          restSec: b.descansoEntreExerciciosSeg,
          comments,
        });
        if (!uni) return [linha(x.observacao.trim())];
        const obs = semCadaLado(x.observacao);
        if (e.familia === "reformer") return [linha(juntarObs(LADO_DIREITO, obs)), linha(juntarObs(LADO_ESQUERDO, obs))];
        return [linha(juntarObs(x.series[0] ? observacaoDosLados(x.series[0]) : "", obs))];
      }),
    })),
  };
}
