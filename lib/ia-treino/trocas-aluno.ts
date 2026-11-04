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
      const s = substitutosPara(e.esqueleto, cat, historico, { bloco: bi, exerciseId: x.exerciseId, slot, emTreino, noBloco });
      mapa.set(chave, s.ok ? s.substitutos.map((o) => ({ id: o.exerciseId, nome: o.nome, videoUrl: o.videoUrl || undefined })) : []);
    });
  });
  return mapa;
}
