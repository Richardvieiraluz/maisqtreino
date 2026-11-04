-- Migration 004 — geração dos treinos do aluno pela IA
-- ============================================================================
-- Opção A (Richard, 04/11/2026): a IA monta os treinos de cada aluno. O protocolo
-- guarda o perfil que saiu do quiz; cada treino nasce 'pendente' e é montado um
-- por vez (o próximo depende do histórico dos anteriores), sempre alguns treinos
-- à frente do que o aluno já fez.
--
-- protocolo_treinos: titulo/tipo/duracao/conteudo ficam vazios até ficar 'pronto'.
-- status: pendente → gerando → pronto | erro (até 3 tentativas).
-- diagnostico: tokens, avisos e erros da geração (Master e controle de custo).
--
-- Idempotente. Aplicar manualmente no SQL Editor.
-- ============================================================================

ALTER TABLE public.protocolos ADD COLUMN IF NOT EXISTS perfil        jsonb    NULL;
ALTER TABLE public.protocolos ADD COLUMN IF NOT EXISTS familia       text     NULL;
ALTER TABLE public.protocolos ADD COLUMN IF NOT EXISTS total_treinos smallint NULL;

ALTER TABLE public.protocolo_treinos ALTER COLUMN tipo        DROP NOT NULL;
ALTER TABLE public.protocolo_treinos ALTER COLUMN titulo      DROP NOT NULL;
ALTER TABLE public.protocolo_treinos ALTER COLUMN duracao_min DROP NOT NULL;
ALTER TABLE public.protocolo_treinos ALTER COLUMN conteudo    DROP NOT NULL;

ALTER TABLE public.protocolo_treinos ADD COLUMN IF NOT EXISTS status      text        NOT NULL DEFAULT 'pendente';
ALTER TABLE public.protocolo_treinos ADD COLUMN IF NOT EXISTS tentativas  smallint    NOT NULL DEFAULT 0;
ALTER TABLE public.protocolo_treinos ADD COLUMN IF NOT EXISTS erro        text        NULL;
ALTER TABLE public.protocolo_treinos ADD COLUMN IF NOT EXISTS diagnostico jsonb       NULL;
ALTER TABLE public.protocolo_treinos ADD COLUMN IF NOT EXISTS iniciado_em timestamptz NULL;
ALTER TABLE public.protocolo_treinos ADD COLUMN IF NOT EXISTS gerado_em   timestamptz NULL;
ALTER TABLE public.protocolo_treinos ADD COLUMN IF NOT EXISTS criado_em   timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.protocolo_treinos DROP CONSTRAINT IF EXISTS protocolo_treinos_status_check;
ALTER TABLE public.protocolo_treinos ADD CONSTRAINT protocolo_treinos_status_check
  CHECK (status IN ('pendente', 'gerando', 'pronto', 'erro'));
ALTER TABLE public.protocolo_treinos DROP CONSTRAINT IF EXISTS protocolo_treinos_pronto_check;
ALTER TABLE public.protocolo_treinos ADD CONSTRAINT protocolo_treinos_pronto_check
  CHECK (status <> 'pronto' OR (conteudo IS NOT NULL AND titulo IS NOT NULL AND tipo IS NOT NULL AND duracao_min IS NOT NULL));

CREATE INDEX IF NOT EXISTS protocolo_treinos_fila_idx ON public.protocolo_treinos (protocolo_id, posicao) WHERE status IN ('pendente', 'gerando', 'erro');

-- O aluno só enxerga treino pronto (a RLS de leitura continua a da 001; esta policy a substitui).
DROP POLICY IF EXISTS protocolo_treinos_le_proprio ON public.protocolo_treinos;
CREATE POLICY protocolo_treinos_le_proprio ON public.protocolo_treinos FOR SELECT TO authenticated
  USING (
    public.is_master() OR (status = 'pronto' AND EXISTS (
      SELECT 1 FROM public.protocolos p WHERE p.id = protocolo_id AND p.aluno_id = (SELECT auth.uid())
    ))
  );
