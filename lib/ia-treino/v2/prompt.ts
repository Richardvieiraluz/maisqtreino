// IA de treino v2 — PROMPT (PR V2-3). PURO.
//
// O código já decidiu a estrutura (esqueleto) e o que pode entrar (candidatos por
// bloco); o prompt só pede ao modelo que ESCOLHA entre os candidatos de cada bloco
// e escreva séries/descansos dentro das faixas. Sem exemplos de treinos antigos
// (eram o grosso dos tokens da v1.1 e induziam cópia).
//
// Candidatos compactos, uma linha cada:
//   ref | nome | músculos | padrões | níveis | U | R | S | A | L
//   U = unilateral · R = recente (usado nos 6 últimos treinos) · S = nível seguinte
//   (cota) · A = nível abaixo (só aquecimento, ou exceção de estoque) · L = livre
//   (alongamento/mobilidade). Em mob_sm a linha ainda traz SM/MOB (fase).
//   Famílias mqpilates (V2-4): + "pos: <posição>" e "ac: <acessórios>" (ac omitido se vazio).
//   Famílias mqpilates (076): marca SM = sem mola, SÓ no Cadillac desde a rodada 11 (mob_sm
//   é só reabilitação, sem conflito). Rodada 11: marca AL = Reformer com alça de mão/pé.
//   Condicionamento (25/10): marca MQ = musculação → máquina; "MQ A" = máquina de nível
//   abaixo pela regra da máquina (máx. 1 por bloco, em qualquer posição).
// Blocos que compartilham a mesma pasta imprimem a lista uma vez ("mesmos do bloco N").

import type { BlocoEsqueleto, Esqueleto } from "./esqueleto";
import { ehAparelhoCardio, type Candidato, type ResultadoCandidatos } from "./candidatos";
import { linhaVariedadeV2 } from "./variedade";
import { ehFamiliaMqpilates, ehMaquina, regraMolaAplica, temAlcaReformer, FAMILIA_COM_MAQUINA, FASE_MOBILIDADE, FASE_SENSORIO_MOTOR } from "./pastas";

export interface ProtocoloPrompt {
  nome: string;
  familia: string;
  nivel: string | null;
  fase: string | null;
  condicoes: readonly string[];
  descricao: string | null;
}

export interface PromptV2 { sistema: string; usuario: string }

/** Rodada 4 (Richard 25/10): "foco" opcional da master para ESTE treino. Até 200 caracteres,
 *  espaços normalizados; vazio = prompt igual ao de sempre. Entra numa seção própria depois
 *  das regras, com a ressalva de que as regras vencem. */
export const FOCO_MAX_V2 = 200;
export function limparFocoV2(valor: unknown): string {
  return String(valor ?? "").replace(/\s+/g, " ").trim().slice(0, FOCO_MAX_V2);
}
export function linhaFocoV2(foco: string): string {
  return `Orientação da master para este treino (aplique SEM quebrar nenhuma regra acima; se conflitar, as regras vencem): ${foco}`;
}

/** Estimativa grosseira de tokens: ceil(caracteres / 4), a mesma régua da v1.1
 *  (montar-contexto.ts tokensEstimados). Serve para comparar prompts, não para cobrar. */
export function estimarTokens(texto: string | PromptV2): number {
  const n = typeof texto === "string" ? texto.length : texto.sistema.length + texto.usuario.length;
  return Math.ceil(n / 4);
}

const SISTEMA = [
  "Você monta UM treino de um protocolo de uma rede de estúdios de Pilates e treinamento funcional.",
  "A estrutura (blocos, método, séries, nº de exercícios e faixas) já foi decidida pelo sistema: siga-a exatamente.",
  "Regras:",
  "- Escolha exercícios SÓ entre os candidatos do próprio bloco, pelo ref (ex.: E12). Nunca invente nem use ref de outro bloco.",
  "- Não repita exercício no treino.",
  "- Prefira inéditos: pelo menos 2/3 dos exercícios do treino sem a marca R; use R só se faltar.",
  "- S (nível seguinte) só até a cota informada; A (nível abaixo) só onde o bloco permite.",
  "- Equilibre músculos e padrões de movimento dentro do treino.",
  "- Exercício unilateral (U): o alvo é POR LADO (ex.: 12 = 12 de cada lado); o sistema escreve os lados.",
  "- Carga não é com você: não escreva peso.",
  "- Descansos: um valor inteiro em segundos DENTRO da faixa de cada bloco; após o último bloco, null.",
  "- Alvo da série dentro da meta do bloco: repetições quando a meta é repetição; segundos quando é tempo.",
  "- NÃO corte exercício por causa do tempo da aula: o nº de exercícios é o do esqueleto.",
].join("\n");

/** Rodada 5 (Richard): no Cardio/HIIT o aparelho deixou de ser OPCIONAL — pede 1 em pelo
 *  menos 1 bloco principal, SÓ quando há aparelho entre os candidatos. Não é erro: sem
 *  aparelho no treino vira aviso (AVISO_SEM_APARELHO_CARDIO em validar.ts). */
export const LINHA_APARELHO_CARDIO_V2 = "Inclua 1 aparelho de cardio (bike, remo, esteira ou elíptico) em pelo menos 1 bloco principal.";

/** Orientações da família (complementam as regrasParaPrompt do esqueleto).
 *  `temAparelhoCardio`: há aparelho cardio na lista de candidatos (só o Cardio/HIIT usa). */
/** Rodada 11: regra da mola (só Cadillac) e das alças (só Reformer). */
export const FRASE_MOLA_CADILLAC = "Cadillac: comece cada bloco com até 2 exercícios SM (sem mola); depois, os com mola. Nos outros aparelhos não há regra de mola.";
export const FRASE_ALCA_REFORMER = "Reformer: primeiro os exercícios SEM alça; os com alça de mão ou de pé (AL) vêm depois, todos juntos. O sistema garante essa ordem.";

function orientacoesDaFamilia(e: Esqueleto, temAparelhoCardio: boolean, temCadillac = false, temAlca = false): string[] {
  const o: string[] = [];
  switch (e.familia) {
    case "hipertrofia":
      o.push("Hipertrofia: treinos alternam A/B (inferior/superior); a ativação trabalha o MESMO membro do treino.",
        "Core só no bloco de ativação. Na ativação, halter e barra só leves.");
      break;
    case "extreme":
      if (e.formatoExtremeOpcional) o.push("Extreme N3+: AMRAP, EMOM ou HYROX é OPCIONAL; se usar, descreva o formato na observação do bloco (curta).");
      else o.push('Extreme: a observação do bloco fica "".');
      break;
    case "reformer": {
      const n = e.blocos[0]?.exercicios ?? 6;
      o.push("Reformer: séries SEMPRE por tempo (segundos).",
        `Cada bloco tem ${n} posições. Cada exercício marcado U ocupa 2 posições: com 1 U são ${n - 1} exercícios, com 2 U são ${n - 2}. O sistema confere a conta: se passar, tira do fim do bloco; se faltar, o treino sai com aviso — na dúvida, prefira 1 a mais.`,
        "Exercício unilateral (U) ocupa 2 posições (lado direito e lado esquerdo): conte assim para fechar o nº de posições do bloco, mas liste-o UMA vez só — o sistema duplica.");
      break;
    }
    case "pilates":
      o.push("Pilates: um bloco por aparelho, na ordem dada; cada bloco só com exercícios do seu aparelho.");
      break;
    case "condicionamento":
      o.push("Cada bloco depois da ativação tem pelo menos 1 exercício MQ (máquina). Máquina de nível abaixo: no máximo 1 por bloco.",
        "MQ com A = máquina de nível abaixo; ela pode ficar em qualquer posição do bloco.");
      break;
    case "cardio_hiit": {
      // Richard (rodada 5): "sim, pelo menos em um bloco". Só quando há aparelho na lista;
      // sem aparelho, sem a linha. Faixa de tempo da prescrição (extras.aparelhoCardioTempoSeg); 60–180 s se não houver.
      if (temAparelhoCardio) {
        const f = e.blocos.find((b) => b.tipo === "principal")?.faixasExtras.aparelhoCardioTempoSeg ?? [60, 180];
        o.push(`${LINHA_APARELHO_CARDIO_V2} É por tempo, entre ${f[0]} e ${f[1]} s.`);
      }
      break;
    }
    case "alongamento":
      o.push("Alongamento: só exercícios de alongamento e mobilidade.");
      break;
    case "reabilitacao":
      o.push("Reabilitação: blocos de lesão focam a condição do protocolo.");
      if (e.proporcaoSensorioMotor !== null) o.push("Mobilidade + sensório motor: pelo menos 2/3 dos exercícios dos blocos de lesão com a marca SM; o resto MOB.");
      break;
  }
  if (ehFamiliaMqpilates(e.familia)) {
    o.push("Ordem dentro do bloco: posição primeiro (deitado → sentado → ajoelhado → quatro apoios → em pé; suspenso/misto por último); dentro de cada posição, junte os exercícios do mesmo acessório (ac). A partir do N2, só junte por acessório. O sistema garante essa ordem.");
    if (temCadillac) o.push(FRASE_MOLA_CADILLAC);
    if (temAlca) o.push(FRASE_ALCA_REFORMER);
    if (e.familia !== "reformer") o.push('Unilateral (U) fica em UMA linha; o sistema escreve "do lado direito e do lado esquerdo" na observação.');
  }
  return o;
}

const faixa = (f: readonly [number, number] | null) => (f ? `${f[0]}–${f[1]}s` : "null (último bloco)");

const NOME_META: Record<string, string> = { geral: "", carga: "com carga", pesoDoCorpo: "peso do corpo", aparelhoCardio: "aparelho de cardio" };

function metasDoBloco(b: BlocoEsqueleto): string {
  const partes: string[] = [];
  for (const [k, m] of Object.entries(b.faixasMetas)) {
    if (!m) continue;
    const alvo = [m.reps ? `${m.reps[0]}–${m.reps[1]} reps` : "", m.tempoSeg ? `${m.tempoSeg[0]}–${m.tempoSeg[1]}s` : ""].filter(Boolean).join(" ou ");
    const s = b.metas[k as keyof typeof b.metas];
    const sug = s ? ` (sugerido ${[s.reps ? `${s.reps} reps` : "", s.tempoSeg ? `${s.tempoSeg}s` : ""].filter(Boolean).join("/")})` : "";
    partes.push(`${NOME_META[k] ? `${NOME_META[k]}: ` : ""}${alvo}${sug}`);
  }
  for (const [k, f] of Object.entries(b.faixasExtras)) partes.push(`${k}: ${f[0]}–${f[1]}${/TempoSeg$/.test(k) ? "s" : ""}`);
  return partes.join("; ") || "—";
}

function linhaBloco(b: BlocoEsqueleto, e: Esqueleto): string {
  const metodo = b.metodo ?? `escolha entre ${b.metodosPermitidos.join(" | ")}`;
  const quantos = e.familia === "reformer" ? `${b.exercicios} posições` : `${b.exercicios} exercício(s)`;
  const partes = [
    `Bloco ${b.indice + 1} — ${b.tipo}${b.aparelho ? ` (${b.aparelho})` : ""}`,
    `método ${metodo}`, `${b.series} série(s)`, quantos,
    `meta ${metasDoBloco(b)}${b.soTempo || e.soTempo ? " — só tempo" : ""}`,
    `descanso entre séries ${faixa(b.descansoEntreSeriesSeg)}`,
    `entre exercícios ${faixa(b.descansoEntreExerciciosSeg)}`,
    `após o bloco ${faixa(b.descansoAposBlocoSeg)}`,
  ];
  if (b.aquecimentoPermiteNivelAbaixo > 0) partes.push(`A permitido nos ${b.aquecimentoPermiteNivelAbaixo} primeiros`);
  if (b.condicoes.length) partes.push(`condição: ${b.condicoes.join(", ")}`);
  return b.orientacao ? `${partes.join(" · ")}\n  ${b.orientacao}` : partes.join(" · ");
}

function marcas(x: Candidato, mobSm: boolean, aparelho: boolean, maquina: boolean): string {
  const m = [x.unilateral ? "U" : "", x.recente ? "R" : "", x.nivelSeguinte ? "S" : "", x.soAquecimento || x.nivelAbaixo || x.maquinaAbaixo ? "A" : "", x.livre ? "L" : ""];
  if (maquina && ehMaquina(x)) m.push("MQ");
  if (mobSm) m.push(x.fase === FASE_SENSORIO_MOTOR ? "SM" : x.fase === FASE_MOBILIDADE ? "MOB" : "");
  // usaMola só vem preenchido no Cadillac (candidatos.ts)
  if (aparelho && x.usaMola === false) m.push("SM");
  if (aparelho && temAlcaReformer(x)) m.push("AL");
  return m.filter(Boolean).join(" ");
}

export function linhaCandidato(x: Candidato, mobSm = false, aparelho = false, maquina = false): string {
  const base = [x.ref, x.nome, x.musculos.join(", ") || "—", x.padroes.join(", ") || "—", x.niveis.map((n) => `N${n}`).join(",") || "—", marcas(x, mobSm, aparelho, maquina)];
  if (aparelho) {
    base.push(`pos: ${x.posicao || "—"}`);
    if (x.acessorios.length) base.push(`ac: ${x.acessorios.join(", ")}`);
  }
  return base.join(" | ");
}

export function montarPromptV2(a: { protocolo: ProtocoloPrompt; esqueleto: Esqueleto; candidatos: ResultadoCandidatos; foco?: string }): PromptV2 {
  const { protocolo: p, esqueleto: e, candidatos: c } = a;
  const foco = limparFocoV2(a.foco);
  const mobSm = e.proporcaoSensorioMotor !== null;
  const u: string[] = [];
  u.push(`PROTOCOLO: ${p.nome} · família ${p.familia}${p.nivel ? ` · nível ${p.nivel}` : ""}${p.fase ? ` · fase ${p.fase}` : ""}${p.condicoes.length ? ` · condições: ${p.condicoes.join(", ")}` : ""}`);
  if (p.descricao?.trim()) u.push(`Descrição: ${p.descricao.trim()}`);
  u.push(`TREINO ${e.posicao} de ${e.totalTreinos} · ${e.blocos.length} bloco(s) · ${e.totalExercicios} ${e.familia === "reformer" ? "posições" : "exercícios"} no total`);
  u.push(`Cota de nível seguinte (S) neste treino: ${e.cotaNivelSeguinte}.`);

  const temAparelhoCardio = c.blocos.some((b) => b.candidatos.some(ehAparelhoCardio));
  const todos = c.blocos.flatMap((b) => b.candidatos);
  const temCadillac = todos.some((x) => regraMolaAplica(x.material));
  const temAlca = todos.some(temAlcaReformer);
  const regras = [...e.regrasParaPrompt, ...orientacoesDaFamilia(e, temAparelhoCardio, temCadillac, temAlca)];
  // Richard (25/10): aparelho cardio fora da regra dos 2/3, em qualquer família que o tenha na lista.
  if (temAparelhoCardio) regras.push("Aparelho de cardio (bike, remo, esteira, elíptico) fica FORA da regra dos 2/3: nunca tem a marca R e não conta nos inéditos.");
  if (regras.length) u.push("", "REGRAS DESTE PROTOCOLO:", ...regras.map((r) => `- ${r}`));
  // Variedade (Richard, 25/10): preferência, não regra — uma linha, só quando há o que preferir.
  if (c.variedade) u.push("", linhaVariedadeV2(c.variedade));
  if (foco) u.push("", linhaFocoV2(foco));

  u.push("", "ESQUELETO:", ...e.blocos.map((b) => linhaBloco(b, e)));

  const aparelho = ehFamiliaMqpilates(e.familia);
  const maquina = e.familia === FAMILIA_COM_MAQUINA;
  u.push("", `CANDIDATOS (ref | nome | músculos | padrões | níveis | marcas U R S A L${mobSm ? " SM MOB" : ""}${maquina ? " MQ" : ""}${aparelho ? `${temCadillac ? " SM" : ""}${temAlca ? " AL" : ""} | pos | ac` : ""}):`);
  const impresso = new Map<string, number>();
  for (const cb of c.blocos) {
    const primeiro = impresso.get(cb.grupo);
    if (primeiro !== undefined) { u.push(`Bloco ${cb.indice + 1}: os mesmos do bloco ${primeiro + 1} (sem repetir exercício entre eles).`); continue; }
    impresso.set(cb.grupo, cb.indice);
    u.push(`Bloco ${cb.indice + 1}${cb.aparelho ? ` (${cb.aparelho})` : ""}:`);
    for (const x of cb.candidatos) u.push(linhaCandidato(x, mobSm, aparelho, maquina));
  }
  u.push("", "Responda no formato pedido: justificativa curta (até 3 linhas) e os blocos na ordem.");
  return { sistema: SISTEMA, usuario: u.join("\n") };
}
