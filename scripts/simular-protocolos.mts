// Simula protocolos completos (24 treinos) para perfis de aluno, com o catálogo real e um modelo
// FALSO (escolhe candidatos válidos sem IA). Não usa banco nem chave. Rodar: npm run simular
// Serve para conferir se o catálogo e as regras fecham os treinos de cada perfil.
import fs from "node:fs";
import { perfilDoQuiz, catalogoDoAluno } from "../lib/ia-treino/aluno.ts";
import { itemDoCatalogo } from "../lib/ia-treino/catalogo.ts";
import { gerarTreinoDoAluno, historicoDe } from "../lib/ia-treino/gerar-aluno.ts";
import { modeloFalso as falso } from "./modelo-falso.mts";

const catalogo = JSON.parse(fs.readFileSync(new URL("../supabase/dados/catalogo-exercicios.json", import.meta.url), "utf8")).map(itemDoCatalogo);

const base = { sexo: "Feminino", idade: "30 a 39", dias: "4", regioes: ["Glúteo"], dores: ["Nenhuma"] };
const perfis: [string, any][] = [
  ["Academia · massa · intermediário · 60 min", { ...base, objetivo: "Ganhar massa muscular", nivel: "Intermediário", local: "Academia", equip: "Academia completa", tempo: "60" }],
  ["Casa · massa · halter+elástico+banco · 40 min", { ...base, objetivo: "Ganhar massa muscular", nivel: "Intermediário", local: "Em casa", equip: "Lista", equipamentos: ["Halter", "Elástico", "Banco", "Mini band"], tempo: "40" }],
  ["Casa · massa · só peso do corpo", { ...base, objetivo: "Ganhar massa muscular", nivel: "Iniciante", local: "Em casa", equip: "Lista", equipamentos: [], tempo: "40" }],
  ["Casa · perder gordura · iniciante · 20 min", { ...base, objetivo: "Perder gordura", nivel: "Iniciante", local: "Em casa", equip: "Lista", equipamentos: ["Mini band"], tempo: "20" }],
  ["Condomínio · perder gordura · intermediário", { ...base, objetivo: "Perder gordura", nivel: "Intermediário", local: "Condomínio", equip: "Lista", equipamentos: ["Halter", "Step", "Kettlebell"], tempo: "40" }],
  ["Academia · condicionamento · avançado", { ...base, objetivo: "Condicionamento", nivel: "Avançado", local: "Academia", equip: "Academia completa", tempo: "60" }],
  ["Casa · condicionamento · dor joelho e lombar", { ...base, objetivo: "Condicionamento", nivel: "Intermediário", local: "Em casa", equip: "Lista", equipamentos: ["Halter", "Elástico"], tempo: "40", dores: ["Joelho", "Lombar"] }],
  ["Casa · aliviar dores · lombar", { ...base, objetivo: "Aliviar dores", nivel: "Iniciante", local: "Em casa", equip: "Lista", equipamentos: ["Elástico", "Bola suíça"], tempo: "40", dores: ["Lombar"] }],
  ["Academia · aliviar dores · ombro e joelho", { ...base, objetivo: "Aliviar dores", nivel: "Intermediário", local: "Academia", equip: "Academia completa", tempo: "60", dores: ["Ombro", "Joelho"] }],
  ["Casa · 60 ou mais · massa", { ...base, idade: "60 ou mais", objetivo: "Ganhar massa muscular", nivel: "Iniciante", local: "Em casa", equip: "Lista", equipamentos: ["Halter", "Cadeira"], tempo: "40" }],
];

for (const [nome, quiz] of perfis) {
  const perfil = perfilDoQuiz(quiz);
  const cat = catalogoDoAluno(catalogo, perfil);
  const feitos: string[][] = [];
  let ok = 0, total = 24; const falhas: string[] = []; const avisos = new Set<string>(); let exemplo: any = null; const exTreino: number[] = [];
  for (let pos = 1; pos <= total; pos++) {
    const recentes = new Set(feitos.slice(-6).flat());
    const r = await gerarTreinoDoAluno({ perfil, posicao: pos, catalogo, historico: { ...historicoDe(feitos), treinosAnteriores: feitos }, protocoloId: "teste" }, { chamarModelo: falso, seed: pos });
    if (r.ok) {
      total = r.treino.totalTreinos;
      ok++;
      const ids = r.treino.rascunho.blocks.flatMap((b) => b.exercises.map((x) => x.exerciseId));
      feitos.push(ids); exTreino.push(ids.length);
      if (pos === 1) exemplo = r.treino;
    } else { falhas.push(`#${pos}: ${r.error}`); feitos.push([]); }
    r.diagnostico.avisos.forEach((a) => avisos.add(a.replace(/\d+/g, "#")));
  }
  console.log(`\n== ${nome}\n   ${perfil.familia} ${perfil.nivel ?? ""} ${perfil.minutos}min · catálogo do aluno: ${cat.length} · treinos ok: ${ok}/${total} · exercícios por treino: ${Math.min(...exTreino)}–${Math.max(...exTreino)}`);
  if (perfil.motivos.length) console.log("   motivos:", perfil.motivos.join("; "));
  if (falhas.length) console.log("   FALHAS:", falhas.slice(0, 3).join(" | "), falhas.length > 3 ? `(+${falhas.length - 3})` : "");
  if (avisos.size) console.log("   avisos:", [...avisos].slice(0, 4).join(" | "));
  if (exemplo) console.log("   treino 1:", exemplo.titulo, "·", exemplo.rascunho.blocks.map((b: any) => `${b.method}[${b.exercises.map((x: any) => x.exerciseName).join(", ")}]`).join(" / ").slice(0, 330));
}
