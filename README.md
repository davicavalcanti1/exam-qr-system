# ExameQR

**Controle financeiro de exames realizados por parceria.**

Um parceiro (clínica, consultório ou médico que encaminha) custeia exames de seus pacientes até um **teto de crédito**; o valor de cada exame só é **debitado quando o exame é confirmado pela leitura de um QR Code**; e a cobrança é fechada **por período**, com recibo. Multiempresa, white-label e em conformidade com a LGPD.

> Documentação completa (produto, integrações, segurança e técnica): **`/documentacao`** no próprio app.

---

## Arquitetura

Plataforma **multi-tenant** (SaaS). Hierarquia: **dono → empresas (clínicas) → parceiros → funcionários**, isolada por `empresa_id` via Row Level Security.

- **Frontend** — React + Vite + Tailwind. Acessa o Supabase diretamente sob RLS (CRUD do dia a dia) e o backend para operações privilegiadas/integrações.
- **Backend** — Node/Express. Usa a *service role* do Supabase para o que exige privilégio (criar usuários, integrações) e concentra a comunicação com sistemas externos (NetRis).
- **Dados** — Supabase: PostgreSQL + Auth + Storage, região **Brasil (São Paulo)**.

```
frontend/      React (Vite) — SPA + páginas públicas de documentação
src/           Backend Express (rotas admin, qr, integrações)
  integrations/netris/    integração NetRis (server-side)
supabase/migrations/      schema versionado (SQL)
docs/          notas técnicas internas
```

## Principais recursos

- **Teto de crédito por parceiro** com trava (no frontend e no banco).
- **Débito no scan**: o exame só consome o teto quando o QR é confirmado.
- **Cobrança por lote** + recibo; baixa de pagamento libera o teto.
- **Contratos** e **DPA** com assinatura eletrônica e auditoria.
- **White-label** por empresa (logo + nome de exibição).
- **Medição de consumo** por empresa (dono).
- **LGPD**: consentimento versionado, exportar/anonimizar titular, trilha de auditoria.
- **Autenticação**: usuário/senha ou Google, com convite por e-mail.
- **Integração NetRis** (agendamento real no sistema da clínica) — opcional, por empresa.

## Desenvolvimento

Pré-requisitos: Node.js 22+, npm, um projeto Supabase.

```bash
# backend (porta 3000)
npm install
npm run dev

# frontend
cd frontend
npm install
npm run dev
```

### Variáveis de ambiente

Frontend (`frontend/.env`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Backend (`.env`):
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # service_role REAL — nunca uma VITE_ var, nunca no frontend
```

> Credenciais do NetRis **não** vão em `.env`: ficam por empresa em `integracao_configs` (acesso restrito, só no servidor).

### Migrations

O schema é versionado em `supabase/migrations/`. Para aplicar:

```bash
supabase db push
```

## Deploy

Contêiner (Docker) em plataforma gerenciada (EasyPanel), atrás de HTTPS. As envs de build do Vite são fixadas na imagem.

---

Campina Grande — PB.
