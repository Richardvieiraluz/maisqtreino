// "Trocar exercício" na execução do treino gerado. PURO (sem banco).
// Usa os substitutos da v2 (mesmos músculos e padrão, dentro das regras do bloco) com o catálogo
// já filtrado pelo equipamento e pelas dores do aluno. Chave do mapa: `${bloco}-${exerciseId}`.
import type { OpcaoTroca } from "../tipos";
import { catalogoDoAluno, type PerfilAluno } from "./aluno";
import { esqueletoDoAluno, historicoDe, type ItemCatalogoAluno } from "./gerar-aluno";
import type { RascunhoV2 } from "./v2/rascunho";
import { substitutosPara } from "./v2/substitutos";

export function opcoesDeTroca(r: RascunhoV2, perfil: PerfilAluno, posicao: number, catalogo: readonly ItemCatalogoAluno[], anteriores: readonly (readonly string[])[] = []): Map<string, OpcaoTroca[]> {
  const mapa = new Map<string, OpcaoTroca[]>();
  const e = esqueletoDoAluno(perfil, posicao);
  if (!e.ok) return mapa;
  const cat = catalogoDoAluno(catalogo, perfil);
  const historico = historicoDe(anteriores);
  const emTreino = r.blocks.flatMap((b) => b.exercises.map((x) => x.exerciseId));
  r.blocks.forEach((b, bi) => {
    const noBloco = b.exercises.map((x) => x.exerciseId);
    b.exercises.forEach((x, slot) => {
      const chave = `${bi}-${x.exerciseId}`;
      if (mapa.has(chave)) return;
      const s = r.blocks.length <= e.esqueleto.blocos.length ? substitutosPara(e.esqueleto, cat, historico, { bloco: bi, exerciseId: x.exerciseId, slot, emTreino, noBloco }) : null;
      const lista = s?.ok ? s.substitutos.map((o) => ({ id: o.exerciseId, nome: o.nome, videoUrl: o.videoUrl || undefined })) : [];
      // Treino montado à mão (blocos fora da estrutura do motor): parecidos por músculo e padrão.
      mapa.set(chave, lista.length ? lista : parecidos(x.exerciseId, cat, catalogo, emTreino));
    });
  });
  return mapa;
}

const jaccard = (a: readonly string[], b: readonly string[]) => {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  const inter = a.filter((x) => sb.has(x)).length;
  return inter / (new Set([...a, ...b]).size || 1);
};

/** Até 5 exercícios com músculos em comum, que o aluno consegue fazer e que não estão no treino. */
export function parecidos(id: string, permitidos: readonly ItemCatalogoAluno[], catalogo: readonly ItemCatalogoAluno[], emTreino: readonly string[]): OpcaoTroca[] {
  const orig = catalogo.find((x) => x.id === id);
  if (!orig?.musculos.length) return [];
  const fora = new Set(emTreino);
  return permitidos
    .filter((x) => !fora.has(x.id) && x.id !== id && !x.arquivado)
    .map((x) => ({ x, p: 3 * jaccard(x.musculos, orig.musculos) + 2 * jaccard(x.padroes, orig.padroes) + (x.material === orig.material ? 0.5 : 0) + ((x.unilateral === true) === (orig.unilateral === true) ? 0.5 : 0) }))
    .filter((c) => c.p >= 1.5)
    .sort((a, b) => b.p - a.p || a.x.nome.localeCompare(b.x.nome, "pt-BR"))
    .slice(0, 5)
    .map(({ x }) => ({ id: x.id, nome: x.nome, videoUrl: x.videoUrl || undefined }));
}
