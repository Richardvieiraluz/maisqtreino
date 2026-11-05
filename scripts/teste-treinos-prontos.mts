// Treinos prontos (puro). Rodar: npx tsx scripts/teste-treinos-prontos.mts
import fs from "node:fs";
import { itemDoCatalogo } from "../lib/ia-treino/catalogo";
import { catalogoDoAluno, perfilDoQuiz } from "../lib/ia-treino/aluno";
import { opcoesDeTroca } from "../lib/ia-treino/trocas-aluno";
import { paraTreinoSessao } from "../lib/ia-treino/para-sessao";
import { alvoValido, fileiraDo, limparConteudo, prontoBloqueado, quizDaBase, ehIdPronto, novoIdPronto } from "../lib/treinos-prontos";
const ok = (c: boolean, m: string) => console.log(c ? "OK  " : "FALHA", m);
const catalogo = JSON.parse(fs.readFileSync(new URL("../supabase/dados/catalogo-exercicios.json", import.meta.url), "utf8")).map(itemDoCatalogo);
const mapa = new Map(catalogo.map((x: any) => [x.id, { nome: x.nome, videoUrl: x.videoUrl }]));

ok(alvoValido("repetition", "12") === "12" && alvoValido("repetition", "10 - 12") === "10-12" && alvoValido("time", "40 seg") === "40s" && alvoValido("repetition", "x") === null && alvoValido("time", "0s") === null, "alvo: repetições, faixa e tempo");
ok(ehIdPronto(novoIdPronto()) && !ehIdPronto("protocolo-07") && !ehIdPronto("gluteo-posterior-07"), "id tp- não colide com protocolo nem exemplo");

const [a, b, c] = catalogo.filter((x: any) => x.equipamentos?.includes("halter")).slice(0, 3);
const { conteudo, problemas } = limparConteudo({
  name: "x",
  base: { objetivo: "Ganhar massa muscular", equipamentos: ["Halter"], tempo: "40", regioes: ["Glúteo"], dor: null },
  blocks: [
    { method: "Circuito", restBetweenSeriesSec: 60, exercises: [
      { exerciseId: a.id, exerciseName: "nome falso", series: [{ type: "repetition", target: "12" }, { type: "repetition", target: "10" }, { type: "repetition", target: "8" }], restSec: 20 },
      { exerciseId: b.id, series: [{ type: "time", target: "40" }], restSec: 9999 },
      { exerciseId: "00000000-0000-0000-0000-000000000000", series: [{ type: "repetition", target: "12" }] },
    ] },
    { method: "Inventado", exercises: [{ exerciseId: c.id, series: [{ type: "repetition", target: "abc" }] }] },
    { method: "Convencional", exercises: [] },
  ],
}, mapa);
ok(conteudo.blocks.length === 1, "bloco sem exercício válido sai");
ok(conteudo.blocks[0].exercises[0].exerciseName === a.nome, "nome do exercício vem do catálogo, não do navegador");
ok(conteudo.blocks[0].exercises[1].series.length === 3 && conteudo.blocks[0].exercises[1].series[0].target === "40s", "circuito: todos com o mesmo número de rodadas; tempo vira 40s");
ok(conteudo.blocks[0].exercises[1].restSec === 600, "descanso limitado a 600 s");
ok(problemas.length === 2, `problemas anotados: ${problemas.join(" | ")}`);
ok(conteudo.base?.equipamentos[0] === "Halter", "base guardada para a IA e a troca");

ok(fileiraDo({ tipo: "vitrine", local: "condominio" }) === "Treino em casa" && fileiraDo({ tipo: "vitrine", local: "academia" }) === "Treino na academia" && fileiraDo({ tipo: "rapido", local: "casa" }) === "Rápidos", "fileira pelo tipo e local");
ok(!prontoBloqueado({ tipo: "vitrine", produtoId: null }, "assinante", []) && prontoBloqueado({ tipo: "vitrine", produtoId: null }, "programa", ["programa-gluteo"]), "assinante abre tudo; quem só tem programa não abre a vitrine");
ok(!prontoBloqueado({ tipo: "programa", produtoId: "programa-gluteo" }, "programa", ["programa-gluteo"]) && prontoBloqueado({ tipo: "programa", produtoId: "programa-lombar" }, "programa", ["programa-gluteo"]), "programa comprado abre só os treinos dele");
ok(prontoBloqueado({ tipo: "programa", produtoId: "programa-gluteo" }, "pausada", ["programa-gluteo"]), "pausada trava tudo");

// Troca e execução de um treino montado à mão.
const perfil = perfilDoQuiz(quizDaBase({ local: "casa", nivel: "iniciante" }, conteudo.base!));
const ops = opcoesDeTroca(conteudo, perfil, 1, catalogo);
const permitidos = new Set(catalogoDoAluno(catalogo, perfil).map((x: any) => x.id));
const lista = ops.get(`0-${a.id}`) ?? [];
ok(lista.length > 0 && lista.every((o) => permitidos.has(o.id) && o.id !== a.id && o.id !== b.id), `troca em treino montado à mão: ${lista.length} opções dentro do equipamento`);
const info = new Map(catalogo.map((x: any) => [x.id, { musculos: x.musculos, grupoMuscular: x.muscularGroup, equipamentos: x.equipamentos }]));
const t = paraTreinoSessao(conteudo, { id: "tp-teste1", titulo: "Teste", posicao: 1, total: 0, duracaoMin: 30, perfil, local: "casa", info, opcoes: ops });
ok(t.exercicios.length === 6 && t.exercicios[0].comCarga === true, "circuito de 2 × 3 rodadas vira 6 passos; halter pede carga");
