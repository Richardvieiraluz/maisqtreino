"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { estadoDosAcessos, type LinhaAcesso } from "@/lib/acesso";
import { getSessao } from "@/lib/auth";
import { ipDaRequisicao, limparTentativasDoEmail, registrarTentativa, tentativaBloqueada } from "@/lib/limite-tentativas";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// Login, senha e saída pelo SERVIDOR: o cookie da sessão é HttpOnly e o navegador nunca vê o token.
// Mensagens únicas para não revelar se o e-mail tem cadastro.

/** Para onde vai depois de entrar: o primeiro acesso passa pelas boas-vindas e pela prontidão. */
export type Destino = "boasVindas" | "/" | "/master" | "/oferta";
type Resultado = { ok: true; destino: Destino } | { ok: false; error: string };

const MSG_LOGIN = "E-mail ou senha não conferem.";
const MSG_LIMITE = "Muitas tentativas. Espere alguns minutos e tente de novo.";
const MSG_LINK = "Esse link expirou ou já foi usado. Peça um novo em Esqueci a senha.";
const VERSAO_TERMOS = "2026-10";

const texto = (v: unknown, max = 320) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function destinoPosLogin(userId: string): Promise<Destino> {
  const admin = createAdminClient();
  const [perfil, acessos, termo] = await Promise.all([
    admin.from("perfis").select("papel").eq("id", userId).maybeSingle(),
    admin.from("acessos").select("produto_id, status, valido_ate, produtos(tipo)").eq("aluno_id", userId),
    admin.from("consentimentos").select("id").eq("aluno_id", userId).eq("tipo", "responsabilidade").is("revogado_em", null).limit(1),
  ]);
  if (perfil.data?.papel === "master") return "/master";
  const linhas: LinhaAcesso[] = (acessos.data ?? []).map((a) => ({
    produto_id: a.produto_id,
    status: a.status,
    valido_ate: a.valido_ate,
    tipo: (a.produtos as unknown as { tipo: LinhaAcesso["tipo"] } | null)?.tipo ?? "programa",
  }));
  if (estadoDosAcessos(linhas).estado === "sem_acesso") return "/oferta";
  return (termo.data ?? []).length ? "/" : "boasVindas";
}

export async function entrarAction(emailBruto: string, senhaBruta: string): Promise<Resultado> {
  if (!supabaseConfigurado()) return { ok: true, destino: "boasVindas" }; // modo demonstração
  const email = texto(emailBruto).toLowerCase();
  const senha = typeof senhaBruta === "string" ? senhaBruta.slice(0, 200) : "";
  if (!email || !senha) return { ok: false, error: MSG_LOGIN };

  const origem = { email, ip: ipDaRequisicao(await headers()) };
  if (await tentativaBloqueada("login", origem)) return { ok: false, error: MSG_LIMITE };

  const { data, error } = await (await createClient()).auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) {
    await registrarTentativa("login", origem);
    const limite = error?.status === 429 || /rate limit|too many/i.test(error?.message ?? "");
    return { ok: false, error: limite ? MSG_LIMITE : MSG_LOGIN };
  }
  await limparTentativasDoEmail("login", email);
  return { ok: true, destino: await destinoPosLogin(data.user.id) };
}

/** Sempre responde igual, exista ou não o e-mail. O link do e-mail abre /entrar/senha. */
export async function esqueciSenhaAction(emailBruto: string): Promise<{ ok: true }> {
  if (!supabaseConfigurado()) return { ok: true };
  const email = texto(emailBruto).toLowerCase();
  if (!email) return { ok: true };
  const origem = { email, ip: ipDaRequisicao(await headers()) };
  if (await tentativaBloqueada("esqueci", origem)) return { ok: true };
  await registrarTentativa("esqueci", origem);
  // O link do e-mail volta para /entrar/senha (precisa estar em Redirect URLs no Supabase).
  const h = await headers();
  const base = h.get("origin") ?? process.env.APP_BASE_URL ?? "";
  const { error } = await (await createClient()).auth.resetPasswordForEmail(email, base ? { redirectTo: `${base}/entrar/senha` } : undefined);
  if (error) console.error("[esqueci-senha] envio falhou", { status: error.status });
  return { ok: true };
}

/** O que o link do e-mail trouxe. Três formatos, conforme o modelo de e-mail em uso:
 *  - token: modelo próprio (com SMTP próprio), ?token_hash=…&type=invite|recovery
 *  - codigo: modelo padrão de "esqueci a senha", ?code=… (o verificador ficou num cookie)
 *  - sessao: modelo padrão de convite, #access_token=…&refresh_token=… (só o navegador vê o #) */
export type LinkDoEmail =
  | { modo: "token"; token_hash: string; tipo: string }
  | { modo: "codigo"; codigo: string }
  | { modo: "sessao"; access_token: string; refresh_token: string };

/**
 * Cria a senha a partir do link do e-mail (convite do primeiro acesso ou "esqueci a senha").
 * O link só é usado quando a pessoa envia a senha, então um antivírus de e-mail que abre o link
 * antes não queima o acesso. A sessão fica gravada no cookie e a senha é trocada pelo servidor.
 */
export async function definirSenhaAction(link: LinkDoEmail, senhaBruta: string): Promise<Resultado> {
  if (!supabaseConfigurado()) return { ok: true, destino: "boasVindas" };
  const senha = typeof senhaBruta === "string" ? senhaBruta.slice(0, 200) : "";
  if (senha.length < 8) return { ok: false, error: "A senha precisa de pelo menos 8 caracteres." };

  const marca = link?.modo === "token" ? link.token_hash : link?.modo === "codigo" ? link.codigo : link?.modo === "sessao" ? link.refresh_token : "";
  const origem = { email: texto(marca, 512), ip: ipDaRequisicao(await headers()) };
  if (!origem.email) return { ok: false, error: MSG_LINK };
  if (await tentativaBloqueada("senha", origem)) return { ok: false, error: MSG_LIMITE };

  const auth = (await createClient()).auth;
  let userId: string | null = null;
  if (link.modo === "token") {
    const type = link.tipo === "invite" ? "invite" : link.tipo === "recovery" ? "recovery" : null;
    if (type) {
      const { data } = await auth.verifyOtp({ token_hash: texto(link.token_hash, 512), type });
      userId = data.user?.id ?? null;
    }
  } else if (link.modo === "codigo") {
    const { data } = await auth.exchangeCodeForSession(texto(link.codigo, 512));
    userId = data.user?.id ?? null;
  } else if (link.modo === "sessao") {
    const { data } = await auth.setSession({ access_token: texto(link.access_token, 4096), refresh_token: texto(link.refresh_token, 512) });
    userId = data.user?.id ?? null;
  }
  if (!userId) {
    await registrarTentativa("senha", origem);
    return { ok: false, error: MSG_LINK };
  }

  const troca = await createAdminClient().auth.admin.updateUserById(userId, { password: senha });
  if (troca.error) {
    console.error("[definir-senha] troca falhou", { status: troca.error.status });
    return { ok: false, error: "Não deu para salvar a senha. Tente de novo." };
  }
  return { ok: true, destino: await destinoPosLogin(userId) };
}

/** Prontidão do primeiro acesso: termo de responsabilidade e consentimento de dados de saúde. */
export async function salvarProntidaoAction(respostas: Record<number, "s" | "n">): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabaseConfigurado()) return { ok: true };
  const sessao = await getSessao();
  if (!sessao) return { ok: false, error: "Sua sessão expirou. Entre de novo." };
  const prontidao = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [String(i + 1), respostas[i] === "s" ? "sim" : respostas[i] === "n" ? "nao" : null]),
  );
  if (Object.values(prontidao).includes(null)) return { ok: false, error: "Responda as 7 perguntas." };
  const { error } = await createAdminClient()
    .from("consentimentos")
    .insert([
      { aluno_id: sessao.id, tipo: "responsabilidade", versao: VERSAO_TERMOS, prontidao },
      { aluno_id: sessao.id, tipo: "dados_saude", versao: VERSAO_TERMOS },
    ]);
  if (error) {
    console.error("[prontidao] gravação falhou", { code: error.code });
    return { ok: false, error: "Não deu para salvar. Tente de novo." };
  }
  return { ok: true };
}

export async function sairAction(): Promise<never> {
  if (supabaseConfigurado()) await (await createClient()).auth.signOut();
  redirect("/entrar");
}
