# ExameQR — Sistema de Autorização Digital de Exames

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue)](https://www.sqlite.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow)](#license)

**Plataforma segura e rápida para autorização digital de exames com QR code mobile.**

Permite que clínicas gerem QR codes únicos por paciente, validem leituras em terminais e controlem tipos de uso (transporte, lanche, exame) com criptografia de ponta a ponta.

---

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- npm 9+
- Navegador moderno (Chrome, Firefox, Safari)

### Instalação (5 minutos)

```bash
# Clone o repositório
git clone https://github.com/davicavalcanti1/exam-qr-system.git
cd exam-qr-system

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env

# Inicie o servidor
npm run dev
```

**Frontend fica em:** `http://localhost:5173`
**Backend fica em:** `http://localhost:3000`

---

## 📋 Funcionalidades

### ✅ Parceiros (Clínicas)
- 📱 Dashboard com estatísticas
- 👥 Gerenciar pacientes
- 🎫 Gerar QR codes com permissões personalizadas
- 📊 Controlar orçamento/cotas
- 📄 Baixar recibos em PDF
- 🔄 Regenerar e revogar QR codes

### ✅ Scanner Móvel
- 📷 Câmera do celular integrada
- ✨ Leitura em tempo real
- 🔊 Som + vibração de confirmação
- 📊 Validação com detalhes do paciente
- 🎯 Suporte a 3 tipos de uso

### ✅ Segurança
- 🔐 Autenticação JWT
- 🛡️ HMAC + dupla validação de QR
- 🔒 Criptografia de tokens
- 📝 Histórico completo de leituras
- ⏱️ QR codes com validade (72h)

### ✅ Administração
- 👨‍💼 Painel admin (em desenvolvimento)
- 📈 Relatórios e analytics
- 💰 Gestão financeira
- 🚫 Controle de parceiros

---

## 🏗️ Arquitetura

```
exam-qr-system/
├── src/                          # Backend (Express.js)
│   ├── routes/                   # Endpoints API
│   │   ├── auth.js              # Login/autenticação
│   │   ├── qrcodes.js           # Geração QR
│   │   ├── scanner.js           # Validação QR
│   │   ├── patients.js          # Pacientes
│   │   ├── clinic.js            # Partners
│   │   └── payments.js          # Pagamentos
│   ├── middleware/
│   │   └── auth.js              # JWT validation
│   ├── utils/
│   │   ├── qrToken.js           # Token generation/verify
│   │   └── receiptGenerator.js  # PDF generation
│   ├── database/
│   │   └── db.js                # SQLite init
│   └── app.js                   # Express server
├── frontend/                     # React 18 + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PatientDetail.jsx
│   │   │   ├── Scanner.jsx
│   │   │   └── ...
│   │   ├── api.js               # API client
│   │   └── App.jsx
│   └── vite.config.js
└── data/
    └── exam-qr.db               # SQLite database
```

---

## 🔌 API Endpoints

### Autenticação
```
POST   /api/auth/login           # Login
GET    /api/auth/verify          # Verify token
```

### Pacientes
```
GET    /api/patients             # Listar pacientes
POST   /api/patients             # Criar paciente
GET    /api/patients/:id         # Detalhes
DELETE /api/patients/:id         # Deletar
```

### QR Codes
```
POST   /api/qrcodes/generate/:patientId    # Gerar QR
GET    /api/qrcodes/image/:patientId       # Baixar imagem QR
GET    /api/qrcodes/receipt/:patientId     # Baixar recibo PDF
DELETE /api/qrcodes/revoke/:patientId      # Revogar QR
```

### Scanner (Público)
```
POST   /api/scanner/validate     # Validar QR code
```

**Documentação completa:** [`API.md`](./docs/API.md)

---

## 🔐 Segurança & Conformidade

### Dados Sensíveis
- ✅ CPF armazenado com hash
- ✅ Tokens com HMAC-SHA256
- ✅ QR codes criptografados
- ✅ Sem dados sensíveis em logs

### Conformidade
- ✅ LGPD ready (direito ao esquecimento)
- ✅ Backup automatizado
- ✅ Auditoria de acessos
- ✅ Retenção de dados controlada

---

## 📱 Uso

### 1️⃣ Criar Paciente
1. Login como parceiro
2. Dashboard → "Novo Paciente"
3. Preencha nome, CPF, exames
4. Salve

### 2️⃣ Gerar QR Code
1. Clique no paciente
2. "Gerar Novo QR Code"
3. Selecione permissões (Transporte ✓, Lanche ✓, Exame ✓)
4. Confirme
5. Download recibo em PDF

### 3️⃣ Validar no Scanner
1. Abra `/scanner` no celular
2. Selecione tipo de uso
3. Clique "Iniciar Câmera"
4. Aponte para QR code
5. Veja confirmação de sucesso

---

## 🛠️ Desenvolvimento

### Scripts
```bash
npm run dev           # Inicia server com watch
npm run build         # Build frontend
npm start prod        # Produção
npm run format        # Prettier
npm test              # Testes (em breve)
```

### Variáveis de Ambiente
```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/exam-qr.db
JWT_SECRET=sua-chave-secreta-aqui
```

**`.env.example`** contém template com todas as variáveis.

---

## 📊 Banco de Dados

### Tabelas
- `partners` — Clínicas/parceiros
- `patients` — Pacientes registrados
- `exams` — Exames autorizados
- `qr_codes` — QR codes gerados
- `qr_usage_log` — Histórico de leituras
- `payments` — Transações financeiras

**Schema:** [`schema.sql`](./docs/SCHEMA.md)

---

## 🐛 Troubleshooting

### Scanner não detecta câmera
**Solução:** Verifique se o navegador tem permissão de câmera
- Chrome: Settings → Privacy → Camera
- iOS Safari: Settings → Camera → Safari

### QR code diz "inválido"
**Solução:** Verifique se:
- QR não expirou (>72h)
- QR não foi revogado
- QR não esgotou 3 usos
- Tipo de uso está permitido

### "Permissão negada" no login
**Solução:** Verifique credenciais ou contacte admin

---

## 📞 Suporte

**Email:** suporte@exameqr.com.br
**Issues:** https://github.com/davicavalcanti1/exam-qr-system/issues

---

## 📄 Licença

MIT © 2026 ExameQR

---

## 🗺️ Roadmap

- [ ] Admin dashboard completo
- [ ] Relatórios avançados
- [ ] Notificações por email
- [ ] Integração Stripe
- [ ] App mobile nativo
- [ ] Dark mode
- [ ] Multi-idioma

---

**Versão:** 1.0.0  
**Última atualização:** 06/07/2026
