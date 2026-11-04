// Linha do catálogo (tabela exercicios, ou o JSON exportado do +Q Pilates) → item do motor. PURO.
import type { ItemCatalogoAluno } from "./gerar-aluno";

export interface LinhaExercicio {
  id: string;
  nome: string;
  modalidade: string | null;
  material: string | null;
  grupo_muscular: string | null;
  video_origem: string | null;
  video_url?: string | null;
  niveis: number[] | null;
  categorias: string[] | null;
  posicao: string | null;
  impacto: string | null;
  fase: string | null;
  musculos: string[] | null;
  padroes: string[] | null;
  unilateral: boolean | null;
  equipamentos: string[] | null;
  acessorios: string[] | null;
  indicacoes: string[] | null;
  idoso: boolean | null;
  ativo?: boolean | null;
}

export function itemDoCatalogo(l: LinhaExercicio): ItemCatalogoAluno {
  return {
    id: l.id,
    nome: l.nome.trim(),
    modality: l.modalidade ?? "",
    material: l.material ?? "",
    muscularGroup: l.grupo_muscular ?? "",
    videoUrl: l.video_url || l.video_origem || "",
    posicao: l.posicao ?? "",
    acessorios: l.acessorios ?? [],
    usaMola: null,
    niveis: l.niveis ?? [],
    categorias: l.categorias ?? [],
    musculos: l.musculos ?? [],
    padroes: l.padroes ?? [],
    unilateral: l.unilateral,
    fase: l.fase,
    indicacoes: l.indicacoes ?? [],
    idoso: !!l.idoso,
    impacto: l.impacto ?? "sem",
    pendente: false,
    arquivado: l.ativo === false,
    equipamentos: l.equipamentos,
  };
}
