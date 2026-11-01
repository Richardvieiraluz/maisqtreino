import "server-only";
import { cache } from "react";
import { estadoDosAcessos, type EstadoAluno, type LinhaAcesso } from "./acesso";
import { createAdminClient } from "./supabase/admin";
import { supabaseConfigurado } from "./supabase/env";
import { createClient } from "./supabase/server";

export interface Sessao {
  id: string;
  email: string;
  nome: string;
  papel: "aluno" | "master";
  estado: EstadoAluno;
  programas: string[];
  /** Já aceitou o termo de responsabilidade (passou pela prontidão). */
  aceitouTermo: boolean;
}

/**
 * Quem está logado, nesta requisição. cache() do React: vale só dentro de uma requisição,
 * então uma compra ou pausa nova aparece no próximo carregamento. Não trocar por cache persistente.
 * Sem Supabase configurado (modo demonstração), devolve null.
 */
export const getSessao = cache(async (): Promise<Sessao | null> => {
  if (!supabaseConfigurado()) return null;
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const [perfil, acessos, termo] = await Promise.all([
    admin.from("perfis").select("nome, email, papel").eq("id", user.id).maybeSingle(),
    admin.from("acessos").select("produto_id, status, valido_ate, produtos(tipo)").eq("aluno_id", user.id),
    admin.from("consentimentos").select("id").eq("aluno_id", user.id).eq("tipo", "responsabilidade").is("revogado_em", null).limit(1),
  ]);
  if (perfil.error || acessos.error) console.error("[sessao] leitura falhou", { perfil: perfil.error?.code, acessos: acessos.error?.code });

  const linhas: LinhaAcesso[] = (acessos.data ?? []).map((a) => {
    const produto = a.produtos as unknown as { tipo: LinhaAcesso["tipo"] } | null;
    return { produto_id: a.produto_id, status: a.status, valido_ate: a.valido_ate, tipo: produto?.tipo ?? "programa" };
  });
  const { estado, programas } = estadoDosAcessos(linhas);

  return {
    id: user.id,
    email: perfil.data?.email ?? user.email ?? "",
    nome: perfil.data?.nome ?? "",
    papel: perfil.data?.papel === "master" ? "master" : "aluno",
    estado,
    programas,
    aceitouTermo: (termo.data ?? []).length > 0,
  };
});
