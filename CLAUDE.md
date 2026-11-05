# CLAUDE.md

Guia para o Claude Code trabalhar neste repositório.

## O que é

+Q Treino: app web de treino (PWA, celular primeiro) para pessoas comuns, vendido pelo Instagram @maisqtreino.
Treinos prontos, montados por Richard Vieira (profissional de educação física). O aluno nunca monta treino.
Sistema independente do +Q Pilates: copia de lá o catálogo de exercícios, a classificação revisada e a
arquitetura da IA de montagem (lib/ai-treino/v2), sem ligação em tempo real entre os dois.

Português do Brasil em tudo: interface, código de domínio, comentários e commits.

## Comandos

```bash
npm run dev     # servidor de desenvolvimento
npm run build   # build de produção
npm run lint    # checagem de tipos (tsc --noEmit)
```

## Design

A referência de design está em `docs/design/handoff-README.md` (pacote de handoff do Claude Design, alta
fidelidade). Regras que não podem quebrar:

- Fundo branco, tinta `#111111`, **um único destaque amarelo forte por tela** (`#FFE600`). Elementos de
  sistema não contam: barra da aba ativa, caixa "+Q" do logo, texto amarelo dos selos pretos, ✓ de
  concluído, segmento atual das barras.
- Vermelho `#C8202A` **só dentro do mapa muscular**. Avisos de dor ou erro: branco com borda preta de 3 px.
- Raio 0, sem sombra, sem gradiente, sem emoji. Fonte única Archivo (variável, com eixo de largura),
  hospedada no próprio app via `@fontsource-variable/archivo`.
- Tela preta = fechamento ou resumo. Tela amarela = só a oferta da assinatura.
- Texto: nunca "low ticket" (usar "programa"), sem promessa de prazo ou resultado, sem motivacional genérico.

Tokens e classes da marca em `app/globals.css`. Peças reutilizáveis em `components/marca.tsx`.

## Estrutura

- `app/`: rotas (App Router). `/` Início, `/quiz`, `/plano`, `/detalhe/[id]` (protocolo-NN ou
  programa-gluteo), `/treino/[id]` sessão de treino em tela cheia,
  `/entrar` (+ `/esqueci`), `/evolucao` (+ `/fotos`, `/medidas`), `/stories`, `/oferta`, `/reativar`,
  `/perfil` (+ `/perfil/[sub]`: dados, equipamentos, lembretes, faq, termos), `/busca`, `/ver-tudo?fileira=`,
  `/lesoes?regiao=`, e o painel `/master/*` (painel, funil, alunos, ficha, quem parou, protocolos, explicações, vitrine).
- `components/`: telas e componentes. `inicio/`, `quiz/`, `plano/`, `detalhe/`, `treino/`, `busca/`,
  `lesoes/`, `perfil/`, `master/` (`LayoutMaster` + `TelasMaster`).
- `lib/quiz.ts`: perguntas, áreas do mapa de regiões e respostas salvas no aparelho (localStorage) até
  existir banco. `lib/plano.ts`: **protocolo e programa de exemplo**.
- `lib/tipos.ts`: tipos do domínio. `lib/sessao.ts`: estado da sessão de treino (reducer).
  `lib/midia.ts`: boneco, foto e vídeo por nome. `lib/dados-exemplo.ts`: **dados fictícios** do protótipo.
- `lib/armazenamento.ts`: dados pequenos no aparelho (lembretes, prontidão, medidas). `lib/fotos-corpo.ts`:
  fotos do corpo no IndexedDB, nunca enviadas. `lib/stories.ts`: desenho do stories em canvas.
  `lib/config.ts`: treinador, CREF e preços. `lib/catalogo-exemplo.ts` e `lib/master-exemplo.ts`: **dados
  fictícios** da busca e do Master.
- Rotas server (`page.tsx`) não podem ler constantes de módulos `"use client"`: chegam como referência vazia.
- `lib/demo.ts`: controles de demonstração pela URL (`?estado=programa|pausada`, `?sexo=masculino`,
  `?dia=descanso`, `?descanso=faixa`). Sai quando o estado real do aluno vier do banco.
- `public/assets/`: bonecos do mapa muscular (20 de 58), fotos recortadas e vídeos de exemplo.

## Banco (Supabase)

Migrations em `supabase/migrations/*.sql`, aplicadas **à mão** no SQL Editor (sem CLI), em ordem, com o
mesmo padrão do +Q Pilates: idempotentes, número seguinte, `<n>a` para correção logo em seguida.
Toda escrita passa pelo servidor (service role); RLS só libera leitura (aluno lê as próprias linhas,
catálogo publicado para qualquer logado, Master lê tudo via `is_master()`). Papel `master` nunca vem do
cadastro: é promovido à mão. `exercicios.id` é o mesmo uuid do +Q Pilates. Fotos do corpo nunca sobem.

## Login

Supabase Auth com e-mail e senha, tudo por Server Action em `app/entrar/actions.ts` (cookie HttpOnly,
sem cliente do Supabase no navegador; não reintroduzir `createBrowserClient`). Clientes em `lib/supabase/`:
`server.ts` (sessão do usuário), `admin.ts` (chave de serviço, `server-only`). `getSessao()` em `lib/auth.ts`
(cache só da requisição) devolve papel e estado; a regra do estado é `lib/acesso.ts`. `proxy.ts` manda para
`/entrar` quem não está logado; `app/master/layout.tsx` barra quem não é master. Primeiro acesso e esqueci a
senha chegam por e-mail em `/entrar/senha`, em três formatos aceitos: `?token_hash=&type=` (modelo próprio),
`?code=` (esqueci a senha padrão) e `#access_token=` (convite padrão, encaminhado pela tela `/entrar`). Limite de tentativas em
`lib/limite-tentativas.ts` (migration 002). **Sem as variáveis do Supabase o app roda em modo demonstração**
(qualquer login entra). Variáveis e passo a passo: `docs/configurar-login.md`.

## Conta nas telas

`app/layout.tsx` lê a sessão e o último quiz e entrega a conta às telas por `ProvedorConta` (`lib/conta.tsx`).
`useConta()` é null no modo demonstração. `useRespostasSalvas()` (lib/quiz.ts) usa o quiz da conta e grava
cada versão em `respostas_quiz` (`lib/acoes/conta.ts`); sem conta, usa o aparelho. `useDemo().estado` vem da
compra real para aluno (`sem_acesso` vira cadeado e a Início manda para /oferta); o Master continua podendo
usar `?estado=`. `useAlunoExibido()` dá nome, e-mail e iniciais.

Master real: `lib/dados/master.ts` lê o banco (de 1000 em 1000), `lib/master-calculos.ts` faz as contas
(funções puras), as rotas `app/master/*` passam os dados e os componentes de `TelasMaster` usam os exemplos
quando não recebem nada. Ações (convidar aluno, liberar acesso, reenviar login) em `lib/acoes/master.ts`,
cada uma confere o papel master de novo. Protocolos (avaliações, mais trocados, auditoria), Explicações
(texto pela IA em lote de 8, revisão e aprovação) e Vitrine (ordem e visibilidade das fileiras da Início,
`lib/vitrine.ts`) leem e gravam no banco por `lib/dados/master-conteudo.ts`. Áudio das explicações entra com a voz guia.

## Eduzz

Webhook em `app/api/webhooks/eduzz/route.ts` (fora do proxy; confere `x-signature` = HMAC-SHA256 com
`EDUZZ_WEBHOOK_SECRET`, hex ou base64). Leitura dos avisos e regras de acesso em `lib/eduzz.ts` (puras);
gravação em `lib/dados/eduzz.ts` (idempotente por `eventos_eduzz.chave`; 500 só para erro passageiro).
Produto da Eduzz liga ao app por `produtos.eduzz_produto_id`. O registro guarda só um resumo, sem CPF,
endereço ou telefone. Passo a passo: `docs/configurar-eduzz.md`.

## IA de montagem

Ver `docs/ia-treino.md`. Motor da v2 do +Q Pilates copiado igual em `lib/ia-treino/v2` (não editar
lá dentro: a lógica do +Q Treino fica em `lib/ia-treino/aluno.ts`, `gerar-aluno.ts`, `para-sessao.ts`).
Fila e protocolo em `lib/dados/treinos.ts`, geração em `POST /api/ia/proximo` (um treino por chamada),
gerador em segundo plano `lib/geracao.tsx`. Chave `ANTHROPIC_API_KEY` e modelo `ANTHROPIC_MODEL`.
Testes sem banco: `npm run simular`, `npm run teste:fila`. O cliente do banco só troca por um falso
com `MAISQ_TESTE=1`.

## Treino do aluno (dados reais)

Meu plano, Detalhe, execução, Evolução e sequência leem o banco quando há aluno logado; Master e demonstração
continuam com o exemplo. Execução: carga anotada por série (`comCarga` em exercícios com halter, barra,
máquina...), última e melhor carga lidas de `sessoes.series` (`cargasDoAluno`), troca de exercício com os
substitutos da v2 (`lib/ia-treino/trocas-aluno.ts`) gravada em `trocas_exercicio`, explicação aprovada
mostrada em texto. Adaptação (`lib/ia-treino/adaptacao.ts`, regras em `docs/ia-treino.md`): avaliação,
dor por exercício (registro `serie: 0, dor` em `sessoes.series`), trocas e carga ajustam os próximos treinos. Evolução: contas puras em `lib/evolucao-calculos.ts` (sequência não quebra dentro do
descanso do plano: 7 / dias por semana). LGPD em `lib/acoes/lgpd.ts`: baixar dados, revogar dados de saúde
(pausa a geração) e excluir conta (apaga o usuário; o resto cai em cascata). Testes sem banco:
`npx tsx scripts/teste-para-sessao.mts`, `scripts/teste-evolucao.mts`, `scripts/teste-explicacoes.mts`.

## Estados do aluno

`assinante` (tudo liberado), `programa` (programa comprado + 1ª semana do protocolo; resto com cadeado),
`pausada` (só histórico, leitura). Conteúdo bloqueado aparece na vitrine, nunca escondido.

## Próximas etapas

Links de checkout na Oferta, SMTP próprio, produtos da Eduzz, vídeos no R2, voz guia e áudio das
explicações (ElevenLabs), treinos prontos da vitrine (programas, rápidos, lesões).
