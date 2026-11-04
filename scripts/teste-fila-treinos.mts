// Teste da fila de geração (lib/dados/treinos.ts) com banco falso em memória e modelo falso.
// Rodar: MAISQ_TESTE=1 npx tsx --conditions react-server scripts/teste-fila-treinos.mts
import fs from "node:fs";
import { garantirFila, gerarProximo, prepararProtocolo, protocoloAtivo, MAX_TENTATIVAS } from "../lib/dados/treinos";
import { usarBancoDeTeste } from "../lib/supabase/admin";
import { bancoFalso } from "./banco-falso.mts";
import { modeloFalso } from "./modelo-falso.mts";

const ok = (c: boolean, m: string) => console.log(c ? "OK  " : "FALHA", m);
const exercicios = JSON.parse(fs.readFileSync(new URL("../supabase/dados/catalogo-exercicios.json", import.meta.url), "utf8")).map((x: any) => ({ ...x, ativo: true }));
const { db, t } = bancoFalso({ exercicios });
usarBancoDeTeste(db);

const aluno = "aluno-1";
const quiz = { sexo: "Feminino", idade: "30 a 39", objetivo: "Ganhar massa muscular", nivel: "Intermediário", local: "Em casa", equip: "Lista", equipamentos: ["Halter", "Elástico", "Banco"], dias: "3", tempo: "40", regioes: ["Glúteo"], dores: ["Nenhuma"] };

const p1 = await prepararProtocolo(aluno, "q1", quiz);
ok(p1.novo && t.protocolos.length === 1, "quiz cria o protocolo");
ok(t.protocolo_treinos.length === 3 && t.protocolo_treinos.every((x) => x.status === "pendente"), "3 dias por semana: 3 treinos na fila");
const mesmo = await prepararProtocolo(aluno, "q2", { ...quiz });
ok(!mesmo.novo && mesmo.id === p1.id, "quiz igual não recria o protocolo");

const r1 = await gerarProximo(p1.id, { chamarModelo: modeloFalso });
ok(r1.situacao === "gerado" && (r1 as any).posicao === 1, "gera o treino 1 primeiro");
const t1 = t.protocolo_treinos.find((x) => x.posicao === 1)!;
ok(t1.status === "pronto" && t1.titulo && t1.tipo === "A" && t1.conteudo?.blocks?.length > 0 && t1.diagnostico, "treino 1 pronto, com título, tipo, conteúdo e diagnóstico");
await gerarProximo(p1.id, { chamarModelo: modeloFalso });
await gerarProximo(p1.id, { chamarModelo: modeloFalso });
ok(t.protocolo_treinos.filter((x) => x.status === "pronto").length === 3, "fila de 3 pronta, em ordem");
ok((await gerarProximo(p1.id, { chamarModelo: modeloFalso })).situacao === "nada", "sem fila: não gera nada a mais");

const ids1 = new Set(t.protocolo_treinos.find((x) => x.posicao === 1).conteudo.blocks.flatMap((b: any) => b.exercises.map((e: any) => e.exerciseId)));
const ids2 = t.protocolo_treinos.find((x) => x.posicao === 2).conteudo.blocks.flatMap((b: any) => b.exercises.map((e: any) => e.exerciseId));
ok(ids2.filter((id: string) => ids1.has(id)).length <= Math.floor(ids2.length / 3), "treino 2 respeita os inéditos em relação ao 1");

let pa = (await protocoloAtivo(aluno))!;
await garantirFila(pa, 1);
ok(t.protocolo_treinos.length === 4, "aluno fez 1 treino: a fila anda para o 4");

// gerando recente bloqueia; vencido volta
const t4 = t.protocolo_treinos.find((x) => x.posicao === 4)!;
t4.status = "gerando"; t4.iniciado_em = new Date().toISOString();
ok((await gerarProximo(p1.id, { chamarModelo: modeloFalso })).situacao === "ocupado", "treino sendo gerado agora: outro pedido não gera junto");
t4.iniciado_em = new Date(Date.now() - 10 * 60_000).toISOString();
ok((await gerarProximo(p1.id, { chamarModelo: modeloFalso })).situacao === "gerado", "geração travada há 10 min volta para a fila");

// falhas: 3 tentativas e para
pa = (await protocoloAtivo(aluno))!;
await garantirFila(pa, 2);
const quebrado = async () => { throw new Error("rede"); };
for (let i = 0; i < MAX_TENTATIVAS; i++) await gerarProximo(p1.id, { chamarModelo: quebrado as any });
const t5 = t.protocolo_treinos.find((x) => x.posicao === 5)!;
ok(t5.status === "erro" && t5.tentativas === MAX_TENTATIVAS && t5.erro, "3 falhas: treino marcado com erro, com o motivo");
ok((await gerarProximo(p1.id, { chamarModelo: modeloFalso })).situacao === "nada", "depois de 3 falhas não tenta mais sozinho (Master decide)");

// mudou equipamento: protocolo novo
const p2 = await prepararProtocolo(aluno, "q3", { ...quiz, equipamentos: ["Halter"] });
ok(p2.novo && t.protocolos.filter((x) => x.ativo !== false).length === 1 && t.protocolos.find((x) => x.id === p1.id).ativo === false, "equipamento mudou: protocolo novo, o antigo fica inativo");
