// ─────────────────────────────────────────────────────────────────────────────
// NetRis — cliente de integração server-side, POR EMPRESA.
//
// O frontend NUNCA fala com o NetRis direto. Cada empresa guarda sua config
// (baseUrl, token, idPlanoConvenio, idUnidade) em integracao_configs e o backend
// cria um cliente sob demanda com createNetrisClient(config).
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100
const MAX_PAGES = 25

// IDs de situação do atendimento no NetRis (confirmados no controleoperacional).
export const SITUACAO = {
  EXAME_REALIZADO: 18,
  EM_SALA: 45,
  CANCELADO: 5,
  CHEGOU: 10,
}

const PROXY_ALLOWED_PREFIXES = ['netris/api/', 'netpacs/api/']
const PROXY_ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT'])

function isoToBR(iso) {
  const [y, m, d] = String(iso).split('-')
  return `${d}/${m}/${y}`
}

function unwrapList(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const k of ['aaData', 'content', 'data', 'items', 'result']) {
      if (Array.isArray(data[k])) return data[k]
    }
  }
  return []
}

// Cria um cliente NetRis a partir da config de UMA empresa.
export function createNetrisClient({ baseUrl, token, idPlanoConvenio = '', idUnidade = '', idConvenio = '' } = {}) {
  const BASE = String(baseUrl || '').replace(/\/$/, '')
  if (!BASE || !token) throw new Error('NetRis: baseUrl e token são obrigatórios')
  const headers = { 'Content-Type': 'application/json', Authorization: token }
  const cfg = { idPlanoConvenio, idUnidade, idConvenio }

  async function get(path) {
    const res = await fetch(`${BASE}${path.startsWith('/') ? '' : '/'}${path}`, { headers })
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText)
      throw new Error(`NetRis GET ${path} ${res.status}: ${body.slice(0, 200)}`)
    }
    return res.json()
  }

  // Proxy genérico controlado (só endpoints sob netris/api/ ou netpacs/api/).
  async function request({ method, path, query, body }) {
    const m = String(method || 'GET').toUpperCase()
    if (!PROXY_ALLOWED_METHODS.has(m)) {
      return { status: 405, ok: false, body: JSON.stringify({ error: 'Método não permitido' }), contentType: 'application/json' }
    }
    const clean = String(path || '').replace(/^\/+/, '')
    if (clean.includes('..') || !PROXY_ALLOWED_PREFIXES.some(p => clean.startsWith(p))) {
      return { status: 403, ok: false, body: JSON.stringify({ error: 'Caminho não permitido' }), contentType: 'application/json' }
    }
    const url = `${BASE}/${clean}${query ? `?${query}` : ''}`
    const init = { method: m, headers }
    if (m !== 'GET' && body !== undefined) init.body = JSON.stringify(body)
    const res = await fetch(url, init)
    const text = await res.text().catch(() => '')
    return { status: res.status, ok: res.ok, body: text, contentType: res.headers.get('content-type') || 'application/json' }
  }

  // Atendimentos (agendados) de um período. Paginado.
  async function fetchAtendimentos({ dataInicial, dataFinal, filialId = idUnidade }) {
    const all = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams({
        filialId: String(filialId || ''),
        limit: String(PAGE_SIZE), page: String(page),
        dataInicial: isoToBR(dataInicial), dataFinal: isoToBR(dataFinal),
      })
      const raw = await get(`/netris/api/atendimentos?${params}`)
      const pageData = unwrapList(raw)
      all.push(...pageData)
      if (pageData.length < PAGE_SIZE) break
    }
    return all
  }

  async function searchPacienteByCpf(cpf) {
    const clean = String(cpf).replace(/\D/g, '')
    const raw = await get(`/netris/api/pacientes?cpf=${encodeURIComponent(clean)}`)
    return unwrapList(raw)[0] || null
  }

  async function alterarSituacao(atendimentoId, idSituacao) {
    const url = `${BASE}/netris/api/atendimentos/${encodeURIComponent(atendimentoId)}/alterar-situacao`
    const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ idSituacao }) })
    const text = await res.text().catch(() => '')
    let parsed = null
    if (text) { try { parsed = JSON.parse(text) } catch { parsed = text } }
    return { status: res.status, ok: res.ok, body: parsed }
  }

  // Horários agrupados disponíveis. Injeta idPlanoConvenio/idFilial da config se
  // não vierem na query. Aceita string querystring ou objeto de params.
  async function horariosAgrupados(params = {}) {
    const q = new URLSearchParams(typeof params === 'string' ? params : params)
    if (!q.has('idPlanoConvenio') && idPlanoConvenio) q.set('idPlanoConvenio', String(idPlanoConvenio))
    if (!q.has('idConvenio') && idConvenio) q.set('idConvenio', String(idConvenio))
    if (!q.has('idFilial') && idUnidade) q.set('idFilial', String(idUnidade))
    if (!q.has('idUnidade') && idUnidade) q.set('idUnidade', String(idUnidade))
    return request({ method: 'GET', path: 'netris/api/horarios-agrupados', query: q.toString() })
  }

  // Cria o agendamento (encaixe). Completa idPlanoConvenio/idUnidade da config.
  async function criarEncaixe(body = {}) {
    const payload = {
      ...(idPlanoConvenio ? { idPlanoConvenio } : {}),
      ...(idConvenio ? { idConvenio } : {}),
      ...(idUnidade ? { idUnidade } : {}),
      ...body,
    }
    return request({ method: 'POST', path: 'netris/api/horarios/encaixe', body: payload })
  }

  return { config: cfg, get, request, fetchAtendimentos, searchPacienteByCpf, alterarSituacao, horariosAgrupados, criarEncaixe }
}
