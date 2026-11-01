# Configurar o login (Supabase + Vercel)

Nenhuma chave passa pelo chat nem entra no código. Elas ficam só no painel do Supabase e no da Vercel.

## 1. Banco

SQL Editor → New query → colar `supabase/migrations/002_tentativas_login.sql` → Run.

## 2. Supabase → Authentication

**URL Configuration**
- Site URL: `https://maisqtreino.vercel.app`
- Redirect URLs: adicionar `https://maisqtreino.vercel.app/**`

**Sign In / Providers → Email**
- Desligar "Allow new users to sign up". Ninguém cria conta sozinho: quem cria é a compra (Eduzz) ou o Master.

**Emails → Templates** (trocar assunto e corpo de dois modelos)

*Invite user*
- Assunto: `Seu acesso ao +Q Treino`
- Corpo:

```html
<h2>Seu acesso ao +Q Treino chegou</h2>
<p>Crie sua senha para entrar no app. Use o mesmo e-mail da compra.</p>
<p><a href="{{ .SiteURL }}/entrar/senha?token_hash={{ .TokenHash }}&type=invite">Criar minha senha</a></p>
<p>Richard Vieira · +Q Treino</p>
```

*Reset password*
- Assunto: `Sua senha nova do +Q Treino`
- Corpo:

```html
<h2>Senha nova</h2>
<p>Recebemos um pedido para trocar a senha. O link vale por 1 hora.</p>
<p><a href="{{ .SiteURL }}/entrar/senha?token_hash={{ .TokenHash }}&type=recovery">Criar senha nova</a></p>
<p>Se não foi você, ignore este e-mail.</p>
```

## 3. Vercel → Settings → Environment Variables

Valores em Supabase → Project Settings → API Keys (serve a chave nova ou a legada).

| Nome | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (ou `anon` legada) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (ou `service_role` legada). **Nunca** com `NEXT_PUBLIC_` |

Marcar Production, Preview e Development. Depois: Deployments → último → Redeploy.
Sem essas variáveis o app continua no modo demonstração.

## 4. Testar com a sua conta

1. Authentication → Users → Add user → Send invitation → seu e-mail.
2. SQL Editor: `UPDATE public.perfis SET papel = 'master' WHERE lower(email) = 'seu@email';`
3. Abrir o e-mail no celular → Criar minha senha → deve cair no Master.

## Antes do lançamento

O envio de e-mail padrão do Supabase é só para teste (poucos e-mails por hora). Para alunos de verdade,
ligar um SMTP próprio (Authentication → Emails → SMTP Settings), por exemplo Resend, com remetente do domínio.
