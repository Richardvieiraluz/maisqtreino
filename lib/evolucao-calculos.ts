// Evolução do aluno a partir das sessões concluídas. PURO (sem banco): testado em
// scripts/teste-evolucao.mts. Datas no fuso de São Paulo (UTC-3, sem horário de verão).

export interface SessaoFeita {
  /** ISO de concluida_em. */
  concluidaEm: string;
  series: { exercicioId: string; nome: string; carga?: number }[];
}

export interface Evolucao {
  /** Dias seguidos da sequência atual (0 = sem sequência). */
  sequencia: number;
  recordeSequencia: number;
  /** Sequência se o aluno treinar hoje (resumo do treino e stories). */
  sequenciaComHoje: number;
  /** Semana atual, domingo a sábado: treinou em cada dia? */
  semana: boolean[];
  totalTreinos: number;
  /** Últimos 6 meses, do mais antigo ao atual. */
  meses: [string, number][];
  musculosSemana: [string, number][];
  musculosDia: [string, number][];
  /** Dia mostrado no modo DIA ("HOJE" ou "12/10"). */
  rotuloDia: string;
  /** Exercícios com carga anotada: maior carga de cada sessão, até as 6 últimas. */
  cargas: { nome: string; pontos: number[] }[];
  recordes: number;
}

const MS_DIA = 86_400_000;
const FUSO_MS = 3 * 3_600_000;
export const diaLocal = (iso: string | number) => new Date(new Date(iso).getTime() - FUSO_MS).toISOString().slice(0, 10);
const numeroDoDia = (d: string) => Math.round(new Date(`${d}T00:00:00Z`).getTime() / MS_DIA);
const MESES_CURTOS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** Nome do músculo do catálogo → nome mostrado na Evolução (e palavra que o boneco entende). */
export const MUSCULO_EXIBIDO: Record<string, string> = {
  "glúteo": "Glúteo",
  abdutores: "Glúteo",
  deltoide: "Ombro",
  "quadríceps": "Quadríceps",
  "abdômen": "Abdômen",
  "oblíquos": "Abdômen",
  panturrilha: "Panturrilha",
  "tríceps": "Braço",
  "bíceps": "Braço",
  peitoral: "Peito",
  "posterior de coxa": "Posterior",
  dorsal: "Costas",
  "trapézio": "Costas",
  lombar: "Lombar",
  adutores: "Adutores",
};

/**
 * Sequência: dias corridos desde o início da série atual de treinos. Ela só quebra quando o
 * intervalo entre dois treinos passa do descanso que o plano prevê (7 dias / treinos por semana,
 * arredondado para cima). Assim, dia de descanso do plano não quebra a sequência.
 */
export function sequencias(dias: readonly string[], hoje: string, diasSemana: number) {
  const maxIntervalo = Math.ceil(7 / Math.max(1, Math.min(7, diasSemana)));
  const nums = [...new Set(dias)].map(numeroDoDia).sort((a, b) => a - b);
  const h = numeroDoDia(hoje);
  let recorde = 0;
  let inicio: number | null = null;
  let ultimo: number | null = null;
  for (const n of nums) {
    if (ultimo === null || n - ultimo > maxIntervalo) inicio = n;
    ultimo = n;
    recorde = Math.max(recorde, ultimo - (inicio as number) + 1);
  }
  const ativa = ultimo !== null && h - ultimo <= maxIntervalo;
  const atual = ativa ? h - (inicio as number) + 1 : 0;
  const comHoje = ultimo !== null && h - ultimo <= maxIntervalo ? h - (inicio as number) + 1 : 1;
  return { atual, recorde: Math.max(recorde, atual), comHoje: Math.max(comHoje, 1) };
}

function contarMusculos(sessoes: readonly SessaoFeita[], musculosDe: (id: string) => readonly string[]): [string, number][] {
  const conta = new Map<string, number>();
  for (const s of sessoes) {
    // Cada músculo conta uma vez por treino.
    const doTreino = new Set<string>();
    for (const x of s.series) for (const m of musculosDe(x.exercicioId)) if (MUSCULO_EXIBIDO[m]) doTreino.add(MUSCULO_EXIBIDO[m]);
    for (const m of doTreino) conta.set(m, (conta.get(m) ?? 0) + 1);
  }
  return [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).slice(0, 6);
}

export function calcularEvolucao(sessoesBrutas: readonly SessaoFeita[], agora: number, diasSemana: number, musculosDe: (id: string) => readonly string[]): Evolucao {
  const sessoes = [...sessoesBrutas].sort((a, b) => a.concluidaEm.localeCompare(b.concluidaEm));
  const hoje = diaLocal(agora);
  const dias = sessoes.map((s) => diaLocal(s.concluidaEm));
  const seq = sequencias(dias, hoje, diasSemana);

  // Semana atual (domingo a sábado).
  const nHoje = numeroDoDia(hoje);
  const dow = new Date(`${hoje}T00:00:00Z`).getUTCDay();
  const domingo = nHoje - dow;
  const treinados = new Set(dias.map(numeroDoDia));
  const semana = Array.from({ length: 7 }, (_, i) => treinados.has(domingo + i));

  // Meses.
  const [ano, mes] = hoje.split("-").map(Number);
  const meses: [string, number][] = [];
  for (let k = 5; k >= 0; k--) {
    const d = new Date(Date.UTC(ano, mes - 1 - k, 1));
    const chave = d.toISOString().slice(0, 7);
    meses.push([MESES_CURTOS[d.getUTCMonth()], dias.filter((x) => x.startsWith(chave)).length]);
  }

  // Músculos: últimos 7 dias e o último dia treinado.
  const daSemana = sessoes.filter((_, i) => nHoje - numeroDoDia(dias[i]) < 7);
  const ultimoDia = dias[dias.length - 1];
  const doDia = ultimoDia ? sessoes.filter((_, i) => dias[i] === ultimoDia) : [];
  const rotuloDia = !ultimoDia ? "HOJE" : ultimoDia === hoje ? "HOJE" : `${ultimoDia.slice(8, 10)}/${ultimoDia.slice(5, 7)}`;

  // Cargas: maior carga de cada sessão por exercício; recorde = sessão que passou a melhor anterior.
  const porExercicio = new Map<string, { nome: string; pontos: number[] }>();
  let recordes = 0;
  for (const s of sessoes) {
    const maior = new Map<string, { nome: string; carga: number }>();
    for (const x of s.series) {
      if (!x.carga || x.carga <= 0) continue;
      const m = maior.get(x.exercicioId);
      if (!m || x.carga > m.carga) maior.set(x.exercicioId, { nome: x.nome, carga: x.carga });
    }
    for (const [id, { nome, carga }] of maior) {
      const e = porExercicio.get(id) ?? { nome, pontos: [] };
      if (e.pontos.length && carga > Math.max(...e.pontos)) recordes++;
      e.pontos.push(carga);
      porExercicio.set(id, e);
    }
  }
  const cargas = [...porExercicio.values()]
    .sort((a, b) => b.pontos.length - a.pontos.length || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 6)
    .map((e) => ({ nome: e.nome, pontos: e.pontos.slice(-6) }));

  return {
    sequencia: seq.atual,
    recordeSequencia: seq.recorde,
    sequenciaComHoje: seq.comHoje,
    semana,
    totalTreinos: sessoes.length,
    meses,
    musculosSemana: contarMusculos(daSemana, musculosDe),
    musculosDia: contarMusculos(doDia, musculosDe),
    rotuloDia,
    cargas,
    recordes,
  };
}

/** Medalhas: [nome, conquistada]. */
export function medalhas(e: Evolucao, protocoloCompleto: boolean): [string, boolean][] {
  return [
    ["1º treino", e.totalTreinos >= 1],
    ["7 dias", e.recordeSequencia >= 7],
    ["2 semanas", e.recordeSequencia >= 14],
    ["1º recorde", e.recordes >= 1],
    ["10 treinos", e.totalTreinos >= 10],
    ["30 dias", e.recordeSequencia >= 30],
    ["Protocolo completo", protocoloCompleto],
    ["24 treinos", e.totalTreinos >= 24],
  ];
}
