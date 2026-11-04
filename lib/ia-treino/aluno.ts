// +Q Treino: tradução do quiz para o motor de montagem (lib/ia-treino/v2, igual ao do +Q Pilates).
// PURO. O motor foi feito para o estúdio (todo mundo com todos os aparelhos e aula de 60 min);
// aqui entram as diferenças do aluno que treina sozinho:
//   - família e nível pelo objetivo, nível e idade do quiz;
//   - EQUIPAMENTO: só entram exercícios cujo equipamento o aluno tem;
//   - DORES: o que força a região marcada sai do catálogo dele;
//   - TEMPO (20, 40 ou 60 min): corta blocos principais na proporção;
//   - REGIÕES de foco: viram a orientação do treino no prompt.
// As regras de dor e de família/nível são decisões a confirmar com o Richard (docs/ia-treino.md).

import type { Esqueleto } from "./v2/esqueleto";
import type { ItemCatalogo } from "./v2/pastas";
import type { RespostasQuiz } from "../quiz";

export type FamiliaAluno = "hipertrofia" | "condicionamento" | "cardio_hiit" | "reabilitacao";

export interface PerfilAluno {
  familia: FamiliaAluno;
  /** "N0".."N3" (null em reabilitação). */
  nivel: string | null;
  /** Reabilitação: fase do protocolo. */
  fase: "cronico" | null;
  /** Condições (vocabulário de indicações do motor) vindas das dores. */
  condicoes: string[];
  /** Dores como o quiz guarda ("Lombar", "Punho"...), para o filtro. */
  dores: string[];
  /** null = academia completa (tudo). */
  equipamentos: string[] | null;
  minutos: 20 | 40 | 60;
  foco: string;
  /** Explicação curta de cada escolha (vai para o diagnóstico e o Master). */
  motivos: string[];
}

// ── equipamentos ────────────────────────────────────────────────────────────

/** Item do quiz → vocabulário de equipamentos da classificação. */
export const EQUIPAMENTO_DO_QUIZ: Readonly<Record<string, readonly string[]>> = {
  Halter: ["halter"],
  Kettlebell: ["kettlebell"],
  "Barra e anilhas": ["barra", "anilha"],
  Banco: ["banco"],
  "Elástico": ["elástico", "elástico extensor"],
  "Mini band": ["mini band"],
  TRX: ["trx"],
  "Bola suíça": ["bola suíça"],
  Colchonete: [],
  Caneleira: ["tornozeleira"],
  Step: ["step"],
  "Barra fixa": ["barra fixa/paralelas"],
};
/** Sempre disponíveis, em qualquer lugar. */
export const SEMPRE_DISPONIVEL = ["peso do corpo", "cadeira"];

export function equipamentosDoQuiz(r: RespostasQuiz): string[] | null {
  if (r.equip === "Academia completa") return null;
  const itens = (r.equipamentos ?? []).flatMap((i) => EQUIPAMENTO_DO_QUIZ[i] ?? []);
  return [...new Set([...SEMPRE_DISPONIVEL, ...itens])];
}

export function temEquipamento(x: Pick<ItemCatalogo, "material"> & { equipamentos?: readonly string[] | null }, disponiveis: readonly string[] | null): boolean {
  if (disponiveis === null) return true;
  const precisa = x.equipamentos?.length ? x.equipamentos : [];
  return precisa.every((e) => disponiveis.includes(e));
}

// ── dores ───────────────────────────────────────────────────────────────────

/** Dor do quiz → indicação (condição) do motor. Punho não tem indicação: só filtra. */
export const CONDICAO_DA_DOR: Readonly<Record<string, string>> = { Lombar: "lombar", Joelho: "joelho", Ombro: "ombro", Quadril: "quadril", Cervical: "cervical" };

const algum = (a: readonly string[], b: readonly string[]) => a.some((x) => b.includes(x));
const livre = (x: Pick<ItemCatalogo, "categorias">) => x.categorias.length > 0 && x.categorias.every((c) => c === "alongamento" || c === "mobilidade");

/**
 * O que "força a região" (regra inicial, a confirmar com o Richard). Alongamento e mobilidade
 * puros sempre passam. Qualquer dor tira impacto alto.
 */
export function forcaRegiao(x: Pick<ItemCatalogo, "categorias" | "padroes" | "musculos" | "impacto" | "posicao">, dor: string): boolean {
  if (livre(x)) return false;
  if (x.impacto === "alto") return true;
  switch (dor) {
    case "Lombar":
      return algum(x.padroes, ["extensão de tronco"]) || algum(x.categorias, ["potência", "arranque", "salto/pliometria"]);
    case "Joelho":
      return algum(x.categorias, ["salto/pliometria", "deslocamento", "arranque"]) || x.impacto === "baixo";
    case "Ombro":
      return algum(x.padroes, ["empurrar vertical", "puxar vertical"]);
    case "Quadril":
      return algum(x.categorias, ["salto/pliometria", "arranque"]);
    case "Cervical":
      return algum(x.musculos, ["cervical/pescoço"]) || algum(x.padroes, ["empurrar vertical"]);
    case "Punho":
      return x.posicao === "quatro apoios" || algum(x.musculos, ["antebraço/punho"]);
    default:
      return false;
  }
}

// ── família, nível e tempo ──────────────────────────────────────────────────

const NIVEL_DO_QUIZ: Readonly<Record<string, string>> = { Iniciante: "N0", "Intermediário": "N1", "Avançado": "N2" };

/** Hipertrofia precisa de carga: sem halter, barra, kettlebell nem academia, vira condicionamento. */
const CARGA = ["halter", "barra", "kettlebell"];

export function perfilDoQuiz(r: RespostasQuiz): PerfilAluno {
  const motivos: string[] = [];
  const dores = (r.dores ?? []).filter((d) => d !== "Nenhuma");
  const condicoes = [...new Set(dores.map((d) => CONDICAO_DA_DOR[d]).filter((c): c is string => !!c))];
  const equipamentos = equipamentosDoQuiz(r);
  const minutos = r.tempo === "20" ? 20 : r.tempo === "40" ? 40 : 60;
  let nivel = NIVEL_DO_QUIZ[r.nivel ?? ""] ?? "N0";
  let familia: FamiliaAluno;

  switch (r.objetivo) {
    case "Ganhar massa muscular":
      familia = "hipertrofia";
      break;
    case "Perder gordura":
      familia = nivel === "N0" ? "condicionamento" : "cardio_hiit";
      if (familia === "condicionamento") motivos.push("perder gordura no nível iniciante: condicionamento antes do HIIT");
      break;
    case "Aliviar dores":
      familia = condicoes.length ? "reabilitacao" : "condicionamento";
      if (familia === "condicionamento") motivos.push("aliviar dores sem região marcada: condicionamento");
      break;
    default:
      familia = "condicionamento";
  }
  if (familia === "hipertrofia" && equipamentos !== null && !algum(equipamentos, CARGA)) {
    familia = "condicionamento";
    motivos.push("massa muscular sem halter, barra ou kettlebell: condicionamento");
  }
  if (r.idade === "60 ou mais") {
    // Nenhum exercício está marcado como "idoso" ainda: condicionamento N0 até a marcação existir.
    if (familia !== "reabilitacao") familia = "condicionamento";
    nivel = "N0";
    motivos.push("60 ou mais: condicionamento N0 (exercícios de idoso ainda sem marcação)");
  }
  if (familia === "reabilitacao") motivos.push(`aliviar dores (${dores.join(", ")}): reabilitação, fase crônica`);

  const regioes = (r.regioes ?? []).filter(Boolean);
  const foco = regioes.length ? `O aluno quer dar mais atenção a: ${regioes.join(", ")}. Quando houver candidatos equivalentes, prefira os que trabalham essas regiões.` : "";

  return {
    familia,
    nivel: familia === "reabilitacao" ? null : nivel,
    fase: familia === "reabilitacao" ? "cronico" : null,
    condicoes,
    dores,
    equipamentos,
    minutos,
    foco,
    motivos,
  };
}

/** Materiais da pasta funcional que viram "carga" na hipertrofia fora da academia. */
export const FUNCIONAL_COMO_CARGA = ["kettlebell", "elástico extensor", "mini band", "trx", "bag", "wall ball", "calistenia", "peso do corpo"];

/**
 * Hipertrofia fora da academia: a pasta musculação com halter em casa tem poucos exercícios de
 * inferiores (22, só 8 no N1). Os exercícios de FORÇA da pasta funcional com material de carga
 * entram como principais: o motor só aceita musculação com barra/halter/máquina/tornozeleira no
 * bloco principal, então eles são apresentados a ele como musculação com halter. Só muda a
 * pasta para o motor; nome, vídeo e equipamento continuam os do exercício.
 */
function comoHipertrofiaEmCasa<T extends ItemCatalogo>(x: T): T {
  if (x.modality === "funcional" && x.categorias.includes("força") && FUNCIONAL_COMO_CARGA.includes(x.material)) return { ...x, modality: "musculação", material: "halter" };
  return x;
}

/** Catálogo que este aluno pode usar: equipamento que ele tem e nada que force a região dolorida. */
export function catalogoDoAluno<T extends ItemCatalogo & { equipamentos?: readonly string[] | null }>(catalogo: readonly T[], p: PerfilAluno): T[] {
  const lista = catalogo.filter((x) => temEquipamento(x, p.equipamentos) && !p.dores.some((d) => forcaRegiao(x, d)));
  return p.familia === "hipertrofia" && p.equipamentos !== null ? lista.map(comoHipertrofiaEmCasa) : lista;
}

/**
 * Tempo do quiz: a tabela de prescrição é de aula de 60 min. Em 40 e 20 min, os blocos principais
 * caem na proporção (a ativação fica). Mínimo de 1 bloco principal.
 */
export function ajustarAoTempo(e: Esqueleto, minutos: number): Esqueleto {
  if (minutos >= 60) return e;
  const fixos = e.blocos.filter((b) => b.tipo === "ativacao");
  const variaveis = e.blocos.filter((b) => b.tipo !== "ativacao");
  const manter = Math.max(1, Math.round(variaveis.length * (minutos / 60)));
  const blocos = [...fixos, ...variaveis.slice(0, manter)].map((b, i) => ({ ...b, indice: i }));
  if (blocos.length) blocos[blocos.length - 1] = { ...blocos[blocos.length - 1], descansoAposBlocoSeg: null };
  const totalExercicios = blocos.reduce((s, b) => s + b.exercicios, 0);
  return {
    ...e,
    blocos,
    totalExercicios,
    cotaNivelSeguinte: e.preparacaoNivelSeguinte ? Math.floor(totalExercicios / 3) : 0,
    regrasParaPrompt: [...e.regrasParaPrompt, `Treino de ${minutos} minutos: ${blocos.length} bloco(s).`],
  };
}

/** Nome do treino para o aluno. */
export function tituloDoTreino(p: PerfilAluno, posicao: number, lado: "inferior" | "superior" | null): string {
  if (p.familia === "hipertrofia") return lado === "superior" ? "Superiores" : "Inferiores";
  if (p.familia === "cardio_hiit") return "Cardio e HIIT";
  if (p.familia === "reabilitacao") return "Fortalecimento e alívio";
  return posicao % 2 ? "Corpo todo" : "Condicionamento";
}
