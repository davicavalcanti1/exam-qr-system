// ─────────────────────────────────────────────────────────────────────────────
// NetRis — cliente de integração server-side (portado do controleoperacional).
//
// Regra: o frontend NUNCA fala com o NetRis direto. Tudo passa por aqui, com o
// token injetado no servidor. Config por env:
//   NETRIS_BASE_URL   — base do gateway (ex.: https://.../)
//   NETRIS_TOKEN      — vai no header Authorization (token cru, sem "Bearer")
//   NETRIS_FILIAL_ID  — filial padrão
// ─────────────────────────────────────────────────────────────────────────────

const NETRIS_BASE = process.env.NETRIS_BASE_URL || ''
const NETRIS_TOKEN = process.env.NETRIS_TOKEN || ''
export const NETRIS_FILIAL = process.env.NETRIS_FILIAL_ID || ''

const PAGE_SIZE = 100
const MAX_PAGES = 25

// IDs de situação do atendimento no NetRis (confirmados no controleoperacional).
export const SITUACAO = {
  EXAME_REALIZADO: 18,
  EM_SALA: 45,
  CANCELADO: 5,
  CHEGOU: 10,
}

export function isConfigured() {
  return Boolean(NETRIS_BASE && NETRIS_TOKEN)
}

function assertConfigured() {
  if (!isConfigured()) {
    throw new Error('NetRis não configurado no servidor (NETRIS_BASE_URL / NETRIS_TOKEN ausentes)')
  }
}

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

// GET autenticado a um path do NetRis (retorna JSON; lança em erro).
export async function netrisGet(path) {
  assertConfigured()
  const res = await fetch(`${NETRIS_BASE}${path.startsWith('/') ? '' : '/'}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: NETRIS_TOKEN },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new Error(`NetRis GET ${path} ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

// Proxy genérico autenticado — permite chamar QUALQUER endpoint sob netris/api/
// (ex.: o de horários/vagas disponíveis, assim que soubermos o path exato).
const PROXY_ALLOWED_PREFIXES = ['netris/api/', 'netpacs/api/']
const PROXY_ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT'])

export async function netrisRequest({ method, path, query, body }) {
  assertConfigured()
  const m = String(method || 'GET').toUpperCase()
  if (!PROXY_ALLOWED_METHODS.has(m)) {
    return { status: 405, ok: false, body: JSON.stringify({ error: 'Método não permitido' }), contentType: 'application/json' }
  }
  const clean = String(path || '').replace(/^\/+/, '')
  if (clean.includes('..') || !PROXY_ALLOWED_PREFIXES.some(p => clean.startsWith(p))) {
    return { status: 403, ok: false, body: JSON.stringify({ error: 'Caminho não permitido' }), contentType: 'application/json' }
  }
  const url = `${NETRIS_BASE}/${clean}${query ? `?${query}` : ''}`
  const init = { method: m, headers: { 'Content-Type': 'application/json', Authorization: NETRIS_TOKEN } }
  if (m !== 'GET' && body !== undefined) init.body = JSON.stringify(body)
  const res = await fetch(url, init)
  const text = await res.text().catch(() => '')
  return { status: res.status, ok: res.ok, body: text, contentType: res.headers.get('content-type') || 'application/json' }
}

// Lê os atendimentos (agendados) de um período. Paginado.
export async function fetchAtendimentos({ dataInicial, dataFinal, filialId = NETRIS_FILIAL }) {
  assertConfigured()
  const all = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      filialId: String(filialId),
      limit: String(PAGE_SIZE),
      page: String(page),
      dataInicial: isoToBR(dataInicial),
      dataFinal: isoToBR(dataFinal),
    })
    const raw = await netrisGet(`/netris/api/atendimentos?${params}`)
    const pageData = unwrapList(raw)
    all.push(...pageData)
    if (pageData.length < PAGE_SIZE) break
  }
  return all
}

// Busca paciente por CPF.
export async function searchPacienteByCpf(cpf) {
  const clean = String(cpf).replace(/\D/g, '')
  const raw = await netrisGet(`/netris/api/pacientes?cpf=${encodeURIComponent(clean)}`)
  const list = unwrapList(raw)
  return list[0] || null
}

// Muda a situação de um atendimento (ex.: marcar EXAME_REALIZADO).
export async function alterarSituacao(atendimentoId, idSituacao) {
  assertConfigured()
  const url = `${NETRIS_BASE}/netris/api/atendimentos/${encodeURIComponent(atendimentoId)}/alterar-situacao`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: NETRIS_TOKEN },
    body: JSON.stringify({ idSituacao }),
  })
  const text = await res.text().catch(() => '')
  let parsed = null
  if (text) { try { parsed = JSON.parse(text) } catch { parsed = text } }
  return { status: res.status, ok: res.ok, body: parsed }
}
