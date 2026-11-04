// Modelo FALSO para os testes: escolhe candidatos válidos sem IA (preenche primeiro o bloco com
// menos opções, prefere inéditos, respeita cotas de nível e de máquina).
import type { ChamarModelo } from "../lib/ia-treino/gerar-aluno";
import { ehMaquina } from "../lib/ia-treino/v2/pastas";
import { paraObjetoSchema } from "../lib/ia-treino/v2/schema";

export /** Modelo falso: escolhe candidatos válidos, guloso, preferindo inéditos. */
const modeloFalso: ChamarModelo = async (_c, { esqueleto: e, candidatos: c, historico: h }) => {
  const usados = new Set<string>(), nomes = new Set<string>();
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  let seguinte = 0;
  const ordemBlocos = e.blocos.map((_, i) => i).sort((a, b) => c.blocos[a].candidatos.length - c.blocos[b].candidatos.length);
  const porIndice: any[] = [];
  for (const i of ordemBlocos) { const be = e.blocos[i]; porIndice[i] = ((be: any, i: number) => {
    const cb = c.blocos[i];
    const ok = (k: any, pos: number) => !usados.has(k.exerciseId) && !nomes.has(norm(k.nome)) && !(k.soAquecimento && pos >= be.aquecimentoPermiteNivelAbaixo) && !(k.nivelAbaixo && !cb.excecaoEstoque.usada) && !(k.nivelSeguinte && seguinte >= e.cotaNivelSeguinte);
    const ordem = [...cb.candidatos].sort((a, b) => Number(a.recente) - Number(b.recente) || Number(a.soAquecimento) - Number(b.soAquecimento));
    const escolha: any[] = [];
    if (cb.cotaMaquina && cb.cotaMaquina.reservadas >= cb.cotaMaquina.blocos) { const m = ordem.find((k) => ehMaquina(k) && !k.maquinaAbaixo && ok(k, 0)) ?? ordem.find((k) => ehMaquina(k) && ok(k, 0)); if (m) escolha.push(m); }
    for (const k of ordem) { if (escolha.length >= be.exercicios) break; if (cb.cotaMaquina && ehMaquina(k) && escolha.some((x) => ehMaquina(x))) continue; if (!escolha.includes(k) && !escolha.some((x) => norm(x.nome) === norm(k.nome)) && ok(k, escolha.length)) { if (k.nivelSeguinte) seguinte++; if (k.maquinaAbaixo && escolha.some((x) => x.maquinaAbaixo)) continue; escolha.push(k); } }
    escolha.forEach((k) => { usados.add(k.exerciseId); nomes.add(norm(k.nome)); if (k.nivelSeguinte) seguinte++; });
    const fR: number[][] = [], fT: number[][] = [];
    for (const m of Object.values(be.faixasMetas) as any[]) { if (m?.reps) fR.push(m.reps); if (m?.tempoSeg) fT.push(m.tempoSeg); }
    const serie = () => (fR.length && !be.soTempo && !e.soTempo ? { tipo: "repetition" as const, alvo: String(fR[0][0]) } : { tipo: "time" as const, alvo: `${fT[0][0]} s` });
    return {
      metodo: be.metodo ?? be.metodosPermitidos[0], descansoEntreSeriesSeg: be.descansoEntreSeriesSeg[0], descansoEntreExerciciosSeg: be.descansoEntreExerciciosSeg[0],
      descansoAposBlocoSeg: i === e.blocos.length - 1 || !be.descansoAposBlocoSeg ? null : be.descansoAposBlocoSeg[0], observacaoBloco: "",
      exercicios: escolha.map((k) => ({ ref: k.ref, series: Array.from({ length: be.series }, serie), observacao: "" })),
    };
  })(be, i); }
  const blocos = porIndice;
  return { texto: JSON.stringify(paraObjetoSchema({ justificativa: "teste", blocos })), inputTokens: 0, outputTokens: 0, stopReason: "end_turn" };
};

