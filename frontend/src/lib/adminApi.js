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

// POST que retorna um arquivo (PDF) e dispara o download no navegador.
async function baixarArquivo(path, body, filename) {
  const t = await token()
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Falha ao gerar o arquivo') }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename || 'arquivo.pdf'
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export const adminApi = {
  createUser: (payload) => post('/api/admin/users', payload),
  createParceiro: (payload) => post('/api/admin/parceiros', payload),
  updateParceiro: (id, payload) => req('PUT', `/api/admin/parceiros/${id}`, payload),
  updateUser: (id, payload) => req('PATCH', `/api/admin/users/${id}`, payload),
  excluirUser: (id) => req('DELETE', `/api/admin/users/${id}`),
  resetarSenha: (id) => post(`/api/admin/users/${id}/reset-senha`, {}),
  gerarQr: (exameId) => post('/api/qr/gerar', { exameId }),
  // PDF de comprovantes (1 = individual do paciente; N = kit em lote pro parceiro)
  gerarQrPdf: (exameIds, filename) => baixarArquivo('/api/qr/pdf', { exameIds }, filename),
  // envia o comprovante (PDF) por WhatsApp — destino: 'paciente' | 'parceiro'
  enviarComprovanteWhatsapp: (exameIds, destino) => post('/api/qr/enviar-whatsapp', { exameIds, destino }),
  criarLoteAutorizacao: ({ exameIds, parceiroId, empresaId }) => post('/api/autorizacao/lotes', { exameIds, parceiroId, empresaId }),
  // agenda no NetRis os exames de um lote já confirmado pelo parceiro
  agendarLoteNetris: (token) => post(`/api/autorizacao/${token}/agendar-netris`, {}),
  // integrações de agendamento (empresaId opcional: owner configura por empresa)
  listarProviders: () => req('GET', '/api/integracao/providers'),
  getIntegracao: (empresaId) => req('GET', `/api/integracao${empresaId ? `?empresaId=${empresaId}` : ''}`),
  salvarIntegracao: (payload) => req('PUT', '/api/integracao', payload),
  testarIntegracao: (payload) => post('/api/integracao/testar', payload || {}),
  // console NetRis (dentro do sistema)
  netrisStatus: (empresaId) => req('GET', `/api/netris/status${empresaId ? `?empresaId=${empresaId}` : ''}`),
  netrisPaciente: (cpf, raw = false, empresaId) => req('GET', `/api/netris/pacientes/cpf/${encodeURIComponent(cpf)}?${raw ? 'raw=1&' : ''}${empresaId ? `empresaId=${empresaId}` : ''}`),
  netrisCriarPaciente: (dados) => post('/api/netris/pacientes', dados),
  // mapeamento (Fase 4)
  updateParceiroNetris: (id, payload) => req('PUT', `/api/admin/parceiros/${id}/netris`, payload),
  netrisPlanos: (page = 1, empresaId) => req('GET', `/api/netris/planos?page=${page}${empresaId ? `&empresaId=${empresaId}` : ''}`),
  netrisProcedimentos: (page = 1, idPlanoConvenio, empresaId) => req('GET', `/api/netris/procedimentos?page=${page}${idPlanoConvenio ? `&idPlanoConvenio=${idPlanoConvenio}` : ''}${empresaId ? `&empresaId=${empresaId}` : ''}`),
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
