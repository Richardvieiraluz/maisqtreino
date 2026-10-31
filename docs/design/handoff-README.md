# Handoff: +Q Treino — app do aluno (PWA) e Master

## Visão geral
App web instalável (PWA), celular primeiro (390 px), de treinos prontos montados por Richard Vieira (CREF 169641-G/SP). O aluno compra um programa ou a assinatura, responde um quiz de 10 perguntas, recebe um protocolo de 24 treinos ajustado ao nível e aos equipamentos dele e navega por uma vitrine estilo Netflix. Também inclui o Master, o painel gerencial do Richard.

## Sobre os arquivos
Os arquivos `.dc.html` deste pacote são **referências de design feitas em HTML**: protótipos que mostram aparência e comportamento. **Não são código de produção.** A tarefa é recriar essas telas no ambiente do projeto (React, Vue, Next.js etc.) usando os padrões dele. Se ainda não houver projeto, sugerimos Next.js ou Vite + React como PWA, com service worker para instalação e notificações.

Para abrir: sirva a pasta com um servidor estático (`npx serve .`) e abra `Q Treino - Prototipo.dc.html`. Todos os estilos são inline. A lógica de cada tela está no `<script data-dc-script>` de cada arquivo (`renderVals()` = dados e handlers da tela).

## Fidelidade
**Alta fidelidade.** Cores, tipografia, espaçamentos, textos e interações são finais. Recriar pixel a pixel.

## Identidade (regras que não podem quebrar)
- Fundo branco `#FFFFFF`, tinta `#111111`, **um único amarelo** `#FFE600`.
- **Regra do amarelo:** um único destaque forte por tela. Normalmente é a palavra destacada no título; na oferta, a tela inteira; nas telas sem título destacado, o botão de assinar ou reativar.
  - **Elementos de sistema, que não contam:** a barra da aba ativa, a caixa "+Q" do logo, o texto amarelo dos selos pretos (nível, RECORDE, HOJE, AGORA, SÓ VOCÊ VÊ), o ✓ de concluído, o segmento atual das barras segmentadas e o destaque do item atual em grades e listas de progresso.
  - **Sem destaque forte:** quando o conteúdo está bloqueado (pausada ou sem assinatura), a palavra do título fica sem amarelo e o destaque passa para o botão de assinar ou reativar.
  - **O que mudou nesta revisão:** a medalha conquistada passou a ser branca (com borda preta em fundo claro), e "MEDALHA NOVA" ficou cinza `#B5B5B0`. O ponto final do gráfico de carga ficou branco com borda preta. O botão da faixa de lesões no Início ficou sem palavra amarela. As séries concluídas do modo por tempo ficaram em cinza `#E2E1DC`. Os selos amarelos do Master passaram a ser selos pretos. O botão do toggle de lembretes ficou branco.
- Vermelho `#C8202A` **só dentro do mapa muscular**. Nunca em botão, texto ou alerta. Avisos de dor ou erro: fundo branco, borda preta de 3 px, ícone "!" em traço.
- Proibido: lilás, azul-marinho, azul-petróleo, gradientes, sombras, cantos arredondados (raio 0 em tudo, exceto o ✓ circular e o avatar), emoji e ícones decorativos.
- Tela preta = fechamento ou resumo. Tela amarela = só a oferta da assinatura.
- Sobre amarelo, texto preto. Sobre preto, texto branco e destaque em amarelo.
- Fonte única **Archivo** (Google Fonts, eixo de largura `wdth 62..125`). Sem itálico e sem segunda fonte.
- Proibido no texto: "low ticket" (usar "programa"), promessa de prazo ou resultado, depoimento inventado, "transforme sua vida", "sem desculpas", "projeto verão", motivacional genérico.

## Design tokens
```css
:root{
  --bg:#FFFFFF; --ink:#111111; --accent:#FFE600; --muscle:#C8202A;
  --ink-2:#5C5C5C;        /* rótulos, legendas, contadores */
  --line:#D6D5D0;         /* divisórias de lista */
  --track:#E2E1DC;        /* progresso pendente, desabilitado, card com cadeado */
  --bg-soft:#F4F3EE;      /* Perfil, Master */
  --ink-on-dark-2:#B5B5B0;/* apoio em fundo preto */
  --body:#1E1E20;         /* silhueta do boneco */
  --font:'Archivo',system-ui,sans-serif;
  --radius:0; --border:1px solid #111; --border-strong:3px solid #111;
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:24px; --space-6:32px; --space-7:48px;
  --margin-screen:20px;
}
```

### Tipografia
| Papel | Peso / largura (`font-stretch`) | Tamanho | Extra |
|---|---|---|---|
| Título de capa | 850 / 66–70% | 44–56 px | caixa alta, `letter-spacing:-0.02em`, `line-height:.9` |
| Título de tela | 850 / 70% | 32–40 px | caixa alta, -0.02em, `line-height:.92` |
| Nome de exercício / card | 850 / 72–78% | 16–26 px | caixa alta, -0.015em |
| Número grande (série, timer, sequência) | 900 / 65% | 48–64 px | -0.02em |
| Texto corrido | 400–500 (negrito 700–800) / 100% | 15–17 px | `line-height:1.45` |
| Rótulo / sobretítulo | 700 / 100% | 11–12 px | caixa alta, `letter-spacing:.09em`, cor `#5C5C5C` |
| Assinatura (logo) | 900 / 75% | 14 px | "+Q" em caixa amarela `padding:3px 5px` + "TREINO" |

### Componentes
- **Botão primário:** fundo `#111`, texto branco 800 caixa alta 14 px `letter-spacing:.08em`, altura 52 px, raio 0. Desabilitado: fundo `#E2E1DC`.
- **Botão de destaque:** fundo `#FFE600`, texto `#111`, borda 2 px `#111`. Só para comprar, assinar ou reativar.
- **Botão secundário:** fundo branco, borda 2 px `#111`.
- **Card de opção (quiz, avaliação):** borda 1 px preta. Selecionado: borda 3 px (reduzir o padding em 2 px para não pular) e ✓ amarelo à direita.
- **✓ concluído:** círculo `#FFE600`, borda 3 px `#111`, ✓ preto 900.
- **Selo:** caixa preta, texto amarelo 800 caixa alta 9–10 px `letter-spacing:.09em`, `padding:4px 6px` (nível, RECORDE, NOVO, HOJE, PRÓXIMO, SÓ VOCÊ VÊ).
- **Barra segmentada:** altura 10 px, gap 6 px. Feito `#111`, atual `#FFE600`, pendente `#E2E1DC`.
- **Contador:** "02 / 06", 13 px 700, `#5C5C5C`, canto superior direito.
- **Lista da marca:** linhas de 1 px `#D6D5D0`, a última com 3 px `#111`. Rótulo à esquerda (14 px `#5C5C5C`), valor à direita (18–20 px 850/76%).
- **Bloco "O ajuste:":** linha preta de 3 px acima, `padding-top:10px`, rótulo em negrito.
- **Aviso:** fundo branco, borda 3 px `#111`, círculo "!" de 24 px com traço de 2 px.
- **Cadeado:** traço preto de 2 px (alça arredondada + corpo retangular). Card bloqueado com fundo `#E2E1DC` e nome em `#5C5C5C`.
- **Medalha:** losango (quadrado girado 45°). Conquistada: preto com borda 3 px preta em fundo claro; branco com borda branca em fundo preto. Bloqueada: branco com borda 2 px `#D6D5D0`.
- **Rodapé de abas:** 64 px, borda superior 1 px preta, 4 abas. Ativa: texto 800 `#111` + barra amarela de 28×4 px. Inativa: 500 `#5C5C5C`.
- **Toque mínimo:** 44 px.

## Estados do aluno
| Estado | Liberado | Com cadeado | Toque no cadeado |
|---|---|---|---|
| Comprou um programa | Programa inteiro + 1ª semana do protocolo | Resto da vitrine e do protocolo | Oferta com 50% no 1º mês (R$ 24,95) |
| Assinante (mensal ou anual) | Tudo | Nada | — |
| Assinatura pausada | Histórico, fotos e medidas (só leitura) | Todos os treinos | Tela de reativação |

Conteúdo bloqueado **aparece** na vitrine, nunca escondido.

## Preços
- **Anual:** R$ 39,90/mês (12 × R$ 39,90, cobrado por ano). Selo "−R$ 120 NO ANO". Pré-selecionado.
- **Mensal:** R$ 49,90/mês. Para quem tem programa: R$ 24,95 no 1º mês.
- Checkout e cancelamento pela Eduzz.

## Telas
Cada tela vive num arquivo. Abra direto com a prop `screen` ou pelo protótipo.

**Primeiro acesso** (`QTreinoR3`, `QTreinoR5`): Login (e-mail + senha, sem cadastro aberto) → Esqueci a senha (link de 1 h, reenviar com contagem de 59 s) → Boas-vindas (foto, "Você abre e segue.", CREF) → Prontidão PAR-Q (7 sim/não + 2 aceites obrigatórios: termo e LGPD; qualquer "sim" mostra aviso de liberação médica) → Instalar (iPhone/Android, 3 passos) → Lembrete (horário ±30 min, dias da semana) → Quiz.

**Quiz** (`QTreinoR2`): 10 perguntas, uma por tela, barra de 10 segmentos, sem pular. Escolha única avança sozinha após 280 ms; múltipla escolha mostra "Continuar". Ordem: sexo, faixa etária, objetivo, nível, local, equipamentos (academia completa / lista com fotos / mandar fotos → câmera → analisando → "Encontramos: … Confere?" + aviso de que a foto é apagada), dias (2–7), tempo (20/40/60), regiões (toque no boneco frente e costas; selecionado fica vermelho), dores (múltipla, "Nenhuma" exclusiva). Resultado: tela preta, "Seu plano está pronto." com "pronto" em amarelo, lista nível/dias/tempo/local/foco e grade dos 24 treinos (programa: só a semana 1 liberada).

**Início** (`QTreinoApp`): assinatura, sequência de dias (número 34 px 900/65%), avatar que leva ao Perfil; busca; "Seu treino de hoje" (vídeo em loop, mapa muscular no canto, nome com uma palavra em amarelo, duração/exercícios/local, selo de nível, COMEÇAR); estado de dia de descanso ("Hoje o músculo recupera.", próximo treino); fileiras horizontais (Continue de onde parou, Programas, Treino em casa, Treino na academia, Por material, Por modalidade, Por região, Lesões em bloco preto, Rápidos 10/15/20). Card 148×184 px com foto, mapa pequeno (56×47), ✓ ou cadeado.

**Busca e Ver tudo** (`QTreinoR5`): a busca retorna **treinos**, nunca exercícios soltos, e mostra o motivo ("Tem: Cadeira extensora"). Ver tudo: grade de 2 colunas com filtros por nível, duração e local.

**Detalhe do treino** (`QTreinoR2`): título com palavra amarela, duração, nível, local, equipamentos, mapa muscular do treino, lista "01 · nome · 4 × 12-10-10-8", ordem sugerida nos programas, Começar treino (ou Assinar/Reativar se bloqueado).

**Meu plano** (`QTreinoR2`): protocolo 1–24 em grade (4 por semana) ou lista; feitos com ✓, atual em amarelo, bloqueados com cadeado; barra 1–24; programas comprados com o próximo destacado; "Mudei de local ou de equipamento" (atualiza só os equipamentos).

**Execução** (`QTreinoApp`, tela cheia sem abas): barra com um segmento por exercício, contador, fechar; rótulo do grupo muscular, nome, vídeo do Richard em loop (sem áudio, `object-fit:contain` sobre branco) com o boneco no canto; Voz guia liga/desliga; Explicação (~15 s de áudio).
- **Repetição:** linhas de série (número 28 px, alvo, carga pré-preenchida com a anterior, ✓ 44 px).
- **Tempo:** cronômetro de 64 px + barra + séries.
- **Descanso:** tela cheia ou faixa inferior: contagem grande, +15 s, Pular, "A seguir" com miniatura.
- **Recorde:** carga acima da melhor marca mostra o selo RECORDE na hora.
- **Menu ⋯:** trocar por um mais fácil (até 5 opções com foto) e Senti dor (leve: trocar ou reduzir; forte: "PARE AGORA", encerrar e procurar um profissional).

**Fim do treino** (`QTreinoApp`, `QTreinoR3`): Avaliação Fácil/Ideal/Difícil (ajusta a carga do próximo treino) → Resumo preto ("Treino feito." com "feito" em amarelo; duração, exercícios, volume e recordes; mapa; sequência; medalha nova) → Stories 1080×1920 em 3 modelos (Capa, Números, Lista), com @maisqtreino, Compartilhar e "Marque o @maisqtreino".

**Evolução** (`QTreinoR3`): mapa frente/costas com dia/semana e barras por músculo; treinos por mês (barras pretas, mês atual amarelo); carga por exercício (linha preta, último ponto amarelo); sequência e grade de medalhas; Fotos do corpo (frente/lado/costas, "SÓ VOCÊ VÊ", antes e agora com divisória preta de 3 px, câmera com silhueta e linha amarela para os pés); Medidas (5 medidas com boneco, histórico, lembrete a cada 4 semanas).

**Perfil** (`QTreinoR3`, `QTreinoR5`, fundo `#F4F3EE`): cartão da assinatura conforme o estado; Dados pessoais (refazer quiz); Equipamentos; Lembretes (toggles quadrados); Perguntas frequentes (acordeão); Termos e privacidade (baixar dados, revogar uso dos dados de saúde); Sair; Excluir conta (aviso e confirmação).

**Oferta** (`QTreinoR3`): tela inteira amarela, logo invertido (caixa preta, "+Q" amarelo), "Treinos prontos, montados por mim, com valor acessível.", lista do que está incluído, planos lado a lado, ASSINAR. **Reativação:** "Seu histórico está guardado" + lista do que está salvo.

**Trilha de lesões** (`QTreinoR5`, `screen="trilha"`): aberta pelo bloco preto "Lesões · 4 trilhas" no Início.
- **Abas de região:** lombar, joelho, ombro e quadril. A selecionada tem borda de 3 px.
- **Mapa muscular da região** (150×126), ao lado de uma descrição curta da dor.
- **4 fases** em lista numerada: 01 Agudo, 02 Crônico, 03 Mobilidade e 04 Sensório-motor, cada uma com descrição e duração. A fase atual fica num card com borda de 3 px e selo AGORA, e as fases concluídas têm ✓.
- **Aviso** de que a trilha não substitui avaliação profissional.
- **Estado com cadeado** (programa ou pausada): as 4 fases ficam em `#E2E1DC` com cadeado, o título perde o amarelo, o contador mostra "SÓ PARA ASSINANTES" e o botão vira de destaque (ASSINAR PARA LIBERAR ou REATIVAR ASSINATURA), abrindo a oferta ou a reativação.

**Master** (`QTreinoR4`): Painel, Funil do quiz, Alunos + ficha (sem fotos do corpo; botões Liberar acesso e Reenviar login), Quem parou de treinar, Protocolos e treinos, Explicações em lote, Vitrine.

> **Dados de exemplo:** todos os números, nomes de alunos, valores e percentuais do Master (1.284 alunos ativos, 412 mensais, 238 anuais, faturamento por produto, funil, lista de alunos, quem parou e avaliações) são **fictícios** e servem só para mostrar o layout. Os dados reais vêm do banco do app e da Eduzz. O mesmo vale para os dados da aluna Mariana Costa, as cargas, medidas e históricos no app do aluno.

## Comportamento
- Escolha única no quiz: marca e avança em 280 ms.
- Timer de descanso: 60 s (por repetição) ou 30 s (por tempo). +15 s soma ao total. Ao chegar a zero, volta à série seguinte ou ao próximo exercício.
- Sequência de dias: dia de descanso do plano não quebra a sequência.
- Alteração de local ou equipamentos: mantém nível, progresso e cargas; troca só os exercícios.
- Lembretes só funcionam com o PWA instalado.
- Desktop: sem layout próprio. Centralizar a coluna de 390–430 px em fundo `#F4F3EE`.

## Estado (sugestão)
`user { sexo, estado: 'programa'|'assinante'|'pausada', programas[], quiz{}, equipamentos[], local }`, `protocolo { treinos[24], atual, feitos[] }`, `sessao { exercicioAtual, series{[ex-serie]: {feito, carga}}, descanso{restante,total}, trocas{}, recordes }`, `avaliacao`, `medidas[]`, `fotos[]`, `lembretes { treino, medidas, fotos, horario, dias[] }`.

## Assets
- `assets/bonecos/feminino/` e `assets/bonecos/masculino/`: 20 dos 58 bonecos do mapa muscular (SVG 990×828, frente à esquerda e costas à direita, corpo `#1E1E20`, alvo `#C8202A`). O boneco segue o sexo do quiz. A escolha por nome do treino ou exercício está em `mapOf()`. O pacote completo de 58 fica na pasta de identidade.
- `assets/videos/`: 6 vídeos de exercício do Richard (fundo branco, 1920×1080, loop sem áudio). O acervo completo (~800, em "Vídeos +qtreino") deve ser ligado a cada exercício pelo nome do arquivo (`categoria-equipamento-musculo-nome.mp4`).
- `assets/fotos/`: 5 recortes 480×600 tirados dos vídeos (provisórios; substituir por fotos em alta).
- Faltam: áudios da voz guia e das explicações, vídeo da prancha frontal.

## Imagens das telas
`telas/` traz 34 PNGs (01-login … 34-trilha-lesoes-bloqueada) em 390×844 px, na ordem do fluxo do aluno. Todas foram revisadas: nenhum texto quebra sem querer, é cortado ou sobrepõe outro elemento. A 33 mostra a trilha de lesões para assinante e a 34, a mesma tela com cadeado (aluno com programa). A referência exata do comportamento continua sendo o protótipo aberto no navegador.

## Arquivos
- `Q Treino - Prototipo.dc.html`: protótipo navegável com seletor de estado e de sexo.
- `Q Treino - Rodada 1.dc.html`: canvas com todas as telas lado a lado e a biblioteca de componentes (1a).
- `QTreinoApp.dc.html`: Início, Execução, Avaliação, Resumo.
- `QTreinoR2.dc.html`: Quiz, Equipamentos por foto, Resultado, Detalhe, Meu plano.
- `QTreinoR3.dc.html`: Primeiro acesso, Evolução, Fotos, Medidas, Stories, Oferta, Reativação, Perfil.
- `QTreinoR4.dc.html`: Master (dados de exemplo).
- `QTreinoR5.dc.html`: Busca, Ver tudo, Esqueci a senha, telas internas do Perfil, Trilha de lesões.
- `support.js`: runtime necessário para abrir os `.dc.html` no navegador.
