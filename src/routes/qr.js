import { Router } from 'express'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { supabaseAdmin, supabaseConfigured, getCaller } from '../lib/supabaseAdmin.js'
import { podeVerExame } from '../lib/permissoes.js'
import { agendaParaEmpresa } from '../integrations/agenda.js'
import { SITUACAO as NETRIS_SITUACAO } from '../integrations/netris/client.js'
import { logAudit } from '../lib/audit.js'
import { gerarKitPdf } from '../utils/qrKitPdf.js'
import { enviarDocumentoWhatsapp, uazapiConfigurado } from '../integrations/uazapi/client.js'

const router = Router()

// Garante um token de QR para o exame. Retorna o token.
//
// Só emite token NOVO para exame `autorizado`. Para um exame já `realizado` a
// reimpressão reaproveita o token que existe — antes, cada reimpressão cunhava um
// token novo e válido, o que permitia escanear o mesmo exame quantas vezes se
// quisesse, sobrescrevendo `realizado_at` e podendo mover o exame de período de
// faturamento.
async function garantirQrToken(exame) {
  const { data: ativo } = await supabaseAdmin
    .from('qr_codes').select('token').eq('exame_id', exame.id).eq('status', 'ativo').maybeSingle()
  if (ativo) return ativo.token

  // Sem QR ativo: se o exame não está mais autorizado, reaproveita o último
  // emitido (serve para reimprimir o comprovante de um exame já realizado).
  if (exame.status !== 'autorizado') {
    const { data: ultimo } = await supabaseAdmin
      .from('qr_codes').select('token').eq('exame_id', exame.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (ultimo) return ultimo.token
  }

  const token = crypto.randomUUID()
  const { data: novo, error } = await supabaseAdmin.from('qr_codes')
    .insert({ empresa_id: exame.empresa_id, parceiro_id: exame.parceiro_id, exame_id: exame.id, token, status: 'ativo' })
    .select('token').single()
  if (error) throw new Error(error.message)
  return novo.token
}

const brData = (s) => s
  ? new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : null

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

  let token
  try {
    token = await garantirQrToken(exame)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  const dataUrl = await QRCode.toDataURL(token, { width: 320, margin: 2, errorCorrectionLevel: 'H' })
  // Dados do comprovante (para o PDF do paciente). Sem valor — paciente não vê preço.
  const { data: emp } = await supabaseAdmin.from('empresas').select('nome, nome_exibicao, logo_url').eq('id', exame.empresa_id).maybeSingle()
  const comprovante = {
    paciente: exame?.pacientes?.nome || '—',
    exame: exame?.nome || '—',
    scheduledAt: exame?.scheduled_at || null,
    protocolo: token.slice(0, 8).toUpperCase(),
    empresa: emp ? { nome: emp.nome_exibicao || emp.nome, logo: emp.logo_url || null } : null,
  }
  res.json({ token, dataUrl, comprovante })
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

  // É o ESTADO DO EXAME que decide, não só o do QR. Sem esta checagem, um
  // comprovante já impresso (ou já enviado por WhatsApp) de um exame cancelado
  // voltava o exame para 'realizado' e o parceiro era cobrado por ele.
  if (exame.status !== 'autorizado') {
    const motivos = {
      cancelado: 'Este exame foi cancelado — o comprovante não vale mais.',
      realizado: 'Este exame já foi confirmado anteriormente.',
      aguardando_autorizacao: 'Este exame ainda não foi autorizado pelo parceiro.',
    }
    // Comprovante de exame cancelado não deve seguir circulando como válido.
    if (exame.status === 'cancelado') {
      await supabaseAdmin.from('qr_codes').update({ status: 'revogado' }).eq('id', qr.id)
    }
    logAudit({
      empresaId: exame.empresa_id, atorNome: 'Leitor (scan público)', acao: 'qr.recusado',
      entidade: 'exame', entidadeId: exame.id, detalhe: { statusExame: exame.status },
    })
    return res.json({ valid: false, error: motivos[exame.status] || `Exame em situação "${exame.status}" — não pode ser confirmado.` })
  }

  // Reivindica o QR ANTES de tocar no exame. O update condicionado a
  // status='ativo' é um compare-and-swap: se voltar zero linha, outro leitor
  // chegou primeiro. Na ordem antiga o exame já virava 'realizado' e só depois
  // se tentava baixar o QR — se essa segunda escrita falhasse, o exame ficava
  // realizado com o QR ainda ativo, pronto para ser lido de novo.
  const { data: claim, error: qrErr } = await supabaseAdmin
    .from('qr_codes').update({ status: 'usado', used_at: new Date().toISOString() })
    .eq('id', qr.id).eq('status', 'ativo').select('id')
  if (qrErr) return res.status(400).json({ valid: false, error: `Falha ao baixar o QR: ${qrErr.message}` })
  if (!claim || claim.length === 0) return res.json({ valid: false, error: 'QR já utilizado (leitura simultânea).' })

  const { data: upd, error: exErr } = await supabaseAdmin
    .from('exames').update({ status: 'realizado', realizado_at: new Date().toISOString() })
    .eq('id', qr.exame_id).eq('status', 'autorizado').select('id')
  if (exErr || !upd || upd.length === 0) {
    // Devolve o QR ao estado anterior: o comprovante do paciente não pode ser
    // perdido por uma falha nossa.
    await supabaseAdmin.from('qr_codes').update({ status: 'ativo', used_at: null }).eq('id', qr.id)
    if (exErr) return res.status(400).json({ valid: false, error: `Falha ao marcar realizado: ${exErr.message}` })
    return res.status(500).json({ valid: false, error: 'Nenhuma linha atualizada — verifique se SUPABASE_SERVICE_ROLE_KEY (backend) é a chave service_role real, não a anon.' })
  }

  // Best-effort: no scan o paciente vai para "ATENDIMENTO RECEPÇÃO" (id 11) no NetRis.
  // "Exame realizado" (18) é uma etapa posterior, não acontece aqui.
  //
  // Só chama a transição quando o provider realmente é NetRis: o Feegow não tem
  // essa transição via API pública (só cancelamento tem equivalente direto — ver
  // feegow/client.js alterarSituacao), então chamar aqui uma constante do NetRis
  // num cliente Feegow reportaria "confirmado" sem nada acontecer de fato.
  let netris = null
  if (exame.netris_atendimento_id) {
    try {
      const resolved = await agendaParaEmpresa(exame.empresa_id)
      if (resolved?.provider === 'netris') {
        const r = await resolved.client.alterarSituacao(exame.netris_atendimento_id, NETRIS_SITUACAO.ATENDIMENTO_RECEPCAO)
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
