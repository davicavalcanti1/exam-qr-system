import { supabase } from './supabase'
import { API_BASE } from './apiBase'

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
  // SSO — quem, de fora, entra aqui. Restrito a owner no servidor.
  ssoTenants:        ()            => req('GET',    `${API_BASE}/sso-admin/tenants`),
  ssoSalvarTenant:   (payload)     => post(`${API_BASE}/sso-admin/tenants`, payload),
  ssoRemoverTenant:  (coTenantId)  => req('DELETE', `${API_BASE}/sso-admin/tenants/${coTenantId}`),
  ssoPapeis:         ()            => req('GET',    `${API_BASE}/sso-admin/papeis`),
  ssoSalvarPapel:    (payload)     => post(`${API_BASE}/sso-admin/papeis`, payload),
  ssoDuplicados:     ()            => req('GET',    `${API_BASE}/sso-admin/duplicados`),
  ssoVinculos:       ()            => req('GET',    `${API_BASE}/sso-admin/vinculos`),
  ssoSalvarVinculo:  (payload)     => post(`${API_BASE}/sso-admin/vinculos`, payload),
  ssoRemoverVinculo: (origemEmail) => req('DELETE', `${API_BASE}/sso-admin/vinculos/${encodeURIComponent(origemEmail)}`),
  createUser: (payload) => post(`${API_BASE}/admin/users`, payload),
  createParceiro: (payload) => post(`${API_BASE}/admin/parceiros`, payload),
  updateParceiro: (id, payload) => req('PUT', `${API_BASE}/admin/parceiros/${id}`, payload),
  updateUser: (id, payload) => req('PATCH', `${API_BASE}/admin/users/${id}`, payload),
  excluirUser: (id) => req('DELETE', `${API_BASE}/admin/users/${id}`),
  resetarSenha: (id) => post(`${API_BASE}/admin/users/${id}/reset-senha`, {}),
  gerarQr: (exameId) => post(`${API_BASE}/qr/gerar`, { exameId }),
  // PDF de comprovantes (1 = individual do paciente; N = kit em lote pro parceiro)
  gerarQrPdf: (exameIds, filename) => baixarArquivo(`${API_BASE}/qr/pdf`, { exameIds }, filename),
  // envia o comprovante (PDF) por WhatsApp — destino: 'paciente' | 'parceiro'
  enviarComprovanteWhatsapp: (exameIds, destino) => post(`${API_BASE}/qr/enviar-whatsapp`, { exameIds, destino }),
  criarLoteAutorizacao: ({ exameIds, parceiroId, empresaId }) => post(`${API_BASE}/autorizacao/lotes`, { exameIds, parceiroId, empresaId }),
  // agenda no NetRis os exames de um lote já confirmado pelo parceiro
  agendarLoteNetris: (token) => post(`${API_BASE}/autorizacao/${token}/agendar-netris`, {}),
  // integrações de agendamento (empresaId opcional: owner configura por empresa)
  listarProviders: () => req('GET', `${API_BASE}/integracao/providers`),
  getIntegracao: (empresaId) => req('GET', `${API_BASE}/integracao${empresaId ? `?empresaId=${empresaId}` : ''}`),
  salvarIntegracao: (payload) => req('PUT', `${API_BASE}/integracao`, payload),
  testarIntegracao: (payload) => post(`${API_BASE}/integracao/testar`, payload || {}),
  // console NetRis (dentro do sistema)
  netrisStatus: (empresaId) => req('GET', `${API_BASE}/netris/status${empresaId ? `?empresaId=${empresaId}` : ''}`),
  netrisPaciente: (cpf, raw = false, empresaId) => req('GET', `${API_BASE}/netris/pacientes/cpf/${encodeURIComponent(cpf)}?${raw ? `raw=1&` : ''}${empresaId ? `empresaId=${empresaId}` : ''}`),
  netrisCriarPaciente: (dados) => post(`${API_BASE}/netris/pacientes`, dados),
  // mapeamento (Fase 4)
  updateParceiroNetris: (id, payload) => req('PUT', `${API_BASE}/admin/parceiros/${id}/netris`, payload),
  netrisPlanos: (page = 1, empresaId) => req('GET', `${API_BASE}/netris/planos?page=${page}${empresaId ? `&empresaId=${empresaId}` : ''}`),
  netrisProcedimentos: (page = 1, idPlanoConvenio, empresaId) => req('GET', `${API_BASE}/netris/procedimentos?page=${page}${idPlanoConvenio ? `&idPlanoConvenio=${idPlanoConvenio}` : ''}${empresaId ? `&empresaId=${empresaId}` : ''}`),
  // agendamento no fluxo do exame
  netrisHorariosExame: (exameId, dataInicial, dataFinal) => req('GET', `${API_BASE}/netris/horarios-exame?exameId=${exameId}&dataInicial=${dataInicial}&dataFinal=${dataFinal}`),
  netrisHorariosCatalogo: ({ procedimentoId, parceiroId, idPaciente, pesoPaciente, dataInicial, dataFinal }) =>
    req('GET', `${API_BASE}/netris/horarios-catalogo?procedimentoId=${procedimentoId}&parceiroId=${parceiroId}&idPaciente=${idPaciente}&pesoPaciente=${pesoPaciente || 70}&dataInicial=${dataInicial}&dataFinal=${dataFinal}`),
  netrisAgendarExame: (exameId, slot) => post(`${API_BASE}/netris/agendar-exame`, { exameId, slot }),
  netrisCancelarExame: (exameId) => post(`${API_BASE}/netris/cancelar-exame`, { exameId }),
  // console Feegow — mesmo contrato do NetRis (Fase 4)
  feegowStatus: (empresaId) => req('GET', `${API_BASE}/feegow/status${empresaId ? `?empresaId=${empresaId}` : ''}`),

  // Dispatch agnóstico de provider para o AgendarModal — 'netris' ou 'feegow'
  // conforme a integração ativa da empresa (ver netrisStatus/feegowStatus).
  horariosExame: (provider, exameId, dataInicial, dataFinal) =>
    req('GET', `${API_BASE}/${provider}/horarios-exame?exameId=${exameId}&dataInicial=${dataInicial}&dataFinal=${dataFinal}`),
  agendarExameAgenda: (provider, exameId, slot) => post(`${API_BASE}/${provider}/agendar-exame`, { exameId, slot }),
  cancelarExameAgenda: (provider, exameId) => post(`${API_BASE}/${provider}/cancelar-exame`, { exameId }),

  // ── ZapSign: assinatura eletrônica de contrato e DPA ──────────────────────
  // empresaId é opcional e só o owner usa (ele configura por empresa). O token
  // nunca trafega de volta: o GET só diz SE existe um guardado.
  zapsignConfig: (empresaId) => req('GET', `${API_BASE}/zapsign/config${empresaId ? `?empresaId=${empresaId}` : ''}`),
  zapsignSalvarConfig: (payload) => req('PUT', `${API_BASE}/zapsign/config`, payload),
  zapsignTestar: (payload) => post(`${API_BASE}/zapsign/testar`, payload || {}),
  zapsignEnviarContrato: (contratoId, empresaId) =>
    post(`${API_BASE}/zapsign/contratos/${contratoId}/enviar`, empresaId ? { empresaId } : {}),
  zapsignEnviarDpa: ({ versao, titulo, conteudo, empresaId }) =>
    post(`${API_BASE}/zapsign/dpa/enviar`, { versao, titulo, conteudo, ...(empresaId ? { empresaId } : {}) }),
  zapsignStatus: (tipo, id, empresaId) =>
    req('GET', `${API_BASE}/zapsign/status/${tipo}/${id}${empresaId ? `?empresaId=${empresaId}` : ''}`),
  // devolve { url } — assinada e válida por 5 minutos (o bucket é privado)
  zapsignArquivo: (tipo, id) => req('GET', `${API_BASE}/zapsign/arquivo/${tipo}/${id}`),

  // ── Asaas: cobrança automática do lote (PIX/boleto) ───────────────────────
  // Mesmo contrato do ZapSign — empresaId opcional (só o owner usa), token
  // nunca trafega de volta.
  asaasConfig: (empresaId) => req('GET', `${API_BASE}/asaas/config${empresaId ? `?empresaId=${empresaId}` : ''}`),
  asaasSalvarConfig: (payload) => req('PUT', `${API_BASE}/asaas/config`, payload),
  asaasTestar: (payload) => post(`${API_BASE}/asaas/testar`, payload || {}),
  asaasGerarPagamento: (cobrancaId) => post(`${API_BASE}/asaas/cobrancas/${cobrancaId}/gerar-pagamento`, {}),
  asaasStatusCobranca: (cobrancaId) => req('GET', `${API_BASE}/asaas/cobrancas/${cobrancaId}/status`),
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

// "João da Silva Pereira" -> "joao.pereira": primeiro nome + ÚLTIMO sobrenome.
export function sugerirUsername(nome) {
  const partes = String(nome || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s.]/g, '')
    .trim().split(/\s+/).filter(Boolean)
  if (partes.length <= 1) return partes.join('')
  return `${partes[0]}.${partes[partes.length - 1]}`
}
