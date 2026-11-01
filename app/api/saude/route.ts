import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanEnv, supabaseAnon, supabaseUrl } from "@/lib/supabase/env";

// Diagnóstico da configuração: testa as 3 variáveis do Supabase e responde só "ok" ou o problema.
// Nunca devolve valor de chave, e-mail ou dado de aluno.
export const dynamic = "force-dynamic";

export async function GET() {
  const url = supabaseUrl();
  const publica = supabaseAnon();
  const secreta = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const r: Record<string, string> = {};

  r.endereco = !url
    ? "faltando"
    : /^https:\/\/[a-z0-9]{10,}\.supabase\.co$/.test(url)
      ? "ok"
      : "formato errado (deve ser https://xxxx.supabase.co, sem nada no final)";

  if (!publica) r.chave_publica = "faltando";
  else if (publica.startsWith("sb_secret_")) r.chave_publica = "ERRADA: aqui foi colada a Secret key. Troque pela Publishable key";
  else if (r.endereco !== "ok") r.chave_publica = "não testada (endereço com problema)";
  else {
    const resp = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: publica }, cache: "no-store" }).catch(() => null);
    r.chave_publica = resp?.ok ? "ok" : `não aceita pelo Supabase (${resp?.status ?? "sem resposta"})`;
  }

  if (!secreta) r.chave_secreta = "faltando";
  else if (secreta.startsWith("sb_publishable_")) r.chave_secreta = "ERRADA: aqui foi colada a Publishable key. Troque pela Secret key";
  else if (r.endereco !== "ok") r.chave_secreta = "não testada (endereço com problema)";
  else {
    const { count, error } = await createAdminClient().from("produtos").select("id", { count: "exact", head: true });
    r.chave_secreta = error ? `não aceita pelo Supabase (${error.code || error.message})` : "ok";
    if (!error) r.banco = count === 5 ? "ok (5 produtos)" : `encontrei ${count} produtos, esperava 5`;
  }

  const { error: erroTentativas } = r.chave_secreta === "ok" ? await createAdminClient().from("tentativas_login").select("id", { head: true, count: "exact" }) : { error: null };
  if (r.chave_secreta === "ok") r.sql_002 = erroTentativas ? "tabela tentativas_login não encontrada" : "ok";

  r.resumo = Object.values(r).every((v) => v.startsWith("ok")) ? "TUDO CERTO" : "tem item para corrigir";
  return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
}
