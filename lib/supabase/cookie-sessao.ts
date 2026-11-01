// O cookie da sessão é gravado só pelo servidor e nunca é legível por JavaScript (HttpOnly).
// Login, senha e saída rodam em Server Actions (app/entrar/actions.ts): o navegador não precisa
// do token, e um XSS não consegue ler a sessão. Mesmo modelo do +Q Pilates.
import type { CookieOptions } from "@supabase/ssr";

export function cookieDaSessao(options: CookieOptions | undefined): CookieOptions {
  return { ...options, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" };
}
