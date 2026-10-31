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
| `/quiz` | Quiz de entrada (as respostas ficam salvas no aparelho) |
| `/plano` | Meu plano: protocolo em grade ou lista, programa e mudar de local |
| `/detalhe/protocolo-07` | Detalhe de um treino do protocolo (01 a 24) |
| `/detalhe/programa-gluteo` | Detalhe do programa, com a ordem sugerida |
| `/entrar` | Primeiro acesso: login, boas-vindas, prontidão, instalar e lembrete |
| `/evolucao` | Evolução, com fotos do corpo e medidas |
| `/stories` | Stories 1080 × 1920 para compartilhar |
| `/oferta` e `/reativar` | Oferta da assinatura e reativação |
| `/perfil` | Perfil, lembretes e excluir conta |
| `/perfil/dados`, `/equipamentos`, `/lembretes`, `/faq`, `/termos` | Subtelas do Perfil (termos com download dos dados e revogação) |
| `/busca` e `/busca?q=Glúteo` | Busca de treinos |
| `/ver-tudo?fileira=Rápidos` | Fileira em grade, com filtros de nível, duração e local |
| `/entrar/esqueci` | Esqueci a senha |
| `/lesoes?regiao=joelho` | Trilha de lesões em 4 fases, com checagem de dor de 0 a 10 |
| `/master` | Painel do Master (+ `/funil`, `/alunos`, `/alunos/[id]`, `/parou`, `/protocolos`, `/explicacoes`, `/vitrine`) |
| `/treino/gluteo-posterior-07` | Execução do treino |
| `/treino/gluteo-posterior-07?descanso=faixa` | Descanso em faixa, em vez de tela cheia |

Todos os números e nomes nas telas são **dados de exemplo**.

## Etapas prontas

Rodada 1 do design recriada: Início (com vitrine, cadeados e dia de descanso), Execução (repetição,
tempo, descanso, recorde, voz, explicação, trocar exercício e aviso de dor), Avaliação e Resumo.

Rodada 2 do design recriada: Quiz (10 perguntas, mapa de regiões, equipamentos por academia
completa, lista ou foto), Resultado, Detalhe do treino e Meu plano. A análise da foto ainda é
simulada: a foto fica só no aparelho e nunca é enviada.

Rodada 3 do design recriada: primeiro acesso, Evolução, fotos do corpo (câmera com silhueta,
guardadas só no aparelho), medidas, stories gerado como imagem e compartilhado pelo celular,
oferta, reativação e Perfil. Login e pagamento ainda não existem: entram com o backend.

Rodadas 4 e 5 do design recriadas: busca, ver tudo, esqueci a senha, subtelas do Perfil, trilha de
lesões e o painel Master completo (painel, funil, alunos e ficha, quem parou, protocolos com
avaliações e auditoria, explicações em lote e ordem da vitrine). Números do Master são de exemplo.
