import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cookieDaSessao } from "./cookie-sessao";
import { supabaseAnon, supabaseUrl } from "./env";

/** Cliente com a sessão do usuário logado (respeita a RLS). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnon(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, cookieDaSessao(options)));
        } catch {
          // Chamado de um Server Component: quem renova a sessão é o proxy.ts.
        }
      },
    },
  });
}
