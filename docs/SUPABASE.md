# Supabase — setup do ExameQR v2

## Aplicar a migração
```bash
# 1. Instalar a CLI (uma vez)
npm i -g supabase

# 2. Logar e linkar ao projeto (pega o ref no dashboard → Project Settings → General)
supabase login
supabase link --project-ref <PROJECT_REF>

# 3. Aplicar as migrations de supabase/migrations/
supabase db push
```

## Login — modelo
- **Owner (você):** e-mail real + senha à sua escolha (login normal).
- **Demais usuários:** login por **`nome.sobrenome`** → e-mail sintético
  `nome.sobrenome@exameqr.app`; **senha padrão** no cadastro + `must_change_password=true`
  (o sistema força a troca no 1º acesso). Criados por admin (backend service role).
- Tela de login: `/entrar`. Painel pós-login: `/painel`.

## Criar o OWNER (primeiro usuário) — via Dashboard
1. **Authentication → Users → Add user**: seu **e-mail real** + senha à sua escolha.
   Marque **Auto Confirm User** (senão o login exige confirmação por e-mail).
2. Copie o `id` (UUID) do usuário.
3. **SQL Editor**:
```sql
insert into profiles (id, nome, email, role, empresa_id, parceiro_id, must_change_password)
values ('<UUID_DO_AUTH_USER>', 'Seu Nome', '<seu-email>', 'owner', null, null, false);
```
4. Acesse `/entrar` com seu e-mail e senha → cai no `/painel` (área do owner: criar empresas).

> Dica: se o login falhar por confirmação de e-mail, vá em **Authentication → Providers →
> Email** e desative "Confirm email" (os e-mails sintéticos dos demais usuários não existem).

## Variáveis de ambiente
Frontend (Vite):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Backend (integrações / criação de usuários via admin):
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # NUNCA no frontend
```

## Modelo de acesso (resumo)
- **owner**: global (empresa_id null) — vê/gerencia tudo.
- **empresa_admin**: escopo 1 empresa — cria parceiros, agendamentos, financeiro.
- **parceiro_coordenador**: escopo 1 parceiro — autoriza exames, cria funcionários, gera QR.
- **parceiro_funcionario**: escopo 1 parceiro — registra conforme permissões.
- RLS filtra tudo por `empresa_id` (+ `parceiro_id` pros usuários de parceiro). Escrita da
  hierarquia (empresas/parceiros/profiles) e validação pública do QR passam pelo backend
  com **service role**.
