// IA de treino v2 — VALIDAÇÃO da resposta do modelo (PR V2-3). PURO.
//
// Reconfere tudo que o schema já pede (o modelo pode errar) e as regras de negócio
// que o schema não expressa. Devolve uma lista de erros legíveis em português
// (vazia = ok); montarMensagemCorrecao vira a mensagem da nova tentativa.
//
// Regra dos 2/3 (igual à v1.1, montar-contexto.ts minIneditosPara): pelo menos
// ceil(2/3 × total) dos exercícios do treino são inéditos (não usados nos 6 treinos
// anteriores). O denominador é o total de exercícios do treino; os livres CONTAM
// normalmente (a v1.1 não tinha exceção para eles). Exceção única (Richard, 25/10/2026):
// os APARELHOS CARDIO (pasta "aparelhos cardio") ficam fora da conta — nem numerador
// nem denominador — em todas as famílias; nos candidatos eles nunca levam a marca R.
//
// Condicionamento (25/10): bloco principal sem máquina é ERRO quando a cota reservou
// pelo menos 1 máquina por bloco principal; sem estoque, só aviso (avisosMaquinaV2).
// Mais de 1 máquina de nível abaixo (maquinaAbaixo) no mesmo bloco é erro.

import type { Esqueleto } from "./esqueleto";
import { ehAparelhoCardio, FAMILIA_CARDIO_HIIT, type Candidato, type Historico, type ResultadoCandidatos } from "./candidatos";
import type { RespostaV2 } from "./schema";
import { ehFamiliaMqpilates, ehMaquina, FASE_SENSORIO_MOTOR, MOD } from "./pastas";

export const FRACAO_INEDITOS_V2 = 2 / 3;
export function minIneditosV2(n: number): number { return Math.ceil(FRACAO_INEDITOS_V2 * n - 1e-9); }

const normalizarNome = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Chave do "mesmo nome = repetição" dentro do treino. Decisão do Richard (25/10/2026):
 *  nas famílias mqpilates o mesmo nome em APARELHOS diferentes não é repetição ("hip
 *  mobility" no cadillac e na chair são exercícios diferentes) — a chave leva o aparelho
 *  (material do candidato). Funcional continua só pelo nome. O mesmo id é sempre repetição. */
export function chaveNomeRepetido(familia: string, cand: Pick<Candidato, "nome" | "material">): string {
  const n = normalizarNome(cand.nome);
  return ehFamiliaMqpilates(familia) ? `${cand.material.toLowerCase()}|${n}` : n;
}

/** Números do alvo de repetição ("12", "12 a 15", "12 cada lado"). */
export function repsDoAlvo(alvo: string): number[] {
  return [...alvo.matchAll(/\d+/g)].map((m) => Number(m[0]));
}

/** Segundos do alvo de tempo ("40", "40 s", "1 min", "1:30", "1'30", "30 a 45 s"). null = ilegível. */
export function segundosDoAlvo(alvo: string): number[] | null {
  const t = alvo.toLowerCase().replace(/’/g, "'").trim();
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d+):(\d{2})\b/))) return [Number(m[1]) * 60 + Number(m[2])];
  if ((m = t.match(/^(\d+)\s*(?:min|minutos?|')\s*(\d{1,2})\b/))) return [Number(m[1]) * 60 + Number(m[2])];
  const nums = [...t.matchAll(/\d+(?:[.,]\d+)?/g)].map((x) => Number(x[0].replace(",", ".")));
  if (!nums.length) return null;
  const emMinutos = /\b(min|minutos?)\b|'/.test(t) && !/\b(s|seg|segundos?)\b|''|"/.test(t);
  return nums.map((n) => Math.round(emMinutos ? n * 60 : n));
}

type Faixa = readonly [number, number];

/** Reformer (V2-4): a IA deve listar o unilateral UMA vez (o código duplica). Se ela
 *  mesmo assim escrever o MESMO unilateral 2× SEGUIDAS no bloco, vira uma entrada só
 *  (a dupla ocupa as 2 posições do mesmo jeito). Qualquer outra repetição — não
 *  unilateral, não adjacente, fora do Reformer — continua e é erro na validação. */
export function normalizarDuplasReformer(r: RespostaV2, e: Esqueleto, c: ResultadoCandidatos): RespostaV2 {
  if (e.familia !== "reformer") return r;
  return {
    ...r,
    blocos: r.blocos.map((b, i) => {
      if (!b) return b;
      const uni = new Set((c.blocos[i]?.candidatos ?? []).filter((k) => k.unilateral === true).map((k) => k.ref));
      const out: typeof b.exercicios = [];
      let fechouDupla = false; // a 3ª seguida não é mais dupla: fica (e vira "repetido")
      for (const x of b.exercicios) {
        const ant = out[out.length - 1];
        if (ant && !fechouDupla && ant.ref === x.ref && uni.has(x.ref)) { fechouDupla = true; continue; }
        fechouDupla = false;
        out.push(x);
      }
      return { ...b, exercicios: out };
    }),
  };
}
/** Reformer (rodada 12, Richard: "corrigir a contagem do unilateral no código"): a IA
 *  escolhe os exercícios; quem conta as posições é o CÓDIGO (unilateral = 2). Depois de
 *  normalizarDuplasReformer, por bloco:
 *  - posições a MAIS: tira exercícios do FIM do bloco (na ordem da IA), cada um só se
 *    couber no excesso (o de 1 posição antes do unilateral quando sobra 1); se só restar
 *    unilateral com excesso 1, tira o último e o bloco fica com 1 a menos (avisa);
 *  - posições a MENOS: não inventa exercício — o treino sai assim, com aviso.
 *  Nunca recusa nem gasta nova tentativa por causa da contagem. */
export function ajustarPosicoesReformer(r: RespostaV2, e: Esqueleto, c: ResultadoCandidatos): { resposta: RespostaV2; avisos: string[] } {
  if (e.familia !== "reformer") return { resposta: r, avisos: [] };
  const avisos: string[] = [];
  const blocos = r.blocos.map((b, i) => {
    const alvo = e.blocos[i]?.exercicios;
    if (!b || alvo === undefined) return b;
    const porRef = new Map((c.blocos[i]?.candidatos ?? []).map((k) => [k.ref, k]));
    const peso = (ref: string) => (porRef.get(ref)?.unilateral ? 2 : 1);
    const itens = [...b.exercicios];
    const total = itens.reduce((s, x) => s + peso(x.ref), 0);
    let excesso = total - alvo;
    const tirados: string[] = [];
    for (let j = itens.length - 1; j >= 0 && excesso > 0; j--) {
      if (peso(itens[j].ref) <= excesso) { excesso -= peso(itens[j].ref); tirados.unshift(porRef.get(itens[j].ref)?.nome ?? itens[j].ref); itens.splice(j, 1); }
    }
    if (excesso > 0) { // só unilaterais sobrando com excesso 1
      const j = itens.map((x) => peso(x.ref)).lastIndexOf(2);
      if (j >= 0) { tirados.push(porRef.get(itens[j].ref)?.nome ?? itens[j].ref); itens.splice(j, 1); }
    }
    const final = itens.reduce((s, x) => s + peso(x.ref), 0);
    if (tirados.length) avisos.push(`bloco ${i + 1} do Reformer: vieram ${total} posições; o sistema tirou ${tirados.join(", ")} para fechar ${final}`);
    if (final < alvo) avisos.push(`bloco ${i + 1} do Reformer com ${final} de ${alvo} posições (faltou exercício)`);
    return { ...b, exercicios: itens };
  });
  return { resposta: { ...r, blocos }, avisos };
}
const RE_AVISO_POSICOES = /^bloco \d+ do Reformer(: vieram \d+ posições| com \d+ de \d+ posições)/;
export const ehAvisoDePosicoesReformer = (a: string) => RE_AVISO_POSICOES.test(a);

const dentro = (v: number, faixas: readonly Faixa[]) => faixas.some(([a, b]) => v >= a && v <= b);

/** A cota do bloco tinha pelo menos 1 máquina por bloco principal? (regra vira erro) */
const cotaMaquinaCompleta = (cb: ResultadoCandidatos["blocos"][number] | undefined) => !!cb?.cotaMaquina && cb.cotaMaquina.reservadas >= cb.cotaMaquina.blocos;

/** Máquinas escolhidas no bloco (pelos candidatos do próprio bloco). */
function maquinasDoBloco(b: RespostaV2["blocos"][number], cb: ResultadoCandidatos["blocos"][number] | undefined): Candidato[] {
  return (b?.exercicios ?? []).map((x) => cb?.candidatos.find((k) => k.ref === x.ref)).filter((k): k is Candidato => !!k && ehMaquina(k));
}

/** Condicionamento sem estoque de máquina: bloco principal sem máquina só AVISA. */
export function avisosMaquinaV2(r: RespostaV2, c: ResultadoCandidatos): string[] {
  return r.blocos.flatMap((b, i) => {
    const cb = c.blocos[i];
    if (!b || !cb?.cotaMaquina || cotaMaquinaCompleta(cb)) return [];
    return maquinasDoBloco(b, cb).length ? [] : [`bloco ${i + 1} sem máquina (estoque)`];
  });
}

/** Rodada 5 (Richard: "sim, pelo menos em um bloco"): Cardio/HIIT com aparelho cardio na
 *  lista e nenhum aparelho escolhido em bloco principal só AVISA (painel de regras) —
 *  nunca é erro, não gasta nova tentativa. Outras famílias: nada. */
export const AVISO_SEM_APARELHO_CARDIO = "Nenhum aparelho de cardio no treino (pedido: pelo menos 1 bloco)";
export function avisoAparelhoCardioV2(r: RespostaV2, e: Esqueleto, c: ResultadoCandidatos): string[] {
  if (e.familia !== FAMILIA_CARDIO_HIIT) return [];
  if (!c.blocos.some((cb) => cb.candidatos.some(ehAparelhoCardio))) return [];
  const temAparelho = r.blocos.some((b, i) => {
    const cb = c.blocos[i];
    if (!b || !cb || cb.tipo !== "principal") return false;
    return b.exercicios.some((x) => { const k = cb.candidatos.find((k) => k.ref === x.ref); return !!k && ehAparelhoCardio(k); });
  });
  return temAparelho ? [] : [AVISO_SEM_APARELHO_CARDIO];
}

/** `contagemReformer: false` = a geração (posições já ajustadas por ajustarPosicoesReformer,
 *  falta vira aviso). O painel do editor mantém a conta como item do checklist. */
export function validarRespostaV2(rCru: RespostaV2, e: Esqueleto, c: ResultadoCandidatos, historico: Historico, opcoes: { contagemReformer?: boolean } = {}): string[] {
  const erros: string[] = [];
  const r = normalizarDuplasReformer(rCru, e, c);
  if (r.blocos.length !== e.blocos.length) return [`o treino tem ${r.blocos.length} bloco(s); precisa de exatamente ${e.blocos.length}`];

  const usados = new Map<string, string>(); // exerciseId → onde
  const nomes = new Map<string, string>();
  const escolhidos: Candidato[] = [];
  let nivelSeguinte = 0;
  let lesaoTotal = 0, lesaoSM = 0;

  for (const [i, b] of r.blocos.entries()) {
    const be = e.blocos[i];
    const cb = c.blocos[i];
    const onde = `bloco ${i + 1}`;
    if (!b) { erros.push(`${onde}: ausente`); continue; }
    const permitidos = be.metodo ? [be.metodo] : be.metodosPermitidos;
    if (!permitidos.includes(b.metodo)) {
      erros.push(e.familia === "hipertrofia" && (e.nivelBase ?? 0) <= 1
        ? `${onde}: hipertrofia N0–N1.1 só usa Bi-Set (veio "${b.metodo}")`
        : `${onde}: método "${b.metodo}" não permitido (use ${permitidos.map((m) => `"${m}"`).join(", ")})`);
    }
    const faixa = (v: number | null, f: Faixa | null, nome: string) => {
      if (f === null) { if (v !== null) erros.push(`${onde}: ${nome} deve ser null (último bloco)`); return; }
      if (v === null || !Number.isInteger(v) || v < f[0] || v > f[1]) erros.push(`${onde}: ${nome} ${v ?? "vazio"}s fora da faixa ${f[0]}–${f[1]}s`);
    };
    faixa(b.descansoEntreSeriesSeg, be.descansoEntreSeriesSeg, "descanso entre séries");
    faixa(b.descansoEntreExerciciosSeg, be.descansoEntreExerciciosSeg, "descanso entre exercícios");
    faixa(b.descansoAposBlocoSeg, be.descansoAposBlocoSeg, "descanso após o bloco");
    if (b.observacaoBloco.trim() && !e.formatoExtremeOpcional) erros.push(`${onde}: observação do bloco não permitida neste protocolo (só Extreme a partir do N3)`);

    // Contagem: exercícios (ou posições no Reformer: unilateral = 2).
    const posicoes = b.exercicios.reduce((s, x) => s + (cb?.candidatos.find((k) => k.ref === x.ref)?.unilateral && e.familia === "reformer" ? 2 : 1), 0);
    if (e.familia === "reformer") {
      if (posicoes !== be.exercicios && opcoes.contagemReformer !== false) erros.push(`${onde}: Reformer com ${posicoes} posição(ões); precisa de exatamente ${be.exercicios} (unilateral ocupa 2)`);
    } else if (b.exercicios.length !== be.exercicios) {
      erros.push(`${onde}: ${b.exercicios.length} exercício(s); precisa de exatamente ${be.exercicios}`);
    }

    // Faixas aceitas para o alvo (metas + extras do bloco).
    const fReps: Faixa[] = [], fTempo: Faixa[] = [];
    for (const m of Object.values(be.faixasMetas)) { if (m?.reps) fReps.push(m.reps); if (m?.tempoSeg) fTempo.push(m.tempoSeg); }
    for (const [k, f] of Object.entries(be.faixasExtras)) { if (/TempoSeg$/.test(k)) fTempo.push(f); else if (/Reps$/.test(k)) fReps.push(f); }

    let posicao = 0;
    for (const x of b.exercicios) {
      const cand = cb?.candidatos.find((k) => k.ref === x.ref);
      if (!cand) {
        const outro = c.blocos.findIndex((ob) => ob.candidatos.some((k) => k.ref === x.ref));
        erros.push(outro >= 0 ? `${onde}: ${x.ref} é candidato do bloco ${outro + 1}, não deste` : `${onde}: ${x.ref} não existe na lista de candidatos`);
        posicao++;
        continue;
      }
      const ocupa = e.familia === "reformer" && cand.unilateral ? 2 : 1;
      const idxPos = posicao;
      posicao += ocupa;
      if (usados.has(cand.exerciseId)) erros.push(`${onde}: ${cand.ref} (${cand.nome}) repetido (já está no ${usados.get(cand.exerciseId)})`);
      else {
        const n = chaveNomeRepetido(e.familia, cand);
        if (nomes.has(n)) erros.push(`${onde}: ${cand.ref} (${cand.nome}) tem o mesmo nome de um exercício do ${nomes.get(n)}${ehFamiliaMqpilates(e.familia) ? ` no mesmo aparelho (${cand.material})` : ""}: é repetição`);
        usados.set(cand.exerciseId, onde); nomes.set(n, onde); escolhidos.push(cand);
      }
      // Nível
      if (cand.soAquecimento && idxPos >= be.aquecimentoPermiteNivelAbaixo) erros.push(`${onde}: ${cand.ref} (${cand.nome}) é de nível abaixo e só vale nos ${be.aquecimentoPermiteNivelAbaixo} primeiro(s) exercício(s) do bloco (aquecimento)`);
      if (cand.nivelAbaixo && !(cb?.excecaoEstoque.usada)) erros.push(`${onde}: ${cand.ref} (${cand.nome}) é de nível abaixo sem exceção de estoque neste bloco`);
      if (cand.nivelSeguinte) nivelSeguinte++;
      // Reabilitação mob_sm
      if (be.tipo === "lesao") { lesaoTotal++; if (cand.modality === MOD.reabilitacao && cand.fase === FASE_SENSORIO_MOTOR) lesaoSM++; }
      // Séries
      if (x.series.length !== be.series) erros.push(`${onde}: ${cand.ref} com ${x.series.length} série(s); precisa de ${be.series}`);
      for (const [si, s] of x.series.entries()) {
        const rotulo = `${onde}: ${cand.ref} série ${si + 1}`;
        if (s.tipo === "time") {
          if (!fTempo.length) { erros.push(`${rotulo}: tipo "time" mas a meta do bloco é repetição`); continue; }
          const seg = segundosDoAlvo(s.alvo);
          if (!seg) erros.push(`${rotulo}: alvo de tempo "${s.alvo}" sem número de segundos`);
          else if (!seg.every((v) => dentro(v, fTempo))) erros.push(`${rotulo}: tempo "${s.alvo}" fora da faixa da prescrição (${fTempo.map((f) => `${f[0]}–${f[1]}s`).join(" ou ")})`);
        } else {
          if (e.soTempo || be.soTempo) { erros.push(`${rotulo}: Reformer é sempre por tempo (veio "repetition")`); continue; }
          if (!fReps.length) { erros.push(`${rotulo}: tipo "repetition" mas a meta do bloco é tempo`); continue; }
          const reps = repsDoAlvo(s.alvo);
          if (!reps.length) erros.push(`${rotulo}: alvo de repetição "${s.alvo}" sem número`);
          else if (!reps.every((v) => dentro(v, fReps))) erros.push(`${rotulo}: repetições "${s.alvo}" fora da faixa da prescrição (${fReps.map((f) => `${f[0]}–${f[1]}`).join(" ou ")})`);
        }
      }
    }

    // Condicionamento: máquina nos blocos principais (só onde há cota).
    if (cb?.cotaMaquina) {
      const maq = maquinasDoBloco(b, cb);
      if (!maq.length && cotaMaquinaCompleta(cb)) erros.push(`${onde}: sem nenhum exercício MQ (máquina); cada bloco depois da ativação precisa de pelo menos 1`);
      const abaixo = maq.filter((k) => k.maquinaAbaixo);
      if (abaixo.length > 1) erros.push(`${onde}: ${abaixo.length} máquinas de nível abaixo (${abaixo.map((k) => k.ref).join(", ")}); o máximo é 1 por bloco`);
    }
  }

  // Treino inteiro — regra dos 2/3 SEM os aparelhos cardio (Richard 25/10/2026): eles não
  // entram no numerador nem no denominador (nunca têm a marca R nos candidatos).
  const contam = escolhidos.filter((x) => !ehAparelhoCardio(x));
  const nCardio = escolhidos.length - contam.length;
  const total = contam.length;
  const ineditos = contam.filter((x) => !historico.recentes.has(x.exerciseId)).length;
  const min = minIneditosV2(total);
  if (total > 0 && ineditos < min) erros.push(`poucos inéditos: ${ineditos} de ${total}${nCardio ? ` (os ${nCardio} aparelho(s) cardio ficam fora da conta)` : ""}; precisa de pelo menos ${min} (2/3) não usados nos 6 treinos anteriores`);
  if (historico.anterior.length && total > 0) {
    const ant = new Set(historico.anterior);
    if (ant.size === new Set(escolhidos.map((x) => x.exerciseId)).size && escolhidos.every((x) => ant.has(x.exerciseId))) erros.push("o treino é igual ao treino anterior (mesmo conjunto de exercícios)");
  }
  if (nivelSeguinte > e.cotaNivelSeguinte) erros.push(`${nivelSeguinte} exercício(s) do nível seguinte; o máximo neste treino é ${e.cotaNivelSeguinte}`);
  if (e.proporcaoSensorioMotor !== null && lesaoTotal > 0) {
    const precisa = Math.ceil(e.proporcaoSensorioMotor * lesaoTotal - 1e-9);
    if (lesaoSM < precisa) erros.push(`mobilidade + sensório motor: ${lesaoSM} de ${lesaoTotal} exercícios de lesão são de sensório motor (pasta reabilitação); precisa de pelo menos ${precisa} (2/3)`);
  }
  return erros;
}

/** Mensagem da nova tentativa: os erros concretos e o pedido do treino inteiro de novo. */
export function montarMensagemCorrecao(erros: readonly string[]): string {
  return `O treino foi recusado pela validação do sistema. Problemas:\n${erros.map((x) => `- ${x}`).join("\n")}\nRefaça o treino INTEIRO no mesmo formato, mantendo a estrutura do esqueleto e corrigindo todos os pontos acima. Use só refs dos candidatos de cada bloco, sem repetir exercício.`;
}
