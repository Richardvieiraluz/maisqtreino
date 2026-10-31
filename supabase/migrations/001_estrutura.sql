-- Migration 001 — estrutura inicial do +Q Treino
-- ============================================================================
-- Projeto Supabase NOVO, independente do +Q Pilates. Aplicar manualmente no
-- SQL Editor, inteira, uma vez. Idempotente: rodar de novo não estraga nada.
--
-- Regras de acesso (mesmo modelo do +Q Pilates):
--   * Toda ESCRITA passa pelo servidor do app (service role), nunca pelo
--     navegador. Por isso nenhuma tabela tem policy de INSERT/UPDATE/DELETE.
--   * LEITURA pelo usuário logado só onde precisa: o aluno lê as próprias
--     linhas; o catálogo publicado é lido por qualquer aluno logado; o Master
--     lê tudo. RLS ligada em todas as tabelas.
--   * Papel 'master' NUNCA vem do cadastro: todo usuário nasce 'aluno' e o
--     Master é promovido à mão (ver o fim do arquivo).
--
-- Fora do banco de propósito:
--   * fotos do corpo: ficam só no aparelho (IndexedDB), nunca sobem;
--   * medidas e lembretes: continuam no aparelho nesta primeira versão.
-- ============================================================================

-- ── Funções de apoio ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tocar_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

-- ── perfis: um por usuário do Supabase Auth ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.perfis (
  id             uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text        NOT NULL,
  nome           text        NOT NULL DEFAULT '',
  telefone       text        NULL,
  papel          text        NOT NULL DEFAULT 'aluno' CHECK (papel IN ('aluno', 'master')),
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS perfis_email_idx ON public.perfis (lower(email));

DROP TRIGGER IF EXISTS perfis_atualizado_em ON public.perfis;
CREATE TRIGGER perfis_atualizado_em BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- Master logado? SECURITY DEFINER para a policy não depender da própria RLS de perfis.
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis WHERE id = (SELECT auth.uid()) AND papel = 'master'
  );
$$;

-- Usuário novo no Auth (criado pelo webhook da Eduzz ou pelo Master) ganha perfil de aluno.
-- O nome pode vir dos metadados; o papel nunca.
CREATE OR REPLACE FUNCTION public.criar_perfil_novo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.perfis (id, email, nome)
  VALUES (NEW.id, NEW.email, coalesce(NEW.raw_user_meta_data ->> 'nome', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ao_criar_usuario ON auth.users;
CREATE TRIGGER ao_criar_usuario AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.criar_perfil_novo_usuario();

-- ── produtos e acessos (o que cada aluno comprou) ───────────────────────────

CREATE TABLE IF NOT EXISTS public.produtos (
  id               text          PRIMARY KEY,               -- 'assinatura-mensal', 'programa-gluteo'...
  nome             text          NOT NULL,
  tipo             text          NOT NULL CHECK (tipo IN ('assinatura', 'programa')),
  periodo          text          NOT NULL CHECK (periodo IN ('mensal', 'anual', 'vitalicio')),
  preco            numeric(10,2) NOT NULL CHECK (preco >= 0),
  eduzz_produto_id text          NULL UNIQUE,                -- preenchido quando os produtos existirem na Eduzz
  ativo            boolean       NOT NULL DEFAULT true,
  ordem            smallint      NOT NULL DEFAULT 0,
  criado_em        timestamptz   NOT NULL DEFAULT now(),
  CHECK ((tipo = 'programa') = (periodo = 'vitalicio'))
);

CREATE TABLE IF NOT EXISTS public.acessos (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id           uuid        NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  produto_id         text        NOT NULL REFERENCES public.produtos(id),
  status             text        NOT NULL CHECK (status IN ('ativo', 'pausado', 'cancelado', 'reembolsado')),
  inicio             timestamptz NOT NULL DEFAULT now(),
  valido_ate         timestamptz NULL,                       -- NULL = vitalício (programas)
  eduzz_contrato_id  text        NULL,                       -- assinatura na Eduzz
  eduzz_fatura_id    text        NULL,                       -- última fatura que mexeu neste acesso
  liberado_por       text        NOT NULL DEFAULT 'eduzz' CHECK (liberado_por IN ('eduzz', 'master')),
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, produto_id)
);
CREATE INDEX IF NOT EXISTS acessos_aluno_idx ON public.acessos (aluno_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS acessos_contrato_idx ON public.acessos (eduzz_contrato_id) WHERE eduzz_contrato_id IS NOT NULL;

DROP TRIGGER IF EXISTS acessos_atualizado_em ON public.acessos;
CREATE TRIGGER acessos_atualizado_em BEFORE UPDATE ON public.acessos
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- Tudo que a Eduzz manda fica registrado: auditoria e proteção contra aviso repetido.
CREATE TABLE IF NOT EXISTS public.eventos_eduzz (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chave         text        NOT NULL UNIQUE,                 -- id do evento na Eduzz (idempotência)
  tipo          text        NOT NULL,
  email         text        NULL,
  payload       jsonb       NOT NULL,
  recebido_em   timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz NULL,
  erro          text        NULL
);
CREATE INDEX IF NOT EXISTS eventos_eduzz_pendentes_idx ON public.eventos_eduzz (recebido_em) WHERE processado_em IS NULL;

-- ── catálogo de exercícios (cópia do +Q Pilates, só revisados) ──────────────
-- id = o MESMO uuid do exercício no +Q Pilates, para rastrear e reimportar.
-- Carregado por scripts/importar-catalogo.mts; o app não escreve aqui.

CREATE TABLE IF NOT EXISTS public.exercicios (
  id              uuid        PRIMARY KEY,
  nome            text        NOT NULL,
  modalidade      text        NULL,
  material        text        NULL,
  grupo_muscular  text        NULL,
  video_origem    text        NULL,                          -- endereço no S3 do +Q Pilates
  video_url       text        NULL,                          -- endereço novo (R2), quando migrar
  niveis          smallint[]  NOT NULL CHECK (cardinality(niveis) >= 1 AND niveis <@ ARRAY[0,1,2,3,4,5]::smallint[]),
  categorias      text[]      NOT NULL DEFAULT '{}',
  posicao         text        NULL,
  impacto         text        NULL CHECK (impacto IN ('sem', 'baixo', 'alto')),
  fase            text        NULL,
  musculos        text[]      NULL,
  padroes         text[]      NULL,
  unilateral      boolean     NULL,
  equipamentos    text[]      NULL,
  acessorios      text[]      NOT NULL DEFAULT '{}',
  indicacoes      text[]      NOT NULL DEFAULT '{}',
  idoso           boolean     NOT NULL DEFAULT false,
  treino_minimo   smallint    NULL CHECK (treino_minimo BETWEEN 1 AND 24),
  ativo           boolean     NOT NULL DEFAULT true,         -- false = arquivado lá ou tirado daqui
  importado_em    timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exercicios_niveis_gin       ON public.exercicios USING gin (niveis);
CREATE INDEX IF NOT EXISTS exercicios_categorias_gin   ON public.exercicios USING gin (categorias);
CREATE INDEX IF NOT EXISTS exercicios_equipamentos_gin ON public.exercicios USING gin (equipamentos);
CREATE INDEX IF NOT EXISTS exercicios_indicacoes_gin   ON public.exercicios USING gin (indicacoes);

DROP TRIGGER IF EXISTS exercicios_atualizado_em ON public.exercicios;
CREATE TRIGGER exercicios_atualizado_em BEFORE UPDATE ON public.exercicios
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- Botão "Explicação": texto gerado pela IA, revisado pelo Richard, depois áudio com a voz dele.
CREATE TABLE IF NOT EXISTS public.explicacoes (
  exercicio_id     uuid        PRIMARY KEY REFERENCES public.exercicios(id) ON DELETE CASCADE,
  posicao_inicial  text        NOT NULL,
  movimento        text        NOT NULL,
  cuidado          text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'com_audio')),
  audio_url        text        NULL,
  aprovado_em      timestamptz NULL,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'com_audio' OR audio_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS explicacoes_status_idx ON public.explicacoes (status);

DROP TRIGGER IF EXISTS explicacoes_atualizado_em ON public.explicacoes;
CREATE TRIGGER explicacoes_atualizado_em BEFORE UPDATE ON public.explicacoes
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- ── treinos prontos: vitrine, programas, rápidos e trilhas de lesão ─────────
-- conteudo (jsonb): blocos com exercícios e séries, no formato de lib/tipos.ts.

CREATE TABLE IF NOT EXISTS public.treinos (
  id            text        PRIMARY KEY,                     -- 'gluteo-posterior-07'
  titulo        text        NOT NULL,
  tipo          text        NOT NULL CHECK (tipo IN ('vitrine', 'programa', 'rapido', 'lesao')),
  produto_id    text        NULL REFERENCES public.produtos(id),  -- programa a que pertence
  local         text        NOT NULL CHECK (local IN ('casa', 'condominio', 'academia')),
  nivel         text        NOT NULL CHECK (nivel IN ('iniciante', 'intermediario', 'avancado')),
  duracao_min   smallint    NOT NULL CHECK (duracao_min BETWEEN 5 AND 120),
  regioes       text[]      NOT NULL DEFAULT '{}',
  lesao_regiao  text        NULL,                            -- só tipo 'lesao'
  lesao_fase    smallint    NULL CHECK (lesao_fase BETWEEN 1 AND 4),
  ordem         smallint    NOT NULL DEFAULT 0,               -- ordem dentro do programa ou da trilha
  conteudo      jsonb       NOT NULL,
  publicado     boolean     NOT NULL DEFAULT false,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CHECK ((tipo = 'programa') = (produto_id IS NOT NULL)),
  CHECK ((tipo = 'lesao') = (lesao_regiao IS NOT NULL AND lesao_fase IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS treinos_publicados_idx ON public.treinos (tipo, publicado);

DROP TRIGGER IF EXISTS treinos_atualizado_em ON public.treinos;
CREATE TRIGGER treinos_atualizado_em BEFORE UPDATE ON public.treinos
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- Fileiras da tela Início ("Seu treino de hoje" é fixo e não mora aqui).
CREATE TABLE IF NOT EXISTS public.fileiras_vitrine (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text        NOT NULL,
  estilo        text        NOT NULL DEFAULT 'cards' CHECK (estilo IN ('cards', 'tiles', 'automatica')),
  treino_ids    text[]      NOT NULL DEFAULT '{}',           -- vazio quando a fileira é automática
  ordem         smallint    NOT NULL DEFAULT 0,
  visivel       boolean     NOT NULL DEFAULT true,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS fileiras_vitrine_atualizado_em ON public.fileiras_vitrine;
CREATE TRIGGER fileiras_vitrine_atualizado_em BEFORE UPDATE ON public.fileiras_vitrine
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- ── aluno: quiz, termos, protocolo e histórico ──────────────────────────────

-- Uma linha por vez que o quiz é respondido (refazer o quiz cria outra); vale a mais recente.
CREATE TABLE IF NOT EXISTS public.respostas_quiz (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id   uuid        NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  respostas  jsonb       NOT NULL,                           -- formato de lib/quiz.ts
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS respostas_quiz_aluno_idx ON public.respostas_quiz (aluno_id, criado_em DESC);

-- Termo de responsabilidade e consentimento de dados de saúde (LGPD), com versão e revogação.
CREATE TABLE IF NOT EXISTS public.consentimentos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id     uuid        NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  tipo         text        NOT NULL CHECK (tipo IN ('responsabilidade', 'dados_saude')),
  versao       text        NOT NULL,
  prontidao    jsonb       NULL,                             -- respostas das 7 perguntas, no aceite do termo
  aceito_em    timestamptz NOT NULL DEFAULT now(),
  revogado_em  timestamptz NULL
);
CREATE INDEX IF NOT EXISTS consentimentos_aluno_idx ON public.consentimentos (aluno_id, tipo, aceito_em DESC);

-- Protocolo de 24 treinos montado pela IA para o aluno. Um ativo por vez.
CREATE TABLE IF NOT EXISTS public.protocolos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        uuid        NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  quiz_id         uuid        NULL REFERENCES public.respostas_quiz(id) ON DELETE SET NULL,
  local           text        NOT NULL CHECK (local IN ('casa', 'condominio', 'academia')),
  nivel           text        NOT NULL CHECK (nivel IN ('iniciante', 'intermediario', 'avancado')),
  ativo           boolean     NOT NULL DEFAULT true,
  auditoria       text        NOT NULL DEFAULT 'pendente' CHECK (auditoria IN ('pendente', 'aprovado', 'problema')),
  auditoria_nota  text        NULL,
  criado_em       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS protocolos_um_ativo_idx ON public.protocolos (aluno_id) WHERE ativo;

CREATE TABLE IF NOT EXISTS public.protocolo_treinos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo_id  uuid        NOT NULL REFERENCES public.protocolos(id) ON DELETE CASCADE,
  posicao       smallint    NOT NULL CHECK (posicao BETWEEN 1 AND 24),
  tipo          text        NOT NULL CHECK (tipo IN ('A', 'B', 'C', 'D')),
  titulo        text        NOT NULL,
  duracao_min   smallint    NOT NULL,
  conteudo      jsonb       NOT NULL,
  UNIQUE (protocolo_id, posicao)
);

-- Cada treino feito (do protocolo ou da vitrine).
CREATE TABLE IF NOT EXISTS public.sessoes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id            uuid        NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  protocolo_treino_id uuid        NULL REFERENCES public.protocolo_treinos(id) ON DELETE SET NULL,
  treino_id           text        NULL REFERENCES public.treinos(id) ON DELETE SET NULL,
  iniciada_em         timestamptz NOT NULL DEFAULT now(),
  concluida_em        timestamptz NULL,
  duracao_seg         integer     NULL CHECK (duracao_seg >= 0),
  avaliacao           text        NULL CHECK (avaliacao IN ('facil', 'ideal', 'dificil')),
  teve_dor            boolean     NOT NULL DEFAULT false,
  series              jsonb       NOT NULL DEFAULT '[]',     -- repetições, tempo e carga feitos
  CHECK (protocolo_treino_id IS NOT NULL OR treino_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS sessoes_aluno_idx ON public.sessoes (aluno_id, iniciada_em DESC);
CREATE INDEX IF NOT EXISTS sessoes_concluidas_idx ON public.sessoes (concluida_em) WHERE concluida_em IS NOT NULL;

-- "Trocar exercício" durante o treino: alimenta a lista "Mais trocados" do Master.
CREATE TABLE IF NOT EXISTS public.trocas_exercicio (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id     uuid        NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  sessao_id    uuid        NULL REFERENCES public.sessoes(id) ON DELETE SET NULL,
  exercicio_de uuid        NOT NULL REFERENCES public.exercicios(id),
  exercicio_para uuid      NOT NULL REFERENCES public.exercicios(id),
  motivo       text        NULL CHECK (motivo IN ('sem_equipamento', 'dor', 'dificil', 'outro')),
  criado_em    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trocas_exercicio_de_idx ON public.trocas_exercicio (exercicio_de);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.perfis            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_eduzz     ENABLE ROW LEVEL SECURITY;  -- sem policy: só o servidor
ALTER TABLE public.exercicios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explicacoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fileiras_vitrine  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_quiz    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolo_treinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trocas_exercicio  ENABLE ROW LEVEL SECURITY;

-- Linhas do próprio aluno (ou Master).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['acessos', 'respostas_quiz', 'consentimentos', 'protocolos', 'sessoes', 'trocas_exercicio'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_le_proprio', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (aluno_id = (SELECT auth.uid()) OR public.is_master())',
      t || '_le_proprio', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS perfis_le_proprio ON public.perfis;
CREATE POLICY perfis_le_proprio ON public.perfis FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.is_master());

DROP POLICY IF EXISTS protocolo_treinos_le_proprio ON public.protocolo_treinos;
CREATE POLICY protocolo_treinos_le_proprio ON public.protocolo_treinos FOR SELECT TO authenticated
  USING (
    public.is_master() OR EXISTS (
      SELECT 1 FROM public.protocolos p WHERE p.id = protocolo_id AND p.aluno_id = (SELECT auth.uid())
    )
  );

-- Catálogo: qualquer aluno logado lê o que está publicado. O cadeado é decidido no app
-- (conteúdo bloqueado aparece na vitrine, nunca escondido).
DROP POLICY IF EXISTS produtos_le_ativos ON public.produtos;
CREATE POLICY produtos_le_ativos ON public.produtos FOR SELECT TO authenticated
  USING (ativo OR public.is_master());

DROP POLICY IF EXISTS exercicios_le_ativos ON public.exercicios;
CREATE POLICY exercicios_le_ativos ON public.exercicios FOR SELECT TO authenticated
  USING (ativo OR public.is_master());

DROP POLICY IF EXISTS explicacoes_le_aprovadas ON public.explicacoes;
CREATE POLICY explicacoes_le_aprovadas ON public.explicacoes FOR SELECT TO authenticated
  USING (status <> 'pendente' OR public.is_master());

DROP POLICY IF EXISTS treinos_le_publicados ON public.treinos;
CREATE POLICY treinos_le_publicados ON public.treinos FOR SELECT TO authenticated
  USING (publicado OR public.is_master());

DROP POLICY IF EXISTS fileiras_le_visiveis ON public.fileiras_vitrine;
CREATE POLICY fileiras_le_visiveis ON public.fileiras_vitrine FOR SELECT TO authenticated
  USING (visivel OR public.is_master());

-- ── Produtos de partida (preços de lib/config.ts) ───────────────────────────
-- Anual: 12 × 39,90. eduzz_produto_id fica vazio até os produtos existirem na Eduzz.

INSERT INTO public.produtos (id, nome, tipo, periodo, preco, ordem) VALUES
  ('assinatura-mensal', 'Assinatura mensal',  'assinatura', 'mensal',    49.90, 1),
  ('assinatura-anual',  'Assinatura anual',   'assinatura', 'anual',    478.80, 2),
  ('programa-gluteo',   'Programa Glúteo',    'programa',   'vitalicio', 49.90, 3),
  ('programa-lombar',   'Programa Lombar',    'programa',   'vitalicio', 49.90, 4),
  ('desafio-21-dias',   'Desafio de 21 dias', 'programa',   'vitalicio', 49.90, 5)
ON CONFLICT (id) DO NOTHING;

-- ── Promover o Master (rodar à mão depois do primeiro login do Richard) ────
-- UPDATE public.perfis SET papel = 'master' WHERE lower(email) = 'richardvieiraluz@gmail.com';
