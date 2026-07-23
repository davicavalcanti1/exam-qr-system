import { Router } from 'express'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { supabaseAdmin, supabaseConfigured, getCaller } from '../lib/supabaseAdmin.js'
import { agendaParaEmpresa } from '../integrations/agenda.js'
import { SITUACAO } from '../integrations/netris/client.js'
import { logAudit } from '../lib/audit.js'
import { gerarKitPdf } from '../utils/qrKitPdf.js'
import { enviarDocumentoWhatsapp, uazapiConfigurado } from '../integrations/uazapi/client.js'

const router = Router()

// Garante um token de QR ativo para o exame (cria se não existir). Retorna o token.
async function garantirQrToken(exame) {
  let { data: qr } = await supabaseAdmin
    .from('qr_codes').select('token').eq('exame_id', exame.id).eq('status', 'ativo').maybeSingle()
  if (!qr) {
    const token = crypto.randomUUID()
    const { data: novo, error } = await supabaseAdmin.from('qr_codes')
      .insert({ empresa_id: exame.empresa_id, parceiro_id: exame.parceiro_id, exame_id: exame.id, token, status: 'ativo' })
      .select('token').single()
    if (error) throw new Error(error.message)
    qr = novo
  }
  return qr.token
}

const brData = (s) => s
  ? new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : null

// Quem pode gerar/enviar o comprovante do exame.
function podeVerExame(p, ex) {
  if (p.role === 'owner') return true
  if (['empresa_admin', 'empresa_operador'].includes(p.role)) return p.empresa_id === ex.empresa_id
  if (p.role === 'parceiro_coordenador') return p.parceiro_id === ex.parceiro_id
  return false
}

// Monta os "tickets" (dados + QR) de uma lista de exames elegíveis, com branding cacheado.
async function montarTickets(elegiveis) {
  const cache = {}
  async function branding(empresaId) {
    if (cache[empresaId]) return cache[empresaId]
    const { data: emp } = await supabaseAdmin.from('empresas').select('nome, nome_exibicao, logo_url').eq('id', empresaId).maybeSingle()
    let logoBuf = null
    if (emp?.logo_url) { try { const r = await fetch(emp.logo_url); if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer()) } catch { /* sem logo */ } }
    return (cache[empresaId] = { nome: emp?.nome_exibicao || emp?.nome || 'Clínica', logoBuf })
  }
  const tickets = []
  for (const ex of elegiveis) {
    const token = await garantirQrToken(ex)
    const qrBuf = await QRCode.toBuffer(token, { width: 300, margin: 1, errorCorrectionLevel: 'H' })
    const b = await branding(ex.empresa_id)
    tickets.push({
      paciente: ex.pacientes?.nome || '—', exame: ex.nome || '—', quando: brData(ex.scheduled_at),
      protocolo: token.slice(0, 8).toUpperCase(), empresaNome: b.nome, logoBuf: b.logoBuf, qrBuf,
    })
  }
  return tickets
}

// Carrega os exames dos ids, filtrando por permissão do caller e status elegível.
async function carregarElegiveis(p, exameIds, campos) {
  const { data: exames } = await supabaseAdmin
    .from('exames').select(campos).in('id', exameIds).order('created_at')
  return (exames || []).filter(ex => podeVerExame(p, ex) && ['autorizado', 'realizado'].includes(ex.status))
}

// Gera um PDF de comprovantes (1..N) — individual (1 id) ou kit em lote para o parceiro.
router.post('/pdf', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  const { exameIds } = req.body || {}
  if (!Array.isArray(exameIds) || exameIds.length === 0) return res.status(400).json({ error: 'exameIds é obrigatório' })

  const elegiveis = await carregarElegiveis(p, exameIds, 'id, empresa_id, parceiro_id, status, nome, scheduled_at, created_at, pacientes(nome)')
  if (elegiveis.length === 0) return res.status(400).json({ error: 'Nenhum exame elegível (precisa estar autorizado e você ter acesso).' })

  const tickets = await montarTickets(elegiveis)
  const pdf = await gerarKitPdf(tickets)
  logAudit({ empresaId: elegiveis[0].empresa_id, atorId: p.id, atorNome: p.nome || p.role, acao: 'qr.pdf_gerado', entidade: 'exame', entidadeId: elegiveis[0].id, detalhe: { qtd: tickets.length } })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="comprovantes-${tickets.length}.pdf"`)
  res.send(pdf)
})

// Envia o(s) comprovante(s) por WhatsApp — ao paciente (cada um o seu) ou ao parceiro (1 PDF com todos).
router.post('/enviar-whatsapp', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  const { exameIds, destino } = req.body || {}
  if (!Array.isArray(exameIds) || exameIds.length === 0) return res.status(400).json({ error: 'exameIds é obrigatório' })
  if (!['paciente', 'parceiro'].includes(destino)) return res.status(400).json({ error: "destino deve ser 'paciente' ou 'parceiro'" })
  if (!uazapiConfigurado()) return res.status(400).json({ error: 'WhatsApp (uazapi) não está configurado no servidor.' })

  const elegiveis = await carregarElegiveis(p, exameIds, 'id, empresa_id, parceiro_id, status, nome, scheduled_at, created_at, pacientes(nome, telefone)')
  if (elegiveis.length === 0) return res.status(400).json({ error: 'Nenhum exame elegível (precisa estar autorizado e você ter acesso).' })

  if (destino === 'parceiro') {
    const parceiroId = elegiveis[0].parceiro_id
    const { data: parc } = await supabaseAdmin.from('parceiros').select('nome, whatsapp').eq('id', parceiroId).maybeSingle()
    if (!parc?.whatsapp) return res.status(400).json({ error: 'Parceiro sem WhatsApp cadastrado.' })
    const pdf = await gerarKitPdf(await montarTickets(elegiveis))
    const r = await enviarDocumentoWhatsapp(parc.whatsapp, {
      base64: pdf.toString('base64'),
      filename: `comprovantes-${elegiveis.length}.pdf`,
      caption: `Segue ${elegiveis.length} comprovante(s) de exame.`,
    })
    logAudit({ empresaId: elegiveis[0].empresa_id, atorId: p.id, atorNome: p.nome || p.role, acao: 'qr.whatsapp_enviado', entidade: 'exame', entidadeId: elegiveis[0].id, detalhe: { destino: 'parceiro', qtd: elegiveis.length, ok: !!r.ok } })
    if (!r.ok) return res.status(502).json({ ok: false, error: `WhatsApp recusou (${r.motivo || 'HTTP ' + r.status})`, upstream: r.body })
    return res.json({ ok: true, destino: 'parceiro', enviados: elegiveis.length, parceiro: parc.nome })
  }

  // destino = paciente: cada paciente recebe o SEU comprovante
  const resultados = []
  for (const ex of elegiveis) {
    const tel = ex.pacientes?.telefone
    if (!tel) { resultados.push({ paciente: ex.pacientes?.nome || '—', ok: false, motivo: 'sem telefone cadastrado' }); continue }
    const pdf = await gerarKitPdf(await montarTickets([ex]))
    const r = await enviarDocumentoWhatsapp(tel, {
      base64: pdf.toString('base64'),
      filename: 'comprovante.pdf',
      caption: `Olá! Segue o comprovante do seu exame: ${ex.nome}.`,
    })
    resultados.push({ paciente: ex.pacientes?.nome || '—', ok: !!r.ok, motivo: r.ok ? 'enviado' : (r.motivo || `HTTP ${r.status}`) })
  }
  const enviados = resultados.filter(x => x.ok).length
  logAudit({ empresaId: elegiveis[0].empresa_id, atorId: p.id, atorNome: p.nome || p.role, acao: 'qr.whatsapp_enviado', entidade: 'exame', entidadeId: elegiveis[0].id, detalhe: { destino: 'paciente', enviados, total: elegiveis.length } })
  res.json({ ok: enviados > 0, destino: 'paciente', enviados, total: elegiveis.length, resultados })
})

// Gera (ou reaproveita) o QR de um exame AUTORIZADO. Auth: coordenador/empresa/owner.
router.post('/gerar', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  const { exameId } = req.body || {}
  if (!exameId) return res.status(400).json({ error: 'exameId é obrigatório' })

  const { data: exame } = await supabaseAdmin
    .from('exames').select('id, empresa_id, parceiro_id, status, nome, scheduled_at, pacientes(nome)').eq('id', exameId).maybeSingle()
  if (!exame) return res.status(404).json({ error: 'Exame não encontrado' })

  const podeEmpresa = p.role === 'owner' || (p.role === 'empresa_admin' && p.empresa_id === exame.empresa_id)
  const podeParceiro = p.role === 'parceiro_coordenador' && p.parceiro_id === exame.parceiro_id
  if (!podeEmpresa && !podeParceiro) return res.status(403).json({ error: 'Sem permissão para gerar o QR' })

  if (exame.status !== 'autorizado' && exame.status !== 'realizado') {
    return res.status(400).json({ error: 'O exame precisa estar autorizado para gerar o QR.' })
  }

  let { data: qr } = await supabaseAdmin
    .from('qr_codes').select('id, token').eq('exame_id', exameId).eq('status', 'ativo').maybeSingle()
  if (!qr) {
    const token = crypto.randomUUID()
    const { data: novo, error } = await supabaseAdmin.from('qr_codes')
      .insert({ empresa_id: exame.empresa_id, parceiro_id: exame.parceiro_id, exame_id: exameId, token, status: 'ativo' })
      .select('id, token').single()
    if (error) return res.status(400).json({ error: error.message })
    qr = novo
  }
  const dataUrl = await QRCode.toDataURL(qr.token, { width: 320, margin: 2, errorCorrectionLevel: 'H' })
  // Dados do comprovante (para o PDF do paciente). Sem valor — paciente não vê preço.
  const { data: emp } = await supabaseAdmin.from('empresas').select('nome, nome_exibicao, logo_url').eq('id', exame.empresa_id).maybeSingle()
  const comprovante = {
    paciente: exame?.pacientes?.nome || '—',
    exame: exame?.nome || '—',
    scheduledAt: exame?.scheduled_at || null,
    protocolo: qr.token.slice(0, 8).toUpperCase(),
    empresa: emp ? { nome: emp.nome_exibicao || emp.nome, logo: emp.logo_url || null } : null,
  }
  res.json({ token: qr.token, dataUrl, comprovante })
})

// Valida o QR no scan (público) e marca o exame como REALIZADO.
router.post('/validar', async (req, res) => {
  if (!supabaseConfigured()) return res.status(503).json({ valid: false, error: 'Supabase não configurado no servidor' })
  const { token } = req.body || {}
  if (!token) return res.status(400).json({ valid: false, error: 'Token ausente' })

  const { data: qr } = await supabaseAdmin.from('qr_codes').select('id, exame_id, status').eq('token', token).maybeSingle()
  if (!qr) return res.json({ valid: false, error: 'QR não encontrado neste sistema' })
  if (qr.status !== 'ativo') return res.json({ valid: false, error: 'QR já utilizado ou revogado' })

  const { data: exame } = await supabaseAdmin
    .from('exames').select('id, nome, status, empresa_id, netris_atendimento_id, pacientes(nome)').eq('id', qr.exame_id).maybeSingle()
  if (!exame) return res.json({ valid: false, error: 'Exame vinculado ao QR não encontrado' })

  const { data: upd, error: exErr } = await supabaseAdmin
    .from('exames').update({ status: 'realizado', realizado_at: new Date().toISOString() }).eq('id', qr.exame_id).select('id')
  if (exErr) return res.status(400).json({ valid: false, error: `Falha ao marcar realizado: ${exErr.message}` })
  if (!upd || upd.length === 0) {
    return res.status(500).json({ valid: false, error: 'Nenhuma linha atualizada — verifique se SUPABASE_SERVICE_ROLE_KEY (backend) é a chave service_role real, não a anon.' })
  }

  const { error: qrErr } = await supabaseAdmin
    .from('qr_codes').update({ status: 'usado', used_at: new Date().toISOString() }).eq('id', qr.id)
  if (qrErr) return res.status(400).json({ valid: false, error: `Falha ao baixar o QR: ${qrErr.message}` })

  // Best-effort: no scan o paciente vai para "ATENDIMENTO RECEPÇÃO" (id 11) no NetRis.
  // "Exame realizado" (18) é uma etapa posterior, não acontece aqui.
  let netris = null
  if (exame.netris_atendimento_id) {
    try {
      const client = await agendaParaEmpresa(exame.empresa_id)
      if (client) {
        const r = await client.alterarSituacao(exame.netris_atendimento_id, SITUACAO.ATENDIMENTO_RECEPCAO)
        netris = r.ok ? 'confirmado' : 'falhou'
      }
    } catch { netris = 'falhou' }
  }

  // Marca da empresa (white-label) para exibir na confirmação.
  const { data: emp } = await supabaseAdmin
    .from('empresas').select('nome, nome_exibicao, logo_url').eq('id', exame.empresa_id).maybeSingle()
  const empresa = emp ? { nome: emp.nome_exibicao || emp.nome, logo: emp.logo_url || null } : null

  logAudit({ empresaId: exame.empresa_id, atorNome: 'Leitor (scan público)', acao: 'qr.validado', entidade: 'exame', entidadeId: exame.id, detalhe: { paciente: exame?.pacientes?.nome, exame: exame?.nome, netris } })

  // valor NUNCA é exposto no scan (tela vista pelo paciente na recepção).
  res.json({ valid: true, paciente: exame?.pacientes?.nome || '—', exame: exame?.nome || '—', empresa, netris })
})

export default router
