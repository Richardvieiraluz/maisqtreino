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

## Estados do aluno

`assinante` (tudo liberado), `programa` (programa comprado + 1ª semana do protocolo; resto com cadeado),
`pausada` (só histórico, leitura). Conteúdo bloqueado aparece na vitrine, nunca escondido.

## Próximas etapas

Supabase (projeto novo), login, webhook da Eduzz, importação do catálogo do +Q Pilates (só exercícios com
`revisado = true`), quiz, Meu plano, Evolução, Perfil, Oferta, Master, stories, voz guia (ElevenLabs).
