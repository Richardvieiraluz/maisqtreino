// Adaptação dos próximos treinos (puro). Rodar: npx tsx scripts/teste-adaptacao.mts
import fs from "node:fs";
import { adaptarTreino, calcularAdaptacao, subirCarga } from "../lib/ia-treino/adaptacao";
import { perfilDoQuiz } from "../lib/ia-treino/aluno";
import { itemDoCatalogo } from "../lib/ia-treino/catalogo";
import { gerarTreinoDoAluno, historicoDe } from "../lib/ia-treino/gerar-aluno";
import { opcoesDeTroca } from "../lib/ia-treino/trocas-aluno";
import { modeloFalso } from "./modelo-falso.mts";
const ok = (c: boolean, m: string) => console.log(c ? "OK  " : "FALHA", m);
const agora = Date.parse("2026-11-05T15:00:00Z");
const dia = (d: number) => new Date(agora - d * 86_400_000).toISOString();
const serie = (id: string, n: number, carga?: number) => ({ exercicioId: id, nome: id.toUpperCase(), serie: n, reps: 10, ...(carga ? { carga } : {}) });

ok(subirCarga(10) === 11 && subirCarga(40) === 42 && subirCarga(8) === 9 && subirCarga(25) === 26.5, "subir carga: +5%, mínimo 1 kg, de 0,5 em 0,5");

let a = calcularAdaptacao([
  { em: dia(1), concluida: true, avaliacao: "facil", series: [serie("a", 1, 10), serie("a", 2, 10), serie("b", 1, 20), serie("b", 2)] },
  { em: dia(5), concluida: true, avaliacao: "ideal", series: [serie("a", 1, 12)] },
], [], agora);
ok(a.cargas.get("a")!.sugerida === 11 && a.cargas.get("a")!.melhor === 12 && !!a.cargas.get("a")!.motivo, "fácil e todas as séries com carga: sugere subir; melhor de todas");
ok(a.cargas.get("b")!.sugerida === 20, "série sem carga anotada: repete a carga");
ok(!a.menosVolume && a.evitar.size === 0, "sem dor nem difícil: nada sai, volume normal");

a = calcularAdaptacao([
  { em: dia(1), concluida: true, avaliacao: "dificil", series: [serie("a", 1, 10)] },
  { em: dia(2), concluida: false, avaliacao: null, series: [{ exercicioId: "c", nome: "C", serie: 0, dor: "leve" }] },
  { em: dia(3), concluida: true, avaliacao: "dificil", series: [] },
  { em: dia(20), concluida: true, avaliacao: "ideal", series: [{ exercicioId: "d", nome: "D", serie: 0, dor: "leve" }, { exercicioId: "e", nome: "E", serie: 0, dor: "forte" }] },
], [{ de: "f", em: dia(3) }, { de: "f", em: dia(10) }, { de: "g", em: dia(3) }], agora);
ok(a.menosVolume, "2 concluídos difíceis seguidos (interrompido não conta): menos volume");
ok(a.cargas.get("a")!.sugerida === 10, "difícil: repete a carga");
ok(a.evitar.has("c") && !a.evitar.has("d") && a.evitar.has("e"), "dor leve vale 14 dias, forte 30");
ok(a.evitar.has("f") && !a.evitar.has("g"), "trocado 2 vezes sai; 1 vez fica");

// Aplicar num treino gerado.
const catalogo = JSON.parse(fs.readFileSync(new URL("../supabase/dados/catalogo-exercicios.json", import.meta.url), "utf8")).map(itemDoCatalogo);
const perfil = perfilDoQuiz({ objetivo: "Ganhar massa muscular", nivel: "Intermediário", local: "Academia", equip: "Academia completa", dias: "4", tempo: "60", dores: ["Nenhuma"] } as any);
const r: any = await gerarTreinoDoAluno({ perfil, posicao: 2, catalogo, historico: historicoDe([]), protocoloId: "x" }, { chamarModelo: modeloFalso, seed: 5 });
const rasc = r.treino.rascunho;
const alvo = rasc.blocks[1].exercises[0];
const res = adaptarTreino(rasc, { evitar: new Map([[alvo.exerciseId, "teste"]]), menosVolume: true }, opcoesDeTroca(rasc, perfil, 2, catalogo));
const novo = res.rascunho.blocks[1].exercises[0];
ok(novo.exerciseId !== alvo.exerciseId && novo.comments.includes(alvo.exerciseName), `exercício com dor trocado: ${alvo.exerciseName} → ${novo.exerciseName}`);
const ids = res.rascunho.blocks.flatMap((b) => b.exercises.map((x) => x.exerciseId));
ok(new Set(ids).size === ids.length, "substituto não repete exercício do treino");
ok(res.rascunho.blocks[0].numberSeries === rasc.blocks[0].numberSeries, "aquecimento não perde série");
ok(res.rascunho.blocks.slice(1).every((b, i) => b.numberSeries === Math.max(2, rasc.blocks[i + 1].numberSeries - 1) || rasc.blocks[i + 1].numberSeries <= 2), "demais blocos: 1 série a menos, nunca abaixo de 2");
ok(res.notas.length === 2, `notas: ${res.notas.join(" | ")}`);
ok(rasc.blocks[1].exercises[0].exerciseId === alvo.exerciseId, "o treino original não é alterado");
