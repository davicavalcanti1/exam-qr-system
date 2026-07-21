import { Router } from 'express'
import crypto from 'crypto'
import { supabaseAdmin, supabaseConfigured, getCaller } from '../lib/supabaseAdmin.js'
import { enviarTextoWhatsapp, uazapiConfigurado } from '../integrations/uazapi/client.js'
import { logAudit } from '../lib/audit.js'

const router = Router()

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const appUrl = (req) => (process.env.APP_URL || `https://${req.get('host')}`).replace(/\/$/, '')

// Cria um lote de autorização a partir de exames selecionados e (se possível)
// envia o link ao WhatsApp do parceiro. Auth: empresa-level (owner/empresa_admin).
router.post('/lotes', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  if (!['owner', 'empresa_admin'].includes(p.role)) return res.status(403).json({ error: 'Sem permissão' })

  const { exameIds, parceiroId, empresaId: bodyEmpresa } = req.body || {}
  const empresa_id = p.role === 'owner' ? bodyEmpresa : p.empresa_id
  if (!empresa_id || !parceiroId || !Array.isArray(exameIds) || exameIds.length === 0) {
    return res.status(400).json({ error: 'empresaId, parceiroId e exameIds são obrigatórios' })
  }

  // valida os exames: da empresa+parceiro, aguardando autorização e ainda sem lote
  const { data: exames } = await supabaseAdmin
    .from('exames').select('id, status, autorizacao_lote_id')
    .in('id', exameIds).eq('empresa_id', empresa_id).eq('parceiro_id', parceiroId)
  const validos = (exames || []).filter(e => e.status === 'aguardando_autorizacao' && !e.autorizacao_lote_id).map(e => e.id)
  if (validos.length === 0) return res.status(400).json({ error: 'Nenhum exame elegível (precisa estar aguardando autorização e sem lote).' })

  const token = crypto.randomUUID()
  const { data: lote, error: lErr } = await supabaseAdmin.from('autorizacao_lotes')
    .insert({ empresa_id, parceiro_id: parceiroId, token, criado_por: p.id }).select('id, token').single()
  if (lErr) return res.status(400).json({ error: lErr.message })

  const { error: upErr } = await supabaseAdmin.from('exames').update({ autorizacao_lote_id: lote.id }).in('id', validos)
  if (upErr) return res.status(400).json({ error: upErr.message })

  const link = `${appUrl(req)}/autorizar/${token}`

  // envio WhatsApp (best-effort)
  let whatsapp = { enviado: false, motivo: 'não enviado' }
  const { data: parc } = await supabaseAdmin.from('parceiros').select('nome, whatsapp').eq('id', parceiroId).maybeSingle()
  const { data: emp } = await supabaseAdmin.from('empresas').select('nome, nome_exibicao').eq('id', empresa_id).maybeSingle()
  const marca = emp?.nome_exibicao || emp?.nome || 'a clínica'
  if (parc?.whatsapp && uazapiConfigurado()) {
    const msg = `Olá! ${marca} enviou ${validos.length} exame(s) para sua confirmação.\nAcesse, confira e autorize:\n${link}`
    const r = await enviarTextoWhatsapp(parc.whatsapp, msg)
    whatsapp = { enviado: !!r.ok, motivo: r.ok ? 'enviado' : (r.motivo || `HTTP ${r.status}`) }
  } else if (!uazapiConfigurado()) {
    whatsapp.motivo = 'uazapi não configurado'
  } else if (!parc?.whatsapp) {
    whatsapp.motivo = 'parceiro sem WhatsApp cadastrado'
  }

  logAudit({ empresaId: empresa_id, atorId: p.id, atorNome: p.role, acao: 'autorizacao.lote_gerado', entidade: 'lote', entidadeId: lote.id, detalhe: { qtd: validos.length, whatsapp: whatsapp.enviado } })
  res.status(201).json({ ok: true, token, link, qtd: validos.length, whatsapp })
})

// Leitura PÚBLICA do lote (a página /autorizar/:token usa antes do login).
router.get('/:token', async (req, res) => {
  if (!supabaseConfigured()) return res.status(503).json({ error: 'Supabase não configurado' })
  const { token } = req.params
  const { data: lote } = await supabaseAdmin
    .from('autorizacao_lotes').select('id, status, empresa_id, parceiro_id, confirmado_at').eq('token', token).maybeSingle()
  if (!lote) return res.status(404).json({ error: 'Link inválido ou expirado' })

  const [{ data: emp }, { data: parc }, { data: exames }] = await Promise.all([
    supabaseAdmin.from('empresas').select('nome, nome_exibicao, logo_url').eq('id', lote.empresa_id).maybeSingle(),
    supabaseAdmin.from('parceiros').select('nome').eq('id', lote.parceiro_id).maybeSingle(),
    supabaseAdmin.from('exames').select('id, nome, valor, scheduled_at, pacientes(nome)').eq('autorizacao_lote_id', lote.id).order('created_at'),
  ])
  const itens = (exames || []).map(e => ({ paciente: e.pacientes?.nome || '—', exame: e.nome, valor: e.valor, valorFmt: fmt(e.valor), scheduled_at: e.scheduled_at }))
  res.json({
    status: lote.status,
    confirmadoAt: lote.confirmado_at,
    empresa: { nome: emp?.nome_exibicao || emp?.nome || '—', logo: emp?.logo_url || null },
    parceiro: parc?.nome || '—',
    total: itens.length,
    totalValor: fmt(itens.reduce((s, i) => s + Number(i.valor || 0), 0)),
    itens,
  })
})

export default router
