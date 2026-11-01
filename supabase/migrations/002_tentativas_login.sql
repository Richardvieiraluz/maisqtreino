-- Migration 002 — limite de tentativas de login e de "esqueci a senha"
-- ============================================================================
-- O login roda no servidor da Vercel, então para o Supabase todas as tentativas
-- vêm do mesmo lugar e o limite por IP dele não separa um visitante do outro.
-- lib/limite-tentativas.ts conta aqui, por e-mail e por IP do visitante, e
-- bloqueia ao passar do limite (até com a senha certa). Nunca grava e-mail nem
-- IP: só um HMAC. Mesmo modelo da migration 091 do +Q Pilates.
--
-- Só o servidor lê e grava (RLS ligada, nenhuma policy). Sem esta tabela o app
-- conta em memória (limita menos, nunca libera sem limite).
-- Limpeza opcional: DELETE FROM public.tentativas_login WHERE criado_em < now() - interval '1 day';
-- Idempotente. Aplicar manualmente no SQL Editor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tentativas_login (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chave     text        NOT NULL,
  tipo      text        NOT NULL CHECK (tipo IN ('login', 'esqueci', 'senha')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tentativas_login_chave_idx ON public.tentativas_login (chave, tipo, criado_em);

ALTER TABLE public.tentativas_login ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tentativas_login FROM anon, authenticated;
