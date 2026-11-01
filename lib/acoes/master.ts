"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSessao } from "../auth";
import { createAdminClient } from "../supabase/admin";
import { supabaseConfigurado } from "../supabase/env";

// Ações do Master. Cada uma confere o papel de novo: uma Server Action pode ser chamada direto,
// sem passar pela tela.

type Resultado = { ok: true; msg: string } | { ok: false; error: string };
const DIA = 86_400_000;
const texto = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function exigirMaster(): Promise<string | null> {
  if (!supabaseConfigurado()) return "Disponível quando o banco estiver ligado.";
  const s = await getSessao();
  return s?.papel === "master" ? null : "Só o Master pode fazer isso.";
}

async function enderecoDoApp() {
  const h = await headers();
  return h.get("origin") ?? process.env.APP_BASE_URL ?? "https://maisqtreino.vercel.app";
}

/** Acesso dado pelo Master: assinatura vale 30 ou 365 dias; programa é vitalício. */
async function gravarAcesso(alunoId: string, produtoId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data: produto } = await db.from("produtos").select("id, nome, periodo").eq("id", produtoId).maybeSingle();
  if (!produto) return "Produto não encontrado.";
  const dias = produto.periodo === "mensal" ? 30 : produto.periodo === "anual" ? 365 : null;
  const { error } = await db.from("acessos").upsert(
    {
      aluno_id: alunoId,
      produto_id: produto.id,
      status: "ativo",
      inicio: new Date().toISOString(),
      valido_ate: dias ? new Date(Date.now() + dias * DIA).toISOString() : null,
      liberado_por: "master",
    },
    { onConflict: "aluno_id,produto_id" },
  );
  if (error) {
    console.error("[master] liberar acesso falhou", { code: error.code });
    return "Não deu para liberar o acesso.";
  }
  return null;
}

export async function convidarAlunoAction(nomeBruto: string, emailBruto: string, produtoId: string): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const nome = texto(nomeBruto, 80);
  const email = texto(emailBruto, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "E-mail inválido." };

  const db = createAdminClient();
  const convite = await db.auth.admin.inviteUserByEmail(email, { data: { nome }, redirectTo: `${await enderecoDoApp()}/entrar/senha` });
  let id = convite.data.user?.id ?? "";
  let jaTinhaConta = false;
  if (!id) {
    // Já tem conta: só libera o acesso (o login dele continua o mesmo).
    const { data } = await db.from("perfis").select("id").eq("email", email).maybeSingle();
    if (!data) {
      console.error("[master] convite falhou", { status: convite.error?.status, code: convite.error?.code });
      return { ok: false, error: convite.error?.status === 429 ? "Limite de e-mails do Supabase atingido. Tente mais tarde." : "Não deu para enviar o convite." };
    }
    id = data.id;
    jaTinhaConta = true;
  }
  if (nome) await db.from("perfis").update({ nome }).eq("id", id);
  if (produtoId) {
    const erro = await gravarAcesso(id, produtoId);
    if (erro) return { ok: false, error: erro };
  }
  revalidatePath("/master", "layout");
  return { ok: true, msg: jaTinhaConta ? "Essa pessoa já tinha conta. Acesso liberado." : `Convite enviado para ${email}.` };
}

export async function liberarAcessoAction(alunoId: string, produtoId: string): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const erro = await gravarAcesso(texto(alunoId, 64), texto(produtoId, 64));
  if (erro) return { ok: false, error: erro };
  revalidatePath("/master", "layout");
  return { ok: true, msg: "Acesso liberado." };
}

export async function reenviarLoginAction(alunoId: string): Promise<Resultado> {
  const negado = await exigirMaster();
  if (negado) return { ok: false, error: negado };
  const db = createAdminClient();
  const { data } = await db.from("perfis").select("email").eq("id", texto(alunoId, 64)).maybeSingle();
  if (!data) return { ok: false, error: "Aluno não encontrado." };
  const { error } = await db.auth.resetPasswordForEmail(data.email, { redirectTo: `${await enderecoDoApp()}/entrar/senha` });
  if (error) return { ok: false, error: error.status === 429 ? "Limite de e-mails do Supabase atingido. Tente mais tarde." : "Não deu para enviar." };
  return { ok: true, msg: `Link para criar senha enviado para ${data.email}.` };
}
