// Chaves do Supabase vêm das variáveis de ambiente (Vercel e .env.local), nunca do código.
// cleanEnv tira BOM, quebra de linha e qualquer caractere fora do ASCII visível: chave colada
// num painel com lixo invisível derruba o fetch com "Header value is not a valid ByteString".
export function cleanEnv(v: string | undefined): string {
  return (v ?? "").replace(/[^\x20-\x7E]/g, "");
}

export const supabaseUrl = () => cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnon = () => cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Sem as chaves, o app roda no modo demonstração (qualquer login entra, dados de exemplo). */
export function supabaseConfigurado(): boolean {
  return !!supabaseUrl() && !!supabaseAnon();
}
