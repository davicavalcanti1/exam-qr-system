// ─────────────────────────────────────────────────────────────────────────────
// Focus NFe — cliente de emissão de NFS-e, server-side.
//
// A emissão é ASSÍNCRONA: POST /v2/nfse?ref={ref} responde "processando"; o
// resultado final chega por webhook OU consultando GET /v2/nfse/{ref}.
// Auth: HTTP Basic com o token como usuário e senha vazia.
// Campina Grande/PB usa o provedor municipal WebISS (padrão ABRASF).
// ─────────────────────────────────────────────────────────────────────────────

const BASES = {
  homologacao: 'https://homolog.focusnfe.com.br',
  producao: 'https://api.focusnfe.com.br',
}

export function createFocusNfseClient({ token, ambiente = 'homologacao' } = {}) {
  if (!token) throw new Error('Focus NFe: token é obrigatório')
  const BASE = BASES[ambiente] || BASES.homologacao
  const authHeader = 'Basic ' + Buffer.from(`${token}:`).toString('base64')
  const headers = { 'Content-Type': 'application/json', Authorization: authHeader }

  async function call(method, path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method, headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const text = await res.text().catch(() => '')
    let parsed = null
    if (text) { try { parsed = JSON.parse(text) } catch { parsed = text } }
    return { status: res.status, ok: res.ok, body: parsed }
  }

  // Emite (enfileira) uma NFS-e. ref é a nossa chave idempotente.
  const emitir = (ref, payload) => call('POST', `/v2/nfse?ref=${encodeURIComponent(ref)}`, payload)

  // Consulta o estado atual de uma NFS-e pela ref (status, url do PDF/XML, erros).
  const consultar = (ref) => call('GET', `/v2/nfse/${encodeURIComponent(ref)}`)

  // Cancela (quando o município permite por API — Campina Grande/PB NÃO permite).
  const cancelar = (ref, justificativa) =>
    call('DELETE', `/v2/nfse/${encodeURIComponent(ref)}`, justificativa ? { justificativa } : undefined)

  return { ambiente, emitir, consultar, cancelar }
}

// Normaliza a resposta da Focus (crua) para o shape estável do ExameQR.
// A Focus usa status: processando | autorizado | cancelado | erro_autorizacao.
export function normalizeNfse(raw) {
  if (!raw || typeof raw !== 'object') return { status: 'processando' }
  const map = {
    autorizado: 'autorizada',
    processando_autorizacao: 'processando',
    cancelado: 'cancelada',
    erro_autorizacao: 'erro',
  }
  const status = map[raw.status] || (raw.status === 'processando' ? 'processando' : (raw.status || 'processando'))
  const erros = Array.isArray(raw.erros)
    ? raw.erros.map(e => (e.mensagem || e.correcao || JSON.stringify(e))).join(' | ')
    : (raw.erro || null)
  return {
    status,
    numero: raw.numero || raw.numero_rps || null,
    url_pdf: raw.url_danfse || raw.caminho_danfse || raw.url || null,
    url_xml: raw.url_xml || raw.caminho_xml_nota_fiscal || null,
    erro_msg: status === 'erro' ? (erros || 'Erro na autorização (ver payload).') : null,
  }
}
