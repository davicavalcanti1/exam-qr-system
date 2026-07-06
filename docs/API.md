# 📡 API Documentation

**Base URL:** `http://localhost:3000/api`  
**Auth:** Bearer token via JWT

---

## 🔑 Authentication

### POST `/auth/login`
Faz login e retorna JWT token.

**Request:**
```json
{
  "email": "parceiro@clinic.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "parceiro@clinic.com",
    "type": "partner"
  }
}
```

**Headers para próximas requisições:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### GET `/auth/verify`
Verifica se o token é válido.

**Response (200):**
```json
{
  "valid": true,
  "user": { "id": 1, "email": "..." }
}
```

---

## 👥 Pacientes

### GET `/patients`
Lista todos os pacientes do parceiro.

**Query Params:**
- `search` — Buscar por nome/CPF
- `skip` — Paginação (padrão: 0)
- `limit` — Quantidade (padrão: 50)

**Response (200):**
```json
{
  "patients": [
    {
      "id": 1,
      "name": "João Silva",
      "cpf": "123.456.789-00",
      "qrCode": {
        "id": 5,
        "status": "active",
        "created_at": "2026-07-06T14:32:00Z"
      },
      "exams": [
        {
          "id": 10,
          "exam_name": "Tomografia",
          "exam_type": "Cabeça",
          "value": 350.00
        }
      ],
      "created_at": "2026-07-05T10:00:00Z"
    }
  ],
  "total": 150
}
```

---

### POST `/patients`
Cria um novo paciente.

**Request:**
```json
{
  "name": "João Silva",
  "cpf": "123.456.789-00",
  "exams": [
    {
      "exam_name": "Tomografia",
      "exam_type": "Cabeça",
      "value": 350.00
    },
    {
      "exam_name": "Ressonância",
      "exam_type": "Coluna",
      "value": 450.00
    }
  ]
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "João Silva",
  "cpf": "123.456.789-00",
  "exams": [...]
}
```

**Erros:**
- `400` — CPF duplicado
- `400` — Dados inválidos
- `403` — Não autorizado

---

### GET `/patients/:id`
Detalhes de um paciente.

**Response (200):**
```json
{
  "id": 1,
  "name": "João Silva",
  "cpf": "123.456.789-00",
  "qrCode": { "id": 5, "status": "active", ... },
  "exams": [...],
  "usageLog": [
    { "type": "transport", "used_at": "2026-07-06T14:32:00Z" }
  ],
  "created_at": "2026-07-05T10:00:00Z"
}
```

---

### DELETE `/patients/:id`
Deleta um paciente.

**Response (200):**
```json
{ "message": "Paciente deletado com sucesso" }
```

---

## 🎫 QR Codes

### POST `/qrcodes/generate/:patientId`
Gera um novo QR code para o paciente.

**Request Body:**
```json
{
  "allowTransport": true,
  "allowSnack": false,
  "allowExam": true
}
```

**Response (200):**
```json
{
  "qrId": 5,
  "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "willBlock": false,
  "permissions": {
    "transport": 1,
    "snack": 0,
    "exam": 1
  }
}
```

**Regras:**
- Max 3 usos por QR code
- Válido por 72 horas
- Pode regenerar (revoga anterior)
- Requer budget disponível

**Erros:**
- `404` — Paciente não encontrado
- `400` — QR não pode ser gerado (bloqueado)
- `403` — Sem orçamento

---

### GET `/qrcodes/image/:patientId`
Retorna a imagem do QR code.

**Response (200):**
```json
{
  "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "status": "active",
  "uses_count": 1,
  "max_uses": 3
}
```

---

### GET `/qrcodes/receipt/:patientId`
Baixa recibo em PDF.

**Response (200):**
- Content-Type: `application/pdf`
- Arquivo: `recibo_[patientId]_[timestamp].pdf`

---

### DELETE `/qrcodes/revoke/:patientId`
Revoga um QR code (não pode mais ser usado).

**Response (200):**
```json
{ "message": "QR Code revogado com sucesso" }
```

**Erros:**
- `400` — Já revogado
- `404` — QR não encontrado

---

### GET `/qrcodes/budget`
Info de orçamento do parceiro.

**Response (200):**
```json
{
  "partnerId": 1,
  "limit": 2000.00,
  "committed": 850.00,
  "available": 1150.00,
  "blockedByClinic": false,
  "budgetBlocked": false
}
```

---

## 📱 Scanner (Público)

### POST `/scanner/validate`
Valida um QR code no terminal.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "useType": "transport"  // "transport" | "snack" | "exam"
}
```

**Response (200) - Sucesso:**
```json
{
  "valid": true,
  "useType": "transport",
  "useLabel": "Transporte",
  "patient": {
    "name": "João Silva",
    "cpf": "123.456.789-00"
  },
  "exams": [
    { "exam_name": "Tomografia", "value": 350.00 }
  ],
  "usesCount": 1,
  "maxUses": 3,
  "remainingUses": 2,
  "isExhausted": false,
  "usageLog": [
    { "use_type": "transport", "used_at": "2026-07-06T14:32:00Z" }
  ]
}
```

**Response (200) - Falha:**
```json
{
  "valid": false,
  "error": "QR Code inválido — não pertence a este sistema"
}
```

**Erros possíveis:**
- `"QR Code inválido"` — Token corrupto ou falso
- `"QR Code esgotado"` — 3 usos já consumidos
- `"QR Code revogado"` — Foi revogado manualmente
- `"Já foi utilizado para Transporte"` — Tipo já foi usado
- `"Sem permissão para Lanche"` — Tipo não autorizado

---

## 💳 Payments

### GET `/payments/history`
Histórico de pagamentos do parceiro.

**Response (200):**
```json
{
  "payments": [
    {
      "id": 1,
      "amount": 500.00,
      "method": "credit_card",
      "status": "confirmed",
      "paid_at": "2026-07-01T10:00:00Z"
    }
  ]
}
```

---

### POST `/payments/initiate`
Inicia pagamento.

**Request:**
```json
{
  "method": "credit_card",  // "credit_card" | "pix" | "bank_transfer"
  "amount": 500.00
}
```

**Response (200):**
```json
{
  "paymentId": 1,
  "redirectUrl": "https://checkout.stripe.com/...",
  "method": "credit_card"
}
```

---

### POST `/payments/confirm`
Confirma pagamento após callback.

**Request:**
```json
{
  "method": "credit_card",
  "paymentId": 1,
  "transactionId": "tx_12345"
}
```

**Response (200):**
```json
{
  "confirmed": true,
  "newBudget": 2500.00
}
```

---

## 📊 Clinic (Admin)

### GET `/clinic/stats`
Stats da clínica.

**Response (200):**
```json
{
  "totalPartners": 15,
  "totalQRsGenerated": 342,
  "totalReadings": 1205,
  "todayReadings": 48,
  "revenue": 15750.00
}
```

---

### GET `/clinic/partners`
Lista partners da clínica.

**Response (200):**
```json
{
  "partners": [
    {
      "id": 1,
      "name": "Clínica A",
      "email": "admin@clinica-a.com",
      "budget_limit": 2000.00,
      "status": "active"
    }
  ]
}
```

---

## ❌ Códigos de Erro Comuns

| Código | Significado |
|--------|------------|
| `400` | Request inválida (dados faltando, formato errado) |
| `401` | Não autenticado (sem token ou token expirado) |
| `403` | Não autorizado (sem permissão) |
| `404` | Recurso não encontrado |
| `409` | Conflito (ex: CPF duplicado) |
| `429` | Rate limit excedido |
| `500` | Erro interno do servidor |

---

## 🔒 Headers de Segurança

Todas as requisições autenticadas devem incluir:

```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

O token expira em **7 dias**.

---

**Versão:** 1.0.0  
**Última atualização:** 06/07/2026
