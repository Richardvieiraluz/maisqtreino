import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDaSessao } from "@/lib/supabase/cookie-sessao";
import { supabaseAnon, supabaseConfigurado, supabaseUrl } from "@/lib/supabase/env";

// Middleware do Next 16: renova a sessão do Supabase e manda para /entrar quem não está logado.
// Sem as chaves do Supabase (modo demonstração), não faz nada.
export async function proxy(request: NextRequest) {
  if (!supabaseConfigurado()) return NextResponse.next();

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl(), supabaseAnon(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => resposta.cookies.set(name, value, cookieDaSessao(options)));
      },
    },
  });

  // getUser antes de qualquer decisão: é ele que renova o token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;
  const rotaDeEntrada = pathname === "/entrar" || pathname.startsWith("/entrar/");
  if (!user && !rotaDeEntrada) return NextResponse.redirect(new URL("/entrar", request.url));

  // Logado abrindo o login (página inteira, GET) vai para o app. As boas-vindas (?etapa=) e a tela
  // de senha continuam abertas: fazem parte do primeiro acesso, com a sessão já criada.
  const navegacao = (request.headers.get("sec-fetch-mode") ?? "navigate") === "navigate";
  const loginPuro = (pathname === "/entrar" && !searchParams.has("etapa")) || pathname === "/entrar/esqueci";
  if (user && loginPuro && request.method === "GET" && navegacao) return NextResponse.redirect(new URL("/", request.url));

  return resposta;
}

export const config = {
  // Fora do proxy: arquivos estáticos, assets, manifest e a API (cada rota da API se autentica sozinha).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|assets/|manifest\\.webmanifest|.*\\.(?:png|jpg|svg|webp|mp4|woff2?)$).*)"],
};
