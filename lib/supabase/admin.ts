// Este módulo carrega a chave de serviço (ignora a RLS). O import "server-only" quebra o build
// se algum componente "use client" importar daqui, em vez de vazar a chave para o navegador.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cleanEnv, supabaseUrl } from "./env";

export function createAdminClient() {
  const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl() || !key) console.error("[admin] faltam variáveis", { url: !!supabaseUrl(), chave: !!key });
  return createClient(supabaseUrl(), key, { auth: { autoRefreshToken: false, persistSession: false } });
}
