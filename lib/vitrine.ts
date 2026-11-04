// Fileiras da tela Início que o Master ordena e esconde (Master > Vitrine). Módulo comum: usado
// no servidor e no navegador. "Seu treino de hoje" é fixo no topo e não entra aqui.

export interface Fileira {
  titulo: string;
  estilo: "cards" | "tiles" | "automatica";
  visivel: boolean;
}

export const VITRINE_PADRAO: Fileira[] = [
  { titulo: "Continue de onde parou", estilo: "automatica", visivel: true },
  { titulo: "Programas", estilo: "cards", visivel: true },
  { titulo: "Treino em casa", estilo: "cards", visivel: true },
  { titulo: "Treino na academia", estilo: "cards", visivel: true },
  { titulo: "Por material", estilo: "tiles", visivel: true },
  { titulo: "Por modalidade", estilo: "tiles", visivel: true },
  { titulo: "Por região", estilo: "tiles", visivel: true },
  { titulo: "Lesões", estilo: "tiles", visivel: true },
  { titulo: "Rápidos", estilo: "tiles", visivel: true },
];

/** Vitrine publicada + fileiras novas do app (entram no fim, visíveis). Títulos que o app não tem saem. */
export function vitrineFinal(salva: readonly Fileira[] | null | undefined): Fileira[] {
  if (!salva?.length) return VITRINE_PADRAO;
  const conhecidas = new Map(VITRINE_PADRAO.map((f) => [f.titulo, f]));
  const lista = salva.filter((f) => conhecidas.has(f.titulo)).map((f) => ({ ...conhecidas.get(f.titulo)!, visivel: f.visivel }));
  for (const f of VITRINE_PADRAO) if (!lista.some((x) => x.titulo === f.titulo)) lista.push(f);
  return lista;
}
