# IA de montagem do +Q Treino

Opção A (Richard, 04/11/2026): a IA monta os treinos de cada aluno.

## Como funciona

1. O aluno responde o quiz. O servidor cria o protocolo (`protocolos.perfil`) e coloca na fila
   tantos treinos quanto os dias por semana do quiz (`protocolo_treinos`, status `pendente`).
2. Com o app aberto, o gerador em segundo plano (`lib/geracao.tsx`) chama `POST /api/ia/proximo`,
   que monta **um** treino por vez (o próximo depende dos anteriores). Nunca passa de
   "treinos feitos + dias por semana".
3. Treino concluído grava a sessão e a fila anda.
4. Falhou 3 vezes: o treino fica com `erro` e o motivo em `protocolo_treinos.erro`.

O motor é o da v2 do +Q Pilates, copiado igual em `lib/ia-treino/v2` (para trazer correções de
lá, copie os arquivos de novo). Tudo que é do +Q Treino fica em `lib/ia-treino/aluno.ts` e
`lib/ia-treino/gerar-aluno.ts`.

## Decisões a confirmar com o Richard

**Família e nível pelo quiz**

| Quiz | Família |
| --- | --- |
| Ganhar massa muscular | Hipertrofia (sem halter, barra nem kettlebell: Condicionamento) |
| Perder gordura | Iniciante: Condicionamento. Intermediário e avançado: Cardio/HIIT |
| Condicionamento | Condicionamento |
| Aliviar dores | Reabilitação, fase crônica, com as regiões marcadas (sem região: Condicionamento) |
| 60 ou mais | Condicionamento N0 (nenhum exercício está marcado como idoso ainda) |

Nível: Iniciante N0, Intermediário N1, Avançado N2.

**Tempo:** a prescrição é de aula de 60 min. Em 40 e 20 min, os blocos principais caem na
proporção (a ativação fica).

**Dores (o que sai do catálogo do aluno).** Alongamento e mobilidade sempre ficam. Qualquer dor
tira impacto alto. Além disso:

| Dor | Sai |
| --- | --- |
| Lombar | extensão de tronco; potência, arranque, salto |
| Joelho | salto, deslocamento, arranque; impacto baixo |
| Ombro | empurrar e puxar na vertical |
| Quadril | salto, arranque |
| Cervical | trabalho de cervical/pescoço; empurrar na vertical |
| Punho | quatro apoios; antebraço/punho |

**Hipertrofia fora da academia:** os exercícios de força da pasta funcional com material de carga
(kettlebell, elástico extensor, mini band, TRX, bag, wall ball, calistenia, peso do corpo) entram
como exercícios principais. Em casa só com halter havia 22 exercícios de inferiores (9 no N1).

**Estoque pequeno:** se a regra "2/3 inéditos nos últimos 6 treinos" esvazia um bloco, a janela
encurta (6, 4, 3, 2, 1, 0) e a lista de candidatos sobe de 40 para 80. Nos treinos 19 a 24, se a
preparação do nível seguinte não fecha, o treino sai no nível atual (anotado no diagnóstico).

## Adaptação pelo que o aluno faz (confirmado pelo Richard em 05/11/2026)

Em `lib/ia-treino/adaptacao.ts` (puro). Vale para os treinos ainda não feitos, inclusive os já
montados: ao abrir o treino, a troca e o ajuste de volume são aplicados sem chamar a IA de novo.

1. **Carga**: último treino com carga anotada avaliado "fácil", todas as séries feitas e sem dor no
   exercício: a carga preenchida sobe 5% (mínimo 1 kg, de 0,5 em 0,5). "Ideal", "difícil" ou dor:
   repete a carga. Nunca desce sozinha.
2. **Volume**: os 2 últimos treinos concluídos avaliados "difícil": 1 série a menos em cada exercício
   (nunca abaixo de 2), menos no aquecimento. Volta ao normal com um treino que não seja difícil.
3. **Dor**: exercício marcado com dor sai dos próximos treinos por 14 dias (leve) ou 30 dias (forte).
   Nos treinos já montados entra o substituto mais parecido. Sair do treino depois de marcar dor
   grava o treino como interrompido (não conta como feito).
4. **Trocas**: exercício trocado 2 vezes ou mais em 60 dias sai dos próximos treinos do mesmo jeito.

Se tirar esses exercícios deixa o estoque sem treino possível, o treino é montado com o catálogo
inteiro (fica anotado no diagnóstico). Teste: `npx tsx scripts/teste-adaptacao.mts`.

## Testes (sem banco e sem chave)

- `npm run simular`: 24 treinos para 10 perfis com o catálogo real e um modelo falso.
- `npm run teste:fila`: fila de geração com banco falso.
- `npx tsx scripts/teste-para-sessao.mts`: treino gerado → passos da tela de execução.
