// Treino gerado → passos da tela de execução. Rodar: npx tsx scripts/teste-para-sessao.mts
import fs from "node:fs";
import { perfilDoQuiz } from "../lib/ia-treino/aluno";
import { itemDoCatalogo } from "../lib/ia-treino/catalogo";
import { gerarTreinoDoAluno, historicoDe } from "../lib/ia-treino/gerar-aluno";
import { paraTreinoSessao } from "../lib/ia-treino/para-sessao";
import { modeloFalso } from "./modelo-falso.mts";
const ok = (c: boolean, m: string) => console.log(c ? "OK  " : "FALHA", m);
const catalogo = JSON.parse(fs.readFileSync(new URL("../supabase/dados/catalogo-exercicios.json", import.meta.url), "utf8")).map(itemDoCatalogo);
const info = new Map(catalogo.map((x: any) => [x.id, { musculos: x.musculos, grupoMuscular: x.muscularGroup, equipamentos: x.equipamentos }]));
for (const [nome, quiz] of [
  ["condicionamento (circuito)", { objetivo: "Condicionamento", nivel: "Intermediário", local: "Em casa", equip: "Lista", equipamentos: ["Halter"], dias: "3", tempo: "40", dores: ["Nenhuma"] }],
  ["hipertrofia (bi-set)", { objetivo: "Ganhar massa muscular", nivel: "Avançado", local: "Academia", equip: "Academia completa", dias: "4", tempo: "60", dores: ["Nenhuma"] }],
] as const) {
  const perfil = perfilDoQuiz(quiz as any);
  const r = await gerarTreinoDoAluno({ perfil, posicao: 1, catalogo, historico: historicoDe([]), protocoloId: "x" }, { chamarModelo: modeloFalso, seed: 3 });
  if (!r.ok) { console.log("FALHA geração", r.error); continue; }
  const rasc = r.treino.rascunho;
  const t = paraTreinoSessao(rasc, { id: "protocolo-01", titulo: r.treino.titulo, posicao: 1, total: 24, duracaoMin: perfil.minutos, perfil, local: "casa", info });
  const esperado = rasc.blocks.reduce((s, b) => s + (["Circuito", "Bi-Set"].includes(b.method) && b.exercises.length > 1 ? b.exercises.length * b.numberSeries : b.exercises.length), 0);
  console.log(`\n== ${nome}: ${rasc.blocks.map((b) => `${b.method} ${b.exercises.length}×${b.numberSeries}`).join(" / ")}`);
  ok(t.exercicios.length === esperado, `${t.exercicios.length} passos (esperado ${esperado})`);
  const b0 = rasc.blocks.find((b) => ["Circuito", "Bi-Set"].includes(b.method) && b.exercises.length > 1)!;
  const n = b0.exercises.length;
  const ini = t.exercicios.findIndex((x) => x.exercicioId === b0.exercises[0].exerciseId);
  ok(t.exercicios[ini + n].exercicioId === b0.exercises[0].exerciseId && t.exercicios[ini + 1].exercicioId === b0.exercises[1].exerciseId, "circuito alterna: 1, 2… e volta ao 1 na rodada 2");
  ok(t.exercicios[ini].descansoSeg === b0.exercises[0].restSec && t.exercicios[ini + n - 1].descansoSeg === b0.restBetweenSeriesSec, "descanso entre exercícios e entre rodadas");
  ok(t.exercicios[t.exercicios.length - 1].descansoSeg === 0 || !["Circuito", "Bi-Set"].includes(rasc.blocks[rasc.blocks.length - 1].method), "último passo do treino sem descanso");
  ok(t.exercicios.every((x) => x.videoUrl?.startsWith("https://") && x.grupo && x.equipamento), "todo passo tem vídeo, grupo e equipamento");
  ok(t.exercicios.every((x) => (x.modo === "reps" ? x.reps!.length >= 1 && x.reps!.every((n) => n > 0) : (x.segundos ?? 0) > 0)), "séries com repetição ou tempo válidos");
  console.log("   exemplo:", t.exercicios.slice(0, 3).map((x) => `${x.nome} [${x.rodada ?? "séries"}] ${x.modo === "reps" ? x.reps!.join("/") + " reps" : x.segundos + " s"} · descanso ${x.descansoSeg}s`).join(" | "));
}
