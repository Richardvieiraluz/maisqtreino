// Banco falso em memória com o pedaço da API do supabase-js que lib/dados usa (testes).
type Linha = Record<string, any>;
/** Valores padrão das colunas, como no banco real (migrations 001 e 004). */
const PADRAO: Record<string, Linha> = { protocolos: { ativo: true, auditoria: "pendente" }, protocolo_treinos: { status: "pendente", tentativas: 0 } };

export function bancoFalso(tabelas: Record<string, Linha[]> = {}) {
  const t: Record<string, Linha[]> = new Proxy(tabelas, { get: (o, k: string) => (o[k] ??= []) });
  let n = 0;
  const q = (tab: string) => {
    const filtros: ((l: Linha) => boolean)[] = [];
    let op: "select" | "update" | "insert" = "select", valores: any = null, ordem: [string, boolean] | null = null, faixa: [number, number] | null = null, lim: number | null = null, retorna = false;
    const exec = () => {
      if (op === "insert") {
        const rows = (Array.isArray(valores) ? valores : [valores]).map((r: Linha) => ({ id: `id${++n}`, criado_em: new Date().toISOString(), ...(PADRAO[tab] ?? {}), ...r }));
        if (tab === "protocolo_treinos" && rows.some((r: Linha) => t[tab].some((x) => x.protocolo_id === r.protocolo_id && x.posicao === r.posicao))) return { data: null, error: { code: "23505" } };
        t[tab].push(...rows);
        return { data: rows, error: null };
      }
      let lin = t[tab].filter((l) => filtros.every((f) => f(l)));
      if (op === "update") { lin.forEach((l) => Object.assign(l, valores)); return { data: lin, error: null }; }
      if (ordem) lin = [...lin].sort((a, b) => (a[ordem![0]] > b[ordem![0]] ? 1 : -1) * (ordem![1] ? 1 : -1));
      if (faixa) lin = lin.slice(faixa[0], faixa[1] + 1);
      if (lim !== null) lin = lin.slice(0, lim);
      return { data: lin, error: null };
    };
    const b: any = {
      select: () => { if (op !== "select") retorna = true; return b; },
      eq: (c: string, v: any) => (filtros.push((l) => l[c] === v), b),
      gte: (c: string, v: any) => (filtros.push((l) => l[c] != null && l[c] >= v), b),
      lt: (c: string, v: any) => (filtros.push((l) => l[c] != null && l[c] < v), b),
      in: (c: string, vs: any[]) => (filtros.push((l) => vs.includes(l[c])), b),
      not: (c: string, _op: string, _v: any) => (filtros.push((l) => l[c] !== null && l[c] !== undefined), b),
      is: (c: string, _v: any) => (filtros.push((l) => l[c] === null || l[c] === undefined), b),
      order: (c: string, o?: { ascending?: boolean }) => ((ordem = [c, o?.ascending !== false]), b),
      range: (a: number, z: number) => ((faixa = [a, z]), b),
      limit: (x: number) => ((lim = x), b),
      update: (v: any) => ((op = "update"), (valores = v), b),
      insert: (v: any) => ((op = "insert"), (valores = v), b),
      maybeSingle: async () => { const r = exec(); return { data: r.data?.[0] ?? null, error: r.error }; },
      single: async () => { const r = exec(); return { data: r.data?.[0] ?? null, error: r.error }; },
      then: (res: any, rej: any) => Promise.resolve(exec()).then(res, rej),
    };
    return b;
  };
  return { db: { from: q, auth: { admin: {} } } as any, t };
}
