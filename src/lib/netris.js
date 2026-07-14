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

// "15/07/2026" -> "2026-07-15"
function brToISO(br) {
  const m = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(br || '')
}

// Achata a resposta de horarios-agrupados (dias → unidades → medicos → horarios)
// numa lista simples de slots — o shape estável que o ExameQR consome.
export function normalizeHorarios(raw) {
  const dias = Array.isArray(raw) ? raw : []
  const slots = []
  for (const d of dias) {
    for (const u of d.unidades || []) {
      for (const med of u.medicos || []) {
        for (const h of med.horarios || []) {
          slots.push({
            data: d.data, dataString: brToISO(d.data),
            horaInicial: h.horaInicial, idUnidade: u.idUnidade,
            idMedico: med.idMedico, nomeMedico: med.nomeMedico,
            idSala: h.idSala, sala: h.sala, idEscala: h.idEscala,
            idHorario: h.idHorario ?? null, procedimento: h.procedimento, duracao: h.duracao,
          })
        }
      }
    }
  }
  return slots
}

// Primeiro valor não-vazio entre várias chaves candidatas de um objeto.
function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

// Data BR (dd/mm/aaaa) ou ISO → ISO (yyyy-mm-dd). Retorna null se não parsear.
function normalizarData(v) {
  if (!v) return null
  const s = String(v).trim()
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)      // 31/12/2026
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)             // 2026-12-31[...]
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

function normalizarSexo(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim().toUpperCase()
  if (['M', 'MASCULINO', '1', 'MALE'].includes(s)) return 'M'
  if (['F', 'FEMININO', '2', 'FEMALE'].includes(s)) return 'F'
  return null
}

// Normaliza um paciente cru do NetRis para o shape estável do ExameQR.
// Tolerante a variações de nome de campo; guarda o cru em `_raw` para depuração.
export function normalizePaciente(raw) {
  if (!raw || typeof raw !== 'object') return null
  const cpf = pick(raw, ['cpf', 'numeroCpf', 'nrCpf', 'documento', 'cpfPaciente'])
  const tel = pick(raw, ['celular', 'telefoneCelular', 'telefone', 'fone', 'telefone1'])
  return {
    netrisId: pick(raw, ['id', 'idPaciente', 'codigo', 'codigoPaciente', 'idPessoa']),
    nome: pick(raw, ['nome', 'nomePaciente', 'nomeCompleto', 'nomePessoa']),
    cpf: cpf ? String(cpf).replace(/\D/g, '') : null,
    nascimento: normalizarData(pick(raw, ['dataNascimento', 'nascimento', 'dtNascimento', 'dataNasc'])),
    sexo: normalizarSexo(pick(raw, ['sexo', 'genero', 'sexoPaciente'])),
    telefone: tel ? String(tel).replace(/\D/g, '') : null,
    email: pick(raw, ['email', 'emailPaciente']),
  }
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
    if (!q.has('idUnidade') && idUnidade) q.set('idUnidade', String(idUnidade))
    return request({ method: 'GET', path: 'netris/api/horarios-agrupados', query: q.toString() })
  }

  // Cria o agendamento (encaixe). O NetRis espera um ARRAY de EncaixeModel.
  // Defaults: encaixe=true, envioMensagemOrientacao=false. Campos do plano/convênio
  // da config são usados só se o model não trouxer os seus (o caller manda por parceiro).
  async function criarEncaixe(model = {}) {
    const m = {
      encaixe: true,
      envioMensagemOrientacao: false,
      ...(idPlanoConvenio ? { idPlanoConvenio: Number(idPlanoConvenio) } : {}),
      ...(idConvenio ? { idConvenio: Number(idConvenio) } : {}),
      ...model,
    }
    return request({ method: 'POST', path: 'netris/api/horarios/encaixe', body: [m] })
  }

  return { config: cfg, get, request, fetchAtendimentos, searchPacienteByCpf, alterarSituacao, horariosAgrupados, criarEncaixe }
}
