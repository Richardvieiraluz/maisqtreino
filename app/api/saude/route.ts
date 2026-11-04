import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanEnv, supabaseAnon, supabaseUrl } from "@/lib/supabase/env";

// Diagnóstico da configuração: testa as 3 variáveis do Supabase e responde só "ok" ou o problema.
// Nunca devolve valor de chave, e-mail ou dado de aluno. O endereço do projeto não é segredo: aparece
// só quando está no formato errado, para dar para corrigir.
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
      : `formato errado. Está salvo: "${url.slice(0, 120)}". O certo é https://xxxx.supabase.co, sem nada no final`;

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

  // IA de montagem e catálogo.
  r.ia_chave = cleanEnv(process.env.ANTHROPIC_API_KEY) ? "ok" : "falta ANTHROPIC_API_KEY";
  r.ia_modelo = cleanEnv(process.env.ANTHROPIC_MODEL) ? "ok" : "sem ANTHROPIC_MODEL (usa o padrão do +Q Pilates)";
  if (r.chave_secreta === "ok") {
    const db = createAdminClient();
    const { count } = await db.from("exercicios").select("id", { count: "exact", head: true }).eq("ativo", true);
    r.catalogo = (count ?? 0) > 0 ? `ok (${count} exercícios)` : "catálogo vazio";
    const { error } = await db.from("protocolo_treinos").select("status").limit(1);
    r.sql_004 = error ? "migration 004 não aplicada" : "ok";
  }

  // Eduzz: não entra no resumo enquanto não for configurada.
  r.eduzz_chave = cleanEnv(process.env.EDUZZ_WEBHOOK_SECRET) ? "ok" : "ainda não configurada";
  if (r.chave_secreta === "ok") {
    const { data } = await createAdminClient().from("produtos").select("nome, eduzz_produto_id").eq("ativo", true);
    const faltam = (data ?? []).filter((p) => !p.eduzz_produto_id).map((p) => p.nome);
    r.eduzz_produtos = faltam.length ? `falta o código da Eduzz em: ${faltam.join(", ")}` : "ok";
  }

  const essenciais = Object.entries(r).filter(([k]) => !k.startsWith("eduzz") && k !== "ia_modelo");
  r.resumo = essenciais.every(([, v]) => v.startsWith("ok")) ? "TUDO CERTO" : "tem item para corrigir";
  return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
}
