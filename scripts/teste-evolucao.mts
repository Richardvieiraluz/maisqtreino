// Evolução e sequência (puro). Rodar: npx tsx scripts/teste-evolucao.mts
import { calcularEvolucao, medalhas, sequencias } from "../lib/evolucao-calculos";
const ok = (c: boolean, m: string) => console.log(c ? "OK  " : "FALHA", m);

// 3x por semana: até 3 dias entre treinos não quebra.
let s = sequencias(["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-09"], "2026-11-10", 3);
ok(s.atual === 9 && s.recorde === 9, `seg-qua-sex-seg, hoje ter: ${s.atual} dias seguidos`);
s = sequencias(["2026-11-02", "2026-11-04"], "2026-11-09", 3);
ok(s.atual === 0 && s.recorde === 3 && s.comHoje === 1, `parou 5 dias: sequência zera (recorde ${s.recorde}, treinando hoje ${s.comHoje})`);
s = sequencias(["2026-11-02", "2026-11-03"], "2026-11-04", 5);
ok(s.atual === 3 && s.comHoje === 3, "5x por semana, treinou ontem: 3 dias");
s = sequencias([], "2026-11-04", 3);
ok(s.atual === 0 && s.comHoje === 1, "sem treino: 0, e o primeiro treino faz 1");

const musc: Record<string, string[]> = { a: ["glúteo", "posterior de coxa"], b: ["peitoral", "tríceps"] };
const sess = [
  { concluidaEm: "2026-10-28T12:00:00Z", series: [{ exercicioId: "a", nome: "Stiff", carga: 10 }, { exercicioId: "a", nome: "Stiff", carga: 12 }] },
  { concluidaEm: "2026-11-02T12:00:00Z", series: [{ exercicioId: "a", nome: "Stiff", carga: 14 }, { exercicioId: "b", nome: "Supino" }] },
  { concluidaEm: "2026-11-04T01:00:00Z", series: [{ exercicioId: "b", nome: "Supino", carga: 20 }] }, // 03/11 22h em SP
];
const e = calcularEvolucao(sess, Date.parse("2026-11-04T15:00:00Z"), 3, (id) => musc[id] ?? []);
ok(e.totalTreinos === 3, "3 treinos");
ok(e.meses[5][0] === "NOV" && e.meses[5][1] === 2 && e.meses[4][1] === 1, `meses ${JSON.stringify(e.meses.slice(-2))}`);
ok(e.semana[1] && e.semana[2] && !e.semana[3], "semana: seg e ter (fuso de SP) marcados");
ok(e.cargas[0].nome === "Stiff" && e.cargas[0].pontos.join() === "12,14", "carga: maior de cada treino");
ok(e.recordes === 1, "1 recorde (14 > 12)");
ok(e.musculosSemana.some(([m, n]) => m === "Peito" && n === 2) && e.rotuloDia === "03/11", `músculos ${JSON.stringify(e.musculosSemana)} · dia ${e.rotuloDia}`);
ok(e.sequencia === 3, `sequência ${e.sequencia} (pausa de 5 dias depois de 28/10 quebra; 02/11 → 04/11)`);
const md = Object.fromEntries(medalhas(e, false));
ok(md["1º treino"] && md["1º recorde"] && !md["7 dias"] && !md["10 treinos"], "medalhas: 1º treino e 1º recorde, sem 7 dias nem 10 treinos");
