// Cliente do Asaas — gateway de cobrança (PIX/boleto/cartão) do lote de parceiro.
//
// Mesmo desenho do ZapSign e da agenda: o token vive em `integracao_configs`
// (RLS ligada, sem policy) e só o servidor o lê. O navegador nunca toca no
// token nem fala com o Asaas diretamente.
//
// API v3: header `access_token`. Confirmado contra docs.asaas.com — não é
// suposição: POST /customers, POST /payments, GET /payments/{id}/pixQrCode.

const HOSTS = {
  producao: 'https://api.asaas.com/v3',
  sandbox: 'https://api-sandbox.asaas.com/v3',
}

const TIMEOUT_MS = 30_000

export function createAsaasClient({ token, ambiente = 'producao' } = {}) {
  if (!token) throw new Error('Token do Asaas não configurado.')
  const base = HOSTS[ambiente] || HOSTS.producao

  async function chamar(caminho, init = {}) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const r = await fetch(`${base}${caminho}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          access_token: token,
          ...(init.headers || {}),
        },
        signal: ctrl.signal,
      })
      const texto = await r.text()
      if (!r.ok) throw new Error(`Asaas ${r.status}: ${texto.slice(0, 300)}`)
      return texto ? JSON.parse(texto) : {}
    } catch (e) {
      if (e.name === 'AbortError') throw new Error(`Asaas não respondeu em ${TIMEOUT_MS / 1000}s.`)
      throw e
    } finally {
      clearTimeout(t)
    }
  }

  return {
    ambiente,

    // Cria o cliente (pagador) no Asaas. cpfCnpj é obrigatório na API.
    async criarCliente({ nome, documento, email }) {
      const cpfCnpj = String(documento || '').replace(/\D/g, '')
      if (!cpfCnpj) throw new Error('CPF/CNPJ é obrigatório para criar o cliente no Asaas.')
      return chamar('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: String(nome || '').trim() || 'Parceiro', cpfCnpj, ...(email ? { email } : {}) }),
      })
    },

    // Cria a cobrança. billingType 'UNDEFINED' deixa o pagador escolher
    // PIX/boleto/cartão na página do Asaas — não precisamos decidir por ele.
    async criarCobranca({ customerId, valor, vencimento, descricao, referencia }) {
      return chamar('/payments', {
        method: 'POST',
        body: JSON.stringify({
          customer: customerId,
          billingType: 'UNDEFINED',
          value: Number(valor),
          dueDate: vencimento,
          ...(descricao ? { description: String(descricao).slice(0, 500) } : {}),
          ...(referencia ? { externalReference: String(referencia) } : {}),
        }),
      })
    },

    // PIX copia-e-cola da cobrança já criada.
    async obterPixQrCode(paymentId) {
      return chamar(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`, { method: 'GET' })
    },

    // Reconsulta o status — fallback do webhook (mesmo papel do buscarDocumento do ZapSign).
    async consultarCobranca(paymentId) {
      return chamar(`/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' })
    },
  }
}

// Testa as credenciais sem criar nada. Diferente do "testar conexão" do NetRis
// (verde para qualquer HTTP < 500): aqui só 2xx é sucesso, mesmo critério do ZapSign.
export async function testarToken(token, ambiente = 'producao') {
  if (!token) return { ok: false, mensagem: 'Informe o token do Asaas.' }
  const base = HOSTS[ambiente] || HOSTS.producao
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const r = await fetch(`${base}/customers?limit=1`, {
      headers: { 'Content-Type': 'application/json', access_token: token },
      signal: ctrl.signal,
    })
    if (!r.ok) {
      const corpo = await r.text().catch(() => r.statusText)
      return {
        ok: false,
        status: r.status,
        mensagem: r.status === 401 || r.status === 403
          ? 'Token recusado pelo Asaas (401/403). Confira se é o token da conta certa e do ambiente certo.'
          : `Asaas respondeu HTTP ${r.status}: ${String(corpo).slice(0, 200)}`,
      }
    }
    return { ok: true, status: r.status, mensagem: `Token válido — o Asaas respondeu (${ambiente}).` }
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'o Asaas não respondeu em 15s' : e.message
    return { ok: false, mensagem: `Falha ao alcançar o Asaas: ${msg}` }
  } finally {
    clearTimeout(t)
  }
}
