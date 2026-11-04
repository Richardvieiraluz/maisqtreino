import { NextResponse } from "next/server";
import { ErroTemporario, aplicarAviso } from "@/lib/dados/eduzz";
import { assinaturaValida, lerAviso } from "@/lib/eduzz";
import { cleanEnv, supabaseConfigurado } from "@/lib/supabase/env";

// Webhook da Eduzz (configurado no Developer Hub). Fora do proxy.ts: se autentica pelo x-signature.
// Respostas: 401 assinatura inválida; 200 para tudo que não adianta repetir (inclusive aviso ignorado);
// 500 só para erro passageiro de banco, para a Eduzz tentar de novo. Nunca registra o corpo inteiro
// (tem CPF, endereço e telefone do comprador).
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const chave = cleanEnv(process.env.EDUZZ_WEBHOOK_SECRET);
  if (!chave || !supabaseConfigurado()) return NextResponse.json({ ok: false, erro: "webhook não configurado" }, { status: 503 });

  const corpo = await request.text();
  if (!assinaturaValida(corpo, request.headers.get("x-signature"), chave)) {
    console.warn("[eduzz] assinatura inválida");
    return NextResponse.json({ ok: false, erro: "assinatura inválida" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ ok: true, ignorado: "corpo não é JSON" });
  }
  const aviso = lerAviso(json);
  if (!aviso) return NextResponse.json({ ok: true, ignorado: "sem id ou evento" });

  const endereco = cleanEnv(process.env.APP_BASE_URL) || new URL(request.url).origin;
  try {
    const r = await aplicarAviso(aviso, endereco);
    console.info("[eduzz]", aviso.evento, r.situacao, r.detalhe);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const temporario = e instanceof ErroTemporario;
    console.error("[eduzz] falha", aviso.evento, temporario ? (e as Error).message : "erro inesperado");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/** Verificação simples de endereço (abrir no navegador ou teste da Eduzz): só confirma que está no ar. */
export async function GET() {
  return NextResponse.json({ ok: true, webhook: "eduzz" });
}
