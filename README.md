# +Q Treino

App de treino do @maisqtreino. Treinos prontos, montados por mim, com valor acessível.

## Rodar no computador

```bash
npm install
npm run dev
```

Abra http://localhost:3000 no navegador, de preferência no modo celular (390 px de largura).

## Ver as telas em cada estado

Enquanto não existe login, o estado do aluno é escolhido pela URL:

| Endereço | O que mostra |
| --- | --- |
| `/` | Aluno assinante, treino do dia |
| `/?estado=programa` | Aluno que comprou um programa (resto com cadeado) |
| `/?estado=pausada` | Assinatura pausada |
| `/?dia=descanso` | Início em dia de descanso |
| `/?sexo=masculino` | Mapa muscular masculino |
| `/treino/gluteo-posterior-07` | Execução do treino |
| `/treino/gluteo-posterior-07?descanso=faixa` | Descanso em faixa, em vez de tela cheia |

Todos os números e nomes nas telas são **dados de exemplo**.

## Etapa atual

Rodada 1 do design recriada: Início (com vitrine, cadeados e dia de descanso), Execução (repetição,
tempo, descanso, recorde, voz, explicação, trocar exercício e aviso de dor), Avaliação e Resumo.
