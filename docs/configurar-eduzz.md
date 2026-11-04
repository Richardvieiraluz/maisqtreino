# Configurar a Eduzz (webhook)

A venda vira aluno com acesso sozinha. Nenhuma chave passa pelo chat.

## O que o app faz com cada aviso

| Aviso da Eduzz | No app |
| --- | --- |
| Fatura paga (`myeduzz.invoice_paid`) | Cria a conta (se não existir), manda o e-mail para criar a senha e libera o produto. Programa: vitalício. Assinatura: até o próximo vencimento + 3 dias. |
| Contrato em dia (`contract_created` / `contract_updated`, status em dia) | Mantém ou reativa a assinatura até o próximo vencimento + 3 dias. |
| Contrato atrasado, inadimplente ou suspenso | Pausa a assinatura na hora (o histórico fica). Programas comprados continuam. |
| Contrato cancelado ou finalizado | Segue até o fim do período já pago, depois corta. |
| Fatura reembolsada ou estorno | Corta o acesso daquele produto. |

Presente (aluno diferente do comprador): o acesso vai para o e-mail do aluno.
Aviso repetido não faz nada duas vezes. Produto da Eduzz que não está cadastrado no app fica anotado e não libera nada.

## 1. Criar os produtos na Eduzz

Assinatura mensal, Assinatura anual, Programa Glúteo, Programa Lombar e Desafio de 21 dias.
Anote o código (id) de cada um.

## 2. Ligar cada produto ao app

Supabase do +Q Treino → SQL Editor → trocar os códigos e rodar:

```sql
UPDATE public.produtos SET eduzz_produto_id = 'CODIGO' WHERE id = 'assinatura-mensal';
UPDATE public.produtos SET eduzz_produto_id = 'CODIGO' WHERE id = 'assinatura-anual';
UPDATE public.produtos SET eduzz_produto_id = 'CODIGO' WHERE id = 'programa-gluteo';
UPDATE public.produtos SET eduzz_produto_id = 'CODIGO' WHERE id = 'programa-lombar';
UPDATE public.produtos SET eduzz_produto_id = 'CODIGO' WHERE id = 'desafio-21-dias';
```

## 3. Criar o webhook no Developer Hub

Órbita → Avançado → Webhooks → Acessar Developer Hub → Webhook → Configurações → + Nova configuração.

- Nome: `+Q Treino`
- Chave de acesso: gerar uma chave nova (é a chave secreta que assina os avisos). Copie o valor.
- URL: `https://maisqtreino.vercel.app/api/webhooks/eduzz`
- Eventos (grupo MyEduzz): `invoice_paid`, `invoice_refunded`, `contract_created`, `contract_updated`

## 4. Vercel → Settings → Environment Variables

| Nome | Valor |
| --- | --- |
| `EDUZZ_WEBHOOK_SECRET` | a chave de acesso do passo 3 |
| `APP_BASE_URL` | `https://maisqtreino.vercel.app` |

Depois: Deployments → Redeploy. Conferir em `/api/saude`: `eduzz_chave` e `eduzz_produtos` devem estar "ok".

## Antes de vender de verdade

O e-mail de criar senha sai pelo Supabase. O envio padrão do Supabase só entrega para a equipe do projeto
e em pouca quantidade: para compradores de verdade é preciso ligar um SMTP próprio (ver `configurar-login.md`).
