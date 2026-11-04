-- Migration 003 — exercicios.revisado
-- ============================================================================
-- Decisão do Richard (04/11/2026): o +Q Treino recebe TODOS os exercícios já
-- classificados no +Q Pilates (menos as pastas mqpilates, mqreformer e pilates),
-- revisados ou não. Esta coluna guarda se o exercício já foi revisado lá, para a
-- IA e o Master poderem dar preferência ou filtrar depois.
-- Idempotente. Aplicar manualmente no SQL Editor, antes dos arquivos de supabase/dados.
-- ============================================================================

ALTER TABLE public.exercicios ADD COLUMN IF NOT EXISTS revisado boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS exercicios_modalidade_idx ON public.exercicios (modalidade);
