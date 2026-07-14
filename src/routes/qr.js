import { Router } from 'express'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { supabaseAdmin, supabaseConfigured, getCaller } from '../lib/supabaseAdmin.js'
import { netrisParaEmpresa } from '../lib/netrisEmpresa.js'
import { SITUACAO } from '../lib/netris.js'

const router = Router()

// Gera (ou reaproveita) o QR de um exame AUTORIZADO. Auth: coordenador/empresa/owner.
router.post('/gerar', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  const { exameId } = req.body || {}
  if (!exameId) return res.status(400).json({ error: 'exameId é obrigatório' })

  const { data: exame } = await supabaseAdmin
    .from('exames').select('id, empresa_id, parceiro_id, status').eq('id', exameId).maybeSingle()
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
  res.json({ token: qr.token, dataUrl })
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
    .from('exames').select('id, nome, valor, status, empresa_id, netris_atendimento_id, pacientes(nome)').eq('id', qr.exame_id).maybeSingle()
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

  // Best-effort: reflete a realização no NetRis, se a empresa usa e há atendimento vinculado.
  let netris = null
  if (exame.netris_atendimento_id) {
    try {
      const client = await netrisParaEmpresa(exame.empresa_id)
      if (client) {
        const r = await client.alterarSituacao(exame.netris_atendimento_id, SITUACAO.EXAME_REALIZADO)
        netris = r.ok ? 'confirmado' : 'falhou'
      }
    } catch { netris = 'falhou' }
  }

  res.json({ valid: true, paciente: exame?.pacientes?.nome || '—', exame: exame?.nome || '—', valor: exame?.valor ?? null, netris })
})

export default router
