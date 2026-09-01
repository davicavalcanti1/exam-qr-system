// ─────────────────────────────────────────────────────────────────────────────
// Feegow — cliente de integração server-side, POR EMPRESA.
//
// Espelha a INTERFACE do cliente NetRis (mesmos nomes de método e mesmos shapes
// normalizados) para que trocar de provedor seja só mudar a config da empresa
// (integracao_configs.provider = 'feegow'). O frontend nunca fala com o Feegow.
//
// Base: https://api.feegow.com/v1  ·  Auth: header x-access-token
// Ex.: GET https://api.feegow.com/v1/api/appoints/status
// Docs: https://docs.feegow.com/
// ─────────────────────────────────────────────────────────────────────────────

const PROXY_ALLOWED_PREFIXES = ['api/']
const PROXY_ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT'])

// Situações — mantém a mesma "cara" do NetRis para o código chamador não mudar.
// No Feegow o que usamos de fato é o cancelamento (cancel-appoint).
export const SITUACAO = { EXAME_REALIZADO: 'realizado', CANCELADO: 'cancelado', CHEGOU: 'chegou', EM_SALA: 'em_sala' }

function pick(obj, keys) {
  for (const k of keys) { const v = obj?.[k]; if (v !== undefined && v !== null && v !== '') return v }
  return null
}
function normalizarData(v) {
  if (!v) return null
  const s = String(v).trim()
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}
function normalizarSexo(v) {
  const s = String(v ?? '').trim().toUpperCase()
  if (['M', 'MASCULINO', '1', 'MALE'].includes(s)) return 'M'
  if (['F', 'FEMININO', '2', 'FEMALE'].includes(s)) return 'F'
  return null
}

// Paciente cru do Feegow → shape estável do ExameQR (mesmo do NetRis).
export function normalizePaciente(raw) {
  if (!raw || typeof raw !== 'object') return null
  const cpf = pick(raw, ['cpf', 'documento', 'numeroCpf'])
  const tel = pick(raw, ['celular', 'telefone', 'telefone_celular', 'phone', 'telefones'])
  return {
    netrisId: pick(raw, ['paciente_id', 'id_paciente', 'id', 'idPaciente', 'patient_id']), // idExterno (nome herdado da interface)
    nome: pick(raw, ['nome', 'nome_paciente', 'name', 'nomeCompleto']),
    cpf: cpf ? String(cpf).replace(/\D/g, '') : null,
    nascimento: normalizarData(pick(raw, ['nascimento', 'data_nascimento', 'birthday', 'dataNascimento'])),
    sexo: normalizarSexo(pick(raw, ['sexo', 'genero', 'gender'])),
    telefone: tel ? String(tel).replace(/\D/g, '') : null,
    email: pick(raw, ['email']),
  }
}

function unwrapList(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    // Feegow costuma responder { success, content: [...] }
    for (const k of ['content', 'data', 'items', 'result', 'aaData']) if (Array.isArray(data[k])) return data[k]
  }
  return []
}

// Achata a resposta de horários disponíveis do Feegow em slots — MESMO shape do NetRis.
//
// Formato real de GET /appoints/available-schedule (confirmado na doc oficial,
// docs.feegow.com), bem diferente da lista plana do NetRis:
//   { success, content: { profissional_id: { "<id>": { local_id: [ { "YYYY-MM-DD": ["HH:MM:SS", ...] }, ... ], age_restriction } } } }
// Não há sala nem nome do médico nesse endpoint — só o id do profissional e os
// horários crus (string HH:MM:SS). nomeMedico/idSala ficam null de propósito.
export function normalizeHorarios(raw) {
  const porProfissional = raw?.content?.profissional_id
  if (!porProfissional || typeof porProfissional !== 'object') return []
  const slots = []
  for (const [idMedico, entry] of Object.entries(porProfissional)) {
    const locais = Array.isArray(entry?.local_id) ? entry.local_id : []
    for (const porData of locais) {
      if (!porData || typeof porData !== 'object') continue
      for (const [data, horarios] of Object.entries(porData)) {
        for (const hora of Array.isArray(horarios) ? horarios : []) {
          slots.push({
            data, dataString: normalizarData(data),
            horaInicial: hora, horarioString: hora,
            idUnidade: null,
            idMedico, nomeMedico: null, idSala: null,
            procedimento: null,
          })
        }
      }
    }
  }
  return slots
}

// Cria um cliente Feegow a partir da config de UMA empresa.
export function createFeegowClient({ baseUrl = 'https://api.feegow.com/v1', token, localId = '', motivoCancelamentoId = '' } = {}) {
  const BASE = String(baseUrl || 'https://api.feegow.com/v1').trim().replace(/\/$/, '').replace(/^http:\/\//i, 'https://')
  if (!token) throw new Error('Feegow: token (x-access-token) é obrigatório')
  const headers = { 'Content-Type': 'application/json', 'x-access-token': token }
  const cfg = { localId, motivoCancelamentoId }

  async function get(path) {
    const res = await fetch(`${BASE}${path.startsWith('/') ? '' : '/'}${path}`, { headers })
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText)
      throw new Error(`Feegow GET ${path} ${res.status}: ${body.slice(0, 200)}`)
    }
    return res.json()
  }

  // Proxy genérico controlado (só endpoints sob api/).
  async function request({ method, path, query, body }) {
    const m = String(method || 'GET').toUpperCase()
    if (!PROXY_ALLOWED_METHODS.has(m)) return { status: 405, ok: false, body: JSON.stringify({ error: 'Método não permitido' }), contentType: 'application/json' }
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

  // Teste de conectividade — o endpoint que você citou.
  async function status() { return request({ method: 'GET', path: 'api/appoints/status' }) }

  async function searchPacienteByCpf(cpf) {
    const clean = String(cpf).replace(/\D/g, '')
    const raw = await get(`/api/patient/search?cpf=${encodeURIComponent(clean)}`)
    return unwrapList(raw)[0] || null
  }

  // Cria paciente no Feegow. Mapeia o shape do ExameQR p/ os campos do Feegow.
  async function criarPaciente(d = {}) {
    const nome = String(d.nome || '').trim()
    if (!nome) throw new Error('nome é obrigatório')
    const body = { nome }
    if (d.cpf) body.cpf = String(d.cpf).replace(/\D/g, '')
    if (d.sexo) body.sexo = d.sexo === 'M' ? 'M' : d.sexo === 'F' ? 'F' : d.sexo
    const m = String(d.dataNascimento || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) body.nascimento = `${m[3]}/${m[2]}/${m[1]}`
    if (d.telefone) body.celular = String(d.telefone).replace(/\D/g, '')
    if (d.email) body.email = String(d.email).trim()
    const r = await request({ method: 'POST', path: 'api/patient/new', body })
    let parsed = null; if (r.body) { try { parsed = JSON.parse(r.body) } catch { parsed = r.body } }
    return { status: r.status, ok: r.ok, body: parsed }
  }

  // Horários disponíveis. Aceita objeto de params ou querystring (mesma assinatura do NetRis).
  async function horariosAgrupados(params = {}) {
    const q = new URLSearchParams(typeof params === 'string' ? params : params).toString()
    return request({ method: 'GET', path: 'api/appoints/available-schedule', query: q })
  }

  // Cria o agendamento. No Feegow é POST api/appoints/new-appoint (paciente,
  // profissional, procedimento, data, hora). Mantém o nome criarEncaixe p/ paridade.
  async function criarEncaixe(model = {}) {
    return request({ method: 'POST', path: 'api/appoints/new-appoint', body: model })
  }

  // Cancela um agendamento (motivo obrigatório no Feegow). Sem motivoId explícito,
  // usa o motivo padrão configurado para a empresa (motivoCancelamentoId) — o
  // Feegow não tem um id de motivo universal, cada clínica cadastra o seu.
  async function cancelarAgendamento(agendamentoId, motivoId = motivoCancelamentoId) {
    const r = await request({ method: 'POST', path: 'api/appoints/cancel-appoint', body: { agendamento_id: agendamentoId, motivo_id: motivoId } })
    let parsed = null; if (r.body) { try { parsed = JSON.parse(r.body) } catch { parsed = r.body } }
    return { status: r.status, ok: r.ok, body: parsed }
  }

  // Paridade com o NetRis: alterarSituacao. Só o cancelamento tem equivalente direto;
  // as demais situações são best-effort (o Feegow não expõe "marcar realizado" via API pública).
  async function alterarSituacao(agendamentoId, situacao) {
    if (situacao === SITUACAO.CANCELADO) return cancelarAgendamento(agendamentoId)
    return { status: 200, ok: true, body: { skipped: true, motivo: 'Feegow não altera situação por API; ignorado.' } }
  }

  return { config: cfg, get, request, status, searchPacienteByCpf, criarPaciente, horariosAgrupados, criarEncaixe, cancelarAgendamento, alterarSituacao }
}
