// Cliente do ZapSign — assinatura eletrônica com autenticação do signatário.
//
// Mesmo desenho do NetRis e da agenda: o token vive em `integracao_configs`
// (RLS ligada, sem policy) e só o servidor o lê. O PDF é montado aqui mesmo,
// com pdfkit, a partir do texto que já está no banco — o navegador nunca toca
// no token nem precisa gerar arquivo.
//
// API v1: POST /docs/ cria o documento, GET /docs/{token}/ consulta.
// Autenticação: `Authorization: Bearer <token da conta>`.

const HOSTS = {
  producao: 'https://api.zapsign.com.br/api/v1',
  sandbox: 'https://sandbox.api.zapsign.com.br/api/v1',
}

const TIMEOUT_MS = 30_000

export function createZapsignClient({ token, ambiente = 'producao' } = {}) {
  if (!token) throw new Error('Token do ZapSign não configurado.')
  const base = HOSTS[ambiente] || HOSTS.producao

  async function chamar(caminho, init = {}) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const r = await fetch(`${base}${caminho}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init.headers || {}),
        },
        signal: ctrl.signal,
      })
      const texto = await r.text()
      if (!r.ok) throw new Error(`ZapSign ${r.status}: ${texto.slice(0, 300)}`)
      return texto ? JSON.parse(texto) : {}
    } catch (e) {
      // AbortError vira uma mensagem que diz o que aconteceu, não "aborted".
      if (e.name === 'AbortError') throw new Error(`ZapSign não respondeu em ${TIMEOUT_MS / 1000}s.`)
      throw e
    } finally {
      clearTimeout(t)
    }
  }

  return {
    ambiente,

    // Cria o documento e devolve { token, status, signers: [{ token, sign_url, status }] }.
    //
    // `send_automatic_email` faz o próprio ZapSign mandar o e-mail — é o que evita
    // ter de montar envio de e-mail deste lado (o sistema não tem um: o único
    // canal é o WhatsApp da uazapi). `auth_mode: 'tokenEmail'` exige que o
    // signatário confirme um código recebido no e-mail antes de assinar, que é o
    // que dá autenticação ao ato — o aceite interno não tem nenhuma.
    async criarDocumento({ nome, base64Pdf, signatario, urlWebhook }) {
      const base64 = String(base64Pdf || '').replace(/^data:application\/pdf;base64,/, '')
      if (!base64) throw new Error('PDF vazio.')

      return chamar('/docs/', {
        method: 'POST',
        body: JSON.stringify({
          name: String(nome || 'Documento').slice(0, 255),
          base64_pdf: base64,
          lang: 'pt-br',
          ...(urlWebhook ? { url_webhook: urlWebhook } : {}),
          signers: [{
            name: signatario.nome,
            email: signatario.email,
            auth_mode: 'tokenEmail',
            send_automatic_email: true,
          }],
        }),
      })
    },

    // O arquivo assinado é buscado aqui, não tirado do corpo do webhook: o
    // provedor é a fonte confiável, e o link do payload pode ainda não existir.
    async buscarDocumento(tokenDoc) {
      return chamar(`/docs/${encodeURIComponent(tokenDoc)}/`, { method: 'GET' })
    },
  }
}

// Testa as credenciais sem criar nada — lista documentos pedindo a 1ª página.
// Diferente do "testar conexão" do NetRis, que dá verde para qualquer HTTP < 500:
// aqui só 2xx é sucesso, então token inválido aparece como inválido.
export async function testarToken(token, ambiente = 'producao') {
  if (!token) return { ok: false, mensagem: 'Informe o token do ZapSign.' }
  const base = HOSTS[ambiente] || HOSTS.producao
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const r = await fetch(`${base}/docs/?page=1`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    })
    if (!r.ok) {
      const corpo = await r.text().catch(() => r.statusText)
      return {
        ok: false,
        status: r.status,
        mensagem: r.status === 401 || r.status === 403
          ? 'Token recusado pelo ZapSign (401/403). Confira se é o token da conta certa e do ambiente certo.'
          : `ZapSign respondeu HTTP ${r.status}: ${String(corpo).slice(0, 200)}`,
      }
    }
    return { ok: true, status: r.status, mensagem: `Token válido — o ZapSign respondeu (${ambiente}).` }
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'o ZapSign não respondeu em 15s' : e.message
    return { ok: false, mensagem: `Falha ao alcançar o ZapSign: ${msg}` }
  } finally {
    clearTimeout(t)
  }
}

// Normaliza o status do documento do ZapSign para o vocabulário do sistema.
// O provedor usa 'signed' / 'refused' / 'pending'; o banco usa os nossos.
export function normalizeStatus(s) {
  const v = String(s || '').toLowerCase()
  if (v === 'signed') return 'assinado'
  if (v === 'refused') return 'recusado'
  if (v === 'expired') return 'expirado'
  return 'pendente'
}
