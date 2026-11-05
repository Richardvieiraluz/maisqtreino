// Treinos prontos da vitrine (tabela `treinos`): montados pelo Richard no Master, iguais para todos.
// Módulo comum (servidor e navegador), sem banco. O conteúdo usa o mesmo formato do treino gerado
// (RascunhoV2: blocos e exercícios), então a execução, a troca e a carga funcionam igual.

import type { RespostasQuiz } from "./quiz";
import type { RascunhoV2 } from "./ia-treino/v2/rascunho";

export type TipoPronto = "vitrine" | "programa" | "rapido" | "lesao";
export type LocalPronto = "casa" | "condominio" | "academia";
export type NivelPronto = "iniciante" | "intermediario" | "avancado";

export const TIPO_ROTULO: Record<TipoPronto, string> = { vitrine: "Treino avulso", programa: "Programa", rapido: "Rápido", lesao: "Lesão" };
export const LOCAL_ROTULO: Record<LocalPronto, string> = { casa: "Em casa", condominio: "Condomínio", academia: "Academia" };
export const NIVEL_ROTULO: Record<NivelPronto, "Iniciante" | "Intermediário" | "Avançado"> = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
export const REGIOES_LESAO = ["Lombar", "Joelho", "Ombro", "Quadril", "Cervical", "Punho"] as const;
export const METODOS = ["Convencional", "Circuito", "Bi-Set", "Pirâmide crescente", "Pirâmide decrescente", "Drop-set"] as const;

/** Como o treino foi pensado (para a IA montar o rascunho e para os substitutos na troca). */
export interface BasePronto {
  objetivo: string;
  equipamentos: string[];
  tempo: "20" | "40" | "60";
  regioes: string[];
  dor: string | null;
}

/** Conteúdo gravado em treinos.conteudo: o treino + a base usada para montá-lo. */
export type ConteudoPronto = RascunhoV2 & { base?: BasePronto };

export interface TreinoPronto {
  id: string;
  titulo: string;
  tipo: TipoPronto;
  produtoId: string | null;
  local: LocalPronto;
  nivel: NivelPronto;
  duracaoMin: number;
  regioes: string[];
  lesaoRegiao: string | null;
  lesaoFase: number | null;
  ordem: number;
  publicado: boolean;
  conteudo: ConteudoPronto;
  atualizadoEm?: string;
}

/** Id novo: prefixo "tp-" (não colide com protocolo-NN nem com os exemplos). */
export const novoIdPronto = () => `tp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const ehIdPronto = (id: string) => /^tp-[a-z0-9]{4,24}$/.test(id);

/** Respostas de quiz equivalentes à base (o motor de montagem fala a língua do quiz). */
export function quizDaBase(t: Pick<TreinoPronto, "local" | "nivel">, b: BasePronto): RespostasQuiz {
  return {
    objetivo: b.objetivo,
    nivel: NIVEL_ROTULO[t.nivel],
    local: LOCAL_ROTULO[t.local],
    equip: t.local === "academia" ? "Academia completa" : "Lista",
    equipamentos: t.local === "academia" ? [] : b.equipamentos,
    dias: "3",
    tempo: b.tempo,
    regioes: b.regioes,
    dores: b.dor ? [b.dor] : ["Nenhuma"],
  };
}

export const conteudoVazio = (titulo: string): ConteudoPronto => ({
  protocolId: "pronto",
  posicao: 1,
  familia: "condicionamento",
  name: titulo,
  level: "Iniciante",
  goal: "",
  modality: "Funcional",
  justificativa: "",
  avisos: [],
  blocks: [{ method: "Convencional", numberSeries: 3, restBetweenSeriesSec: 60, restAfterBlockSec: 60, comments: "", exercises: [] }],
});

// ── limpeza do que vem do navegador ─────────────────────────────────────────

const txt = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[–—]/g, "-").trim().slice(0, max) : "");
const int = (v: unknown, min: number, max: number, padrao: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Alvo da série: repetições ("12", "10-12") ou tempo ("40s"). */
export function alvoValido(tipo: "repetition" | "time", alvo: string): string | null {
  const a = alvo.replace(/\s+/g, "").toLowerCase();
  if (tipo === "time") {
    const m = /^(\d{1,4})(s|seg)?$/.exec(a);
    return m && +m[1] > 0 ? `${+m[1]}s` : null;
  }
  const m = /^(\d{1,3})(-(\d{1,3}))?$/.exec(a);
  if (!m || +m[1] <= 0) return null;
  return m[3] ? `${+m[1]}-${+m[3]}` : String(+m[1]);
}

/**
 * Conteúdo vindo do editor: só campos conhecidos, com limites. Exercício sem id do catálogo
 * (existe em `catalogo`) ou sem série válida sai. Devolve também os problemas encontrados.
 */
export function limparConteudo(bruto: unknown, catalogo: ReadonlyMap<string, { nome: string; videoUrl: string }>): { conteudo: ConteudoPronto; problemas: string[] } {
  const b = (bruto ?? {}) as Record<string, unknown>;
  const problemas: string[] = [];
  const blocos = Array.isArray(b.blocks) ? b.blocks.slice(0, 12) : [];
  const blocks = blocos.map((bl, bi) => {
    const x = (bl ?? {}) as Record<string, unknown>;
    const metodo = METODOS.includes(x.method as (typeof METODOS)[number]) ? (x.method as string) : "Convencional";
    const exs = (Array.isArray(x.exercises) ? x.exercises.slice(0, 15) : []).flatMap((e) => {
      const y = (e ?? {}) as Record<string, unknown>;
      const id = typeof y.exerciseId === "string" && UUID.test(y.exerciseId) ? y.exerciseId : "";
      const item = catalogo.get(id);
      if (!item) {
        problemas.push(`bloco ${bi + 1}: exercício fora do catálogo removido`);
        return [];
      }
      const series = (Array.isArray(y.series) ? y.series.slice(0, 10) : []).flatMap((s) => {
        const z = (s ?? {}) as Record<string, unknown>;
        const tipo = z.type === "time" ? "time" : "repetition";
        const alvo = alvoValido(tipo, txt(z.target, 12));
        return alvo ? [{ type: tipo as "time" | "repetition", target: alvo, weight: "" }] : [];
      });
      if (!series.length) {
        problemas.push(`${item.nome}: sem série válida, removido`);
        return [];
      }
      return [{ exerciseId: id, exerciseName: item.nome, videoUrl: item.videoUrl, series, restSec: int(y.restSec, 0, 600, 30), comments: txt(y.comments, 300) }];
    });
    return {
      method: metodo,
      numberSeries: Math.max(1, ...exs.map((e) => e.series.length)),
      restBetweenSeriesSec: int(x.restBetweenSeriesSec, 0, 600, 60),
      restAfterBlockSec: x.restAfterBlockSec == null ? null : int(x.restAfterBlockSec, 0, 600, 60),
      comments: txt(x.comments, 300),
      exercises: exs,
    };
  });
  // Circuito e Bi-Set alternam por rodada: todos os exercícios com o mesmo número de séries.
  for (const bl of blocks)
    if ((bl.method === "Circuito" || bl.method === "Bi-Set") && bl.exercises.length > 1) {
      const n = bl.numberSeries;
      for (const e of bl.exercises) while (e.series.length < n) e.series.push({ ...e.series[e.series.length - 1] });
    }
  const base = (b.base ?? null) as Record<string, unknown> | null;
  return {
    problemas,
    conteudo: {
      protocolId: "pronto",
      posicao: int(b.posicao, 1, 24, 1),
      familia: txt(b.familia, 30) || "condicionamento",
      name: txt(b.name, 80),
      level: txt(b.level, 30),
      goal: txt(b.goal, 120),
      modality: txt(b.modality, 30) || "Funcional",
      justificativa: txt(b.justificativa, 1500),
      avisos: [],
      blocks: blocks.filter((bl) => bl.exercises.length),
      ...(base && {
        base: {
          objetivo: txt(base.objetivo, 40) || "Condicionamento",
          equipamentos: Array.isArray(base.equipamentos) ? base.equipamentos.filter((v): v is string => typeof v === "string").slice(0, 20).map((v) => v.slice(0, 40)) : [],
          tempo: base.tempo === "20" || base.tempo === "60" ? base.tempo : "40",
          regioes: Array.isArray(base.regioes) ? base.regioes.filter((v): v is string => typeof v === "string").slice(0, 10).map((v) => v.slice(0, 40)) : [],
          dor: typeof base.dor === "string" ? base.dor.slice(0, 30) : null,
        },
      }),
    },
  };
}

// ── vitrine do aluno ────────────────────────────────────────────────────────

/** Fileira da Início onde o treino aparece. */
export function fileiraDo(t: Pick<TreinoPronto, "tipo" | "local">): "Treino em casa" | "Treino na academia" | "Programas" | "Rápidos" | "Lesões" {
  if (t.tipo === "programa") return "Programas";
  if (t.tipo === "rapido") return "Rápidos";
  if (t.tipo === "lesao") return "Lesões";
  return t.local === "academia" ? "Treino na academia" : "Treino em casa";
}

/** Cadeado: pausada trava tudo; assinante abre tudo; quem só tem programa abre os treinos dele. */
export function prontoBloqueado(t: Pick<TreinoPronto, "tipo" | "produtoId">, estado: string, programas: readonly string[]): boolean {
  if (estado === "pausada" || estado === "sem_acesso") return true;
  if (estado === "assinante") return false;
  return !(t.tipo === "programa" && t.produtoId !== null && programas.includes(t.produtoId));
}
