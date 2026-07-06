# 📖 Manual de Uso - ExameQR

**Versão:** 1.0.0  
**Data:** 06/07/2026

---

## 📋 Índice
1. [Configuração Inicial](#configuração-inicial)
2. [Usar como Parceiro/Clínica](#usar-como-parceironclínica)
3. [Usar como Terminal de Leitura](#usar-como-terminal-de-leitura)
4. [Troubleshooting](#troubleshooting)

---

## ⚙️ Configuração Inicial

### Pré-requisitos
- Node.js 18+ instalado
- npm atualizado
- Navegador moderno (Chrome, Firefox, Safari)
- Celular com câmera (para scanner)

### 1. Clonar e Instalar

```bash
git clone https://github.com/davicavalcanti1/exam-qr-system.git
cd exam-qr-system
npm install
```

### 2. Configurar Variáveis

```bash
cp .env.example .env
```

Edite `.env` e **MUDE O JWT_SECRET**:
```env
JWT_SECRET=sua-chave-super-secreta-aleátoria
```

### 3. Iniciar o Sistema

```bash
npm run dev
```

Acesse:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000

---

## 👥 Usar como Parceiro/Clínica

### Login

1. Abra http://localhost:5173
2. Clique em "Login"
3. Use as credenciais:
   - **Email:** parceiro@example.com
   - **Senha:** password123

> **Nota:** As credenciais padrão estão no `src/database/db.js`. Mude em produção!

### Dashboard

Na tela inicial você vê:
- 📊 **Total de Pacientes** — Todos os registrados
- 🎫 **QR Codes Gerados** — Quantos já foram criados
- 💰 **Orçamento** — Saldo disponível e usado
- 📱 **Leituras Hoje** — Quantas leituras hoje

### Adicionar Paciente

1. Clique em **"Novo Paciente"**
2. Preencha:
   - **Nome:** João Silva
   - **CPF:** 123.456.789-00
3. Adicione exames (opcional):
   - Click **"+ Adicionar Exame"**
   - Selecione tipo (Tomografia, Ressonância, etc)
   - Insira valor em R$
4. Click **"Salvar"**

### Gerar QR Code

1. Clique no paciente na listagem
2. Click em **"Gerar Novo QR Code"**
3. Aparece modal com permissões:

```
☑ Transporte — Permite uso em transporte
☐ Lanche — Permite uso em alimentação
☑ Exame — Sempre habilitado (padrão)
```

4. Selecione as permissões desejadas
5. Click **"Gerar QR Code"**
6. Pronto! Você vê:
   - Imagem do QR code
   - Validade (72 horas)
   - Info de segurança

### Baixar Recibo

1. Na página do paciente, click em **"Recibo PDF"**
2. Download automático
3. PDF com:
   - Dados do paciente
   - Lista de exames
   - QR code embedding
   - Validade e segurança

### Revogar QR Code

1. Page do paciente
2. Click **"Revogar QR"**
3. Confirme
4. QR fica **inválido permanentemente**

### Regenerar QR Code

1. Page do paciente
2. Click **"Gerar Novo QR Code"** novamente
3. Selecione novas permissões
4. QR anterior é revogado, novo é criado

---

## 📱 Usar como Terminal de Leitura

### Acesso

**No celular, abra:** `http://seu-ip:3000/scanner`

Exemplo: `http://192.168.1.100:3000/scanner`

> **Dica:** Use um terminal/tablet fixo na recepção

### Ler um QR Code

#### Passo 1: Selecionar Tipo de Uso
```
🚌 Transporte    [Selecionado]
🍱 Lanche
🏥 Exame
```

Clique no tipo desejado.

#### Passo 2: Iniciar Câmera
1. Click em **"Iniciar Câmera"**
2. Aceite permissão de câmera no navegador
3. Câmera abre com:
   - Frames de scan
   - Instrução "Aponte para o QR Code"

#### Passo 3: Apontar QR Code
1. Segure o recibo/celular com QR code perto
2. Câmera detecta automaticamente
3. Você ouve um **bip** e sente **vibração**

#### Passo 4: Confirmação
Modal aparece com:
```
✓ Autorização Confirmada!

Paciente: João Silva
Protocolo: #00000001

VÁLIDO HOJE — Exame Autorizado

[Continuar Lendo (3s)]
```

5. Após 3 segundos, modal some automaticamente
6. Sistema pronto para ler outro QR

### O que Significa Cada Erro?

#### ❌ "QR Code inválido"
- QR code corrompido ou falso
- Não pertence ao sistema
- **Solução:** Gere novo QR code no painel

#### ❌ "QR Code já foi utilizado para Transporte"
- Esse QR já foi lido com tipo "Transporte"
- Cada tipo pode ser usado **uma vez**
- **Solução:** Tente outro tipo ou regenere QR

#### ❌ "QR Code esgotado"
- Foram consumidos os 3 usos máximos
- Validade: 72h OU 3 usos (o que chegar primeiro)
- **Solução:** Regenere um novo QR code

#### ❌ "QR Code revogado"
- Foi revogado manualmente no painel
- Não pode mais ser usado
- **Solução:** Gere novo QR code

#### ❌ "Sem permissão para Lanche"
- Clínica não permitiu esse tipo
- Paciente só pode usar outros tipos
- **Solução:** Regenere com permissão adicionada

#### ❌ "Permissão de câmera negada"
- Navegador bloqueou acesso à câmera
- **Solução Mobile:**
  - iPhone: Settings → Camera → Safari
  - Android: Chrome → Settings → Permissions → Camera
- **Solução Desktop:**
  - Chrome: Click no ícone 🔒 na URL
  - Firefox: Preferences → Privacy → Camera

---

## 🔧 Troubleshooting

### Terminal
Problema: "Cannot find module 'express'"
```bash
# Solução:
npm install
npm run dev
```

---

Problema: Porta 3000 já em uso
```bash
# Solução 1: Mude a porta no .env
PORT=3001

# Solução 2: Kill o processo
# Windows:
netstat -ano | findstr :3000
taskkill /PID {PID} /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

---

### Frontend

Problema: Login não funciona
- **Verificar:** Email e senha estão corretos?
- **Verificar:** Backend está rodando (http://localhost:3000)?
- **Limpar cache:** Ctrl+Shift+Delete (Chrome)

---

Problema: Paciente não aparece
- **Verificar:** Está logado com a conta correta?
- **Verificar:** Banco de dados tem dados (não deletou)?
- **Recarregar:** F5

---

### Scanner

Problema: Câmera não abre
- **Verificar:** Permissão dada? (Pop-up no navegador)
- **Verificar:** Outro app usando câmera? (Feche)
- **Tentar:** Navegador diferente

---

Problema: "QR Code não lido"
- Aproxime mais (15-20cm)
- Melhor iluminação
- QR code não deformado/amassado
- Celular estável (não tremia)

---

Problema: Confirmação não aparece
- Espere alguns segundos (processa servidor)
- Verifique conexão wifi
- Tente outro QR code

---

### Banco de Dados

Problema: "database is locked"
- Outro processo está usando
- **Solução:** Feche app, espere 5s, abra novamente

---

Problema: Paciente deletado por acidente
- **Solução:** Restaure do backup (em setup)
- **Prevenção:** Sempre faça backup antes

---

## 📞 Contato & Suporte

- **Email:** suporte@exameqr.com.br
- **Issues:** https://github.com/davicavalcanti1/exam-qr-system/issues
- **Documentação:** Este arquivo

---

## 📝 Checklist de Setup

- [ ] Node.js 18+ instalado
- [ ] npm dependencies instaladas (`npm install`)
- [ ] `.env` criado com `JWT_SECRET` alterado
- [ ] Backend rodando (`npm run dev`)
- [ ] Frontend acessível (http://localhost:5173)
- [ ] Login funcionando
- [ ] Paciente criado com sucesso
- [ ] QR code gerado
- [ ] Scanner testado no celular
- [ ] Confirmação de leitura funcionando

Se tudo está marcado ✓, seu sistema está **100% funcional!**

---

**Versão:** 1.0.0  
**Última atualização:** 06/07/2026
