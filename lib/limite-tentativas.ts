import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "./supabase/admin";
import { cleanEnv } from "./supabase/env";

// Limite de tentativas no próprio app (migration 002). Conta por e-mail e por IP do visitante numa
// janela curta; passou do limite, bloqueia, inclusive com a senha certa. Conta igual para e-mail que
// existe e que não existe. Nunca grava e-mail nem IP, só um HMAC. Sem a tabela (ou com erro de banco),
// conta em memória da instância: limita menos, mas nunca libera sem limite.

export type TipoTentativa = "login" | "esqueci" | "senha";

const REGRAS: Record<TipoTentativa, { email: number; ip: number; janelaMin: number }> = {
  login: { email: 5, ip: 20, janelaMin: 15 },
  esqueci: { email: 3, ip: 10, janelaMin: 60 },
  senha: { email: 5, ip: 20, janelaMin: 15 },
};

export interface Origem {
  email: string;
  ip: string | null;
}

function chave(tipo: TipoTentativa, dim: "email" | "ip", valor: string): string {
  // A chave de serviço é secreta e só existe no servidor: serve de segredo do HMAC.
  const segredo = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || "maisqtreino-limite";
  return createHmac("sha256", segredo).update(`${tipo}:${dim}:${valor.trim().toLowerCase()}`).digest("hex");
}

function chavesDe(tipo: TipoTentativa, o: Origem) {
  const ks: { dim: "email" | "ip"; k: string }[] = [];
  if (o.email) ks.push({ dim: "email", k: chave(tipo, "email", o.email) });
  if (o.ip) ks.push({ dim: "ip", k: chave(tipo, "ip", o.ip) });
  return ks;
}

const memoria = new Map<string, number[]>();
function memContar(k: string, desde: number) {
  const v = (memoria.get(k) ?? []).filter((t) => t >= desde);
  memoria.set(k, v);
  return v.length;
}

let tabelaAusente = false;
const semTabela = (code?: string) => code === "42P01" || code === "PGRST205";

async function contar(tipo: TipoTentativa, k: string, desdeMs: number): Promise<number> {
  const local = memContar(k, desdeMs);
  if (tabelaAusente) return local;
  const { count, error } = await createAdminClient()
    .from("tentativas_login")
    .select("id", { count: "exact" })
    .eq("chave", k)
    .eq("tipo", tipo)
    .gte("criado_em", new Date(desdeMs).toISOString())
    .limit(1);
  if (error) {
    if (semTabela(error.code)) tabelaAusente = true;
    else console.error("[limite-tentativas] contagem falhou; usando memória", { code: error.code });
    return local;
  }
  return Math.max(count ?? 0, local);
}

export async function tentativaBloqueada(tipo: TipoTentativa, o: Origem, agora = Date.now()): Promise<boolean> {
  const r = REGRAS[tipo];
  const desde = agora - r.janelaMin * 60_000;
  for (const { dim, k } of chavesDe(tipo, o)) if ((await contar(tipo, k, desde)) >= r[dim]) return true;
  return false;
}

export async function registrarTentativa(tipo: TipoTentativa, o: Origem, agora = Date.now()): Promise<void> {
  const ks = chavesDe(tipo, o);
  for (const { k } of ks) memoria.set(k, [...(memoria.get(k) ?? []), agora]);
  if (tabelaAusente || !ks.length) return;
  const { error } = await createAdminClient()
    .from("tentativas_login")
    .insert(ks.map(({ k }) => ({ chave: k, tipo, criado_em: new Date(agora).toISOString() })));
  if (error) {
    if (semTabela(error.code)) tabelaAusente = true;
    else console.error("[limite-tentativas] registro falhou", { code: error.code });
  }
}

/** Login certo: zera as falhas deste e-mail (o contador do IP continua). */
export async function limparTentativasDoEmail(tipo: TipoTentativa, email: string): Promise<void> {
  const k = chave(tipo, "email", email);
  memoria.delete(k);
  if (tabelaAusente) return;
  const { error } = await createAdminClient().from("tentativas_login").delete().eq("chave", k).eq("tipo", tipo);
  if (error && semTabela(error.code)) tabelaAusente = true;
}

/** IP do visitante. Na Vercel, x-real-ip e x-forwarded-for são gravados pela plataforma. */
export function ipDaRequisicao(h: Headers): string | null {
  const real = h.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const xff = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff ? xff.slice(0, 64) : null;
}
