// Leitura da resposta da IA para as Explicações (puro). Rodar: npx tsx scripts/teste-explicacoes.mts
import { lerExplicacoes, pedidoExplicacoes } from "../lib/ia-treino/explicacoes";
const ok = (c: boolean, m: string) => console.log(c ? "OK  " : "FALHA", m);
const ids = new Set(["a", "b"]);
const r = lerExplicacoes(JSON.stringify({ itens: [
  { id: "a", posicaoInicial: "Em pé — pés afastados.", movimento: "Desça  devagar.", cuidado: "Joelho alinhado." },
  { id: "a", posicaoInicial: "x", movimento: "y", cuidado: "z" },
  { id: "c", posicaoInicial: "x", movimento: "y", cuidado: "z" },
  { id: "b", posicaoInicial: "x", movimento: "", cuidado: "z" },
] }), ids);
ok(r.length === 1 && r[0].id === "a", "só id pedido, sem repetição e com os três campos");
ok(!/[–—]/.test(r[0].posicaoInicial) && r[0].movimento === "Desça devagar.", "sem travessão e sem espaço duplo");
ok(lerExplicacoes("não é json", ids).length === 0, "resposta quebrada não grava nada");
ok(pedidoExplicacoes([{ id: "a", nome: "Agachamento", modalidade: null, material: "halter", equipamentos: ["halter"], posicao: "em pé", musculos: ["quadríceps"], padroes: null, unilateral: false }]).includes('"nome":"Agachamento"'), "pedido leva o cadastro do exercício");
