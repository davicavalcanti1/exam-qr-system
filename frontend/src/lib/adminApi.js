import { supabase } from './supabase'

async function token() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

async function req(method, path, body) {
  const t = await token()
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Erro na requisição')
  return data
}
const post = (path, body) => req('POST', path, body)

export const adminApi = {
  createUser: (payload) => post('/api/admin/users', payload),
  createParceiro: (payload) => post('/api/admin/parceiros', payload),
  buscarCnpj: (cnpj) => req('GET', `/api/cnpj/${String(cnpj).replace(/\D/g, '')}`),
  updateParceiro: (id, payload) => req('PUT', `/api/admin/parceiros/${id}`, payload),
  updateUser: (id, payload) => req('PATCH', `/api/admin/users/${id}`, payload),
  resetarSenha: (id) => post(`/api/admin/users/${id}/reset-senha`, {}),
  gerarQr: (exameId) => post('/api/qr/gerar', { exameId }),
  // integrações de agendamento
  listarProviders: () => req('GET', '/api/integracao/providers'),
  getIntegracao: () => req('GET', '/api/integracao'),
  salvarIntegracao: (payload) => req('PUT', '/api/integracao', payload),
  testarIntegracao: (payload) => post('/api/integracao/testar', payload || {}),
  // console NetRis (dentro do sistema)
  netrisStatus: () => req('GET', '/api/netris/status'),
  netrisPaciente: (cpf, raw = false) => req('GET', `/api/netris/pacientes/cpf/${encodeURIComponent(cpf)}${raw ? '?raw=1' : ''}`),
  netrisCriarPaciente: (dados) => post('/api/netris/pacientes', dados),
  // mapeamento (Fase 4)
  updateParceiroNetris: (id, payload) => req('PUT', `/api/admin/parceiros/${id}/netris`, payload),
  netrisPlanos: (page = 1) => req('GET', `/api/netris/planos?page=${page}`),
  netrisProcedimentos: (page = 1, idPlanoConvenio) => req('GET', `/api/netris/procedimentos?page=${page}${idPlanoConvenio ? `&idPlanoConvenio=${idPlanoConvenio}` : ''}`),
  // agendamento no fluxo do exame
  netrisHorariosExame: (exameId, dataInicial, dataFinal) => req('GET', `/api/netris/horarios-exame?exameId=${exameId}&dataInicial=${dataInicial}&dataFinal=${dataFinal}`),
  netrisHorariosCatalogo: ({ procedimentoId, parceiroId, idPaciente, pesoPaciente, dataInicial, dataFinal }) =>
    req('GET', `/api/netris/horarios-catalogo?procedimentoId=${procedimentoId}&parceiroId=${parceiroId}&idPaciente=${idPaciente}&pesoPaciente=${pesoPaciente || 70}&dataInicial=${dataInicial}&dataFinal=${dataFinal}`),
  netrisAgendarExame: (exameId, slot) => post('/api/netris/agendar-exame', { exameId, slot }),
  netrisCancelarExame: (exameId) => post('/api/netris/cancelar-exame', { exameId }),
}

// carrega todas as páginas de uma listagem NetRis (planos/procedimentos)
export async function carregarTudo(fetchPage, chave) {
  const acc = []
  for (let page = 1; page <= 30; page++) {
    const r = await fetchPage(page)
    const arr = r[chave] || []
    acc.push(...arr)
    if (arr.length < 100) break
  }
  return acc
}

// "João da Silva" -> "joao.silva"
export function sugerirUsername(nome) {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s.]/g, '')
    .trim().split(/\s+/).filter(Boolean).join('.')
}
