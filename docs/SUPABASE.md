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

## Criar o OWNER (primeiro usuário)
Não há signup público — usuários são criados por convite/admin. Pro primeiro (owner):

1. Supabase Dashboard → **Authentication → Users → Add user** (email + senha).
2. Copie o `id` (UUID) do usuário criado.
3. SQL Editor:
```sql
insert into profiles (id, nome, email, role, empresa_id, parceiro_id)
values ('<UUID_DO_AUTH_USER>', 'Dono', '<email>', 'owner', null, null);
```

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
