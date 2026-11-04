// Este módulo carrega a chave de serviço (ignora a RLS). O import "server-only" quebra o build
// se algum componente "use client" importar daqui, em vez de vazar a chave para o navegador.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cleanEnv, supabaseUrl } from "./env";

// Só para os scripts de teste (MAISQ_TESTE=1): troca o banco por um falso em memória.
let clienteDeTeste: unknown = null;
export function usarBancoDeTeste(db: unknown) {
  if (process.env.MAISQ_TESTE !== "1") throw new Error("usarBancoDeTeste só nos testes");
  clienteDeTeste = db;
}

export function createAdminClient() {
  if (clienteDeTeste && process.env.MAISQ_TESTE === "1") return clienteDeTeste as ReturnType<typeof createClient>;
  const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl() || !key) console.error("[admin] faltam variáveis", { url: !!supabaseUrl(), chave: !!key });
  return createClient(supabaseUrl(), key, { auth: { autoRefreshToken: false, persistSession: false } });
}
