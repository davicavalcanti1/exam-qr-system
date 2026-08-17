// Assinatura eletrônica via ZapSign.
//
//   GET  /api/zapsign/config              — estado da integração (nunca o token)
//   PUT  /api/zapsign/config              — grava token / ambiente / liga-desliga
//   POST /api/zapsign/testar              — testa o token sem criar documento
//   POST /api/zapsign/contratos/:id/enviar— manda o contrato de parceria para assinar
//   POST /api/zapsign/dpa/enviar          — manda o DPA da empresa para assinar
//   GET  /api/zapsign/status/:tipo/:id    — reconsulta o provedor (fallback do webhook)
//   GET  /api/zapsign/arquivo/:tipo/:id   — URL assinada, curta, do PDF assinado
//   POST /api/zapsign/webhook/:segredo    — retorno do ZapSign (público, segredo na URL)
//
// O documento é montado aqui (pdfkit) a partir do texto que já está no banco, e
// o token nunca sai do servidor.

import { Router } from 'express'
import { createHash } from 'node:crypto'
import { getCaller, supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { subConfig } from '../../lib/integracaoProviders.js'
import { logAudit } from '../../lib/audit.js'
import { testarToken, normalizeStatus } from './client.js'
import {
  zapsignParaEmpresa, configZapsign, invalidarZapsign,
  empresaDoWebhook, urlWebhook, emailReal,
} from './empresa.js'
import { gerarDocumentoPdf, baixarLogo } from '../../utils/documentoPdf.js'

const router = Router()
const BUCKET = 'assinaturas'

// Os dois tipos de documento que o ZapSign assina neste sistema. Tabela e rótulo
// juntos para que rotas genéricas (status, arquivo, webhook) não precisem de if.
const TIPOS = {
  contrato: { tabela: 'contratos', rotulo: 'Contrato' },
  dpa: { tabela: 'dpa_aceites', rotulo: 'DPA' },
}

// Resolve o caller + a empresa-alvo (owner escolhe via query/body; os demais usam
// a sua). Mesmo contrato de `comEmpresa` das outras integrações.
async function comEmpresa(req, res, { gestor = false } = {}) {
  const c = await getCaller(req)
  if (c.error) { res.status(c.status).json({ error: c.error }); return null }
  const p = c.profile
  if (gestor && !['owner', 'empresa_admin'].includes(p.role)) {
    res.status(403).json({ error: 'Sem permissão' }); return null
  }
  const empresaId = p.role === 'owner' ? (req.query.empresaId || req.body?.empresaId || null) : p.empresa_id
  if (!empresaId) { res.status(400).json({ error: 'empresaId ausente' }); return null }
  return { profile: p, empresaId }
}

// ── Configuração ─────────────────────────────────────────────────────────────

// Só quem administra a empresa: a resposta inclui a URL do webhook, e essa URL
// É o segredo. Um coordenador de parceiro também tem `empresa_id`, então sem
// este recorte ele leria o segredo da clínica que o fatura.
router.get('/config', async (req, res) => {
  const ctx = await comEmpresa(req, res, { gestor: true }); if (!ctx) return

  const { data } = await supabaseAdmin
    .from('integracao_configs')
    .select('config, webhook_segredo, updated_at')
    .eq('empresa_id', ctx.empresaId)
    .maybeSingle()

  const sub = subConfig(data?.config, 'zapsign')
  res.json({
    empresaId: ctx.empresaId,
    ativo: Boolean(sub?.ativo) && Boolean(sub?.token),
    ambiente: sub?.ambiente === 'sandbox' ? 'sandbox' : 'producao',
    tokenConfigurado: Boolean(sub?.token),
    // A URL carrega o segredo, então só quem configura a integração a enxerga.
    webhookUrl: urlWebhook(data?.webhook_segredo, req),
    atualizadoEm: data?.updated_at || null,
  })
})

router.put('/config', async (req, res) => {
  const ctx = await comEmpresa(req, res, { gestor: true }); if (!ctx) return

  const ativo = Boolean(req.body?.ativo)
  const ambiente = req.body?.ambiente === 'sandbox' ? 'sandbox' : 'producao'
  const token = String(req.body?.token || '').trim()

  const { data: atual } = await supabaseAdmin
    .from('integracao_configs')
    .select('config, provider, webhook_segredo')
    .eq('empresa_id', ctx.empresaId)
    .maybeSingle()

  const salvo = subConfig(atual?.config, 'zapsign')
  if (ativo && !token && !salvo?.token) {
    return res.status(400).json({ error: 'Para ligar a assinatura, informe o token do ZapSign.' })
  }

  // Preserva TODAS as chaves já existentes no mapa e mexe só na do ZapSign —
  // ligar a assinatura não pode derrubar as credenciais do NetRis/Feegow.
  const mapa = (atual?.config && typeof atual.config === 'object' && !Array.isArray(atual.config))
    ? { ...atual.config } : {}
  mapa.zapsign = { ...(mapa.zapsign || {}), ativo, ambiente, token: token || salvo?.token || '' }

  const { error } = await supabaseAdmin.from('integracao_configs').upsert({
    empresa_id: ctx.empresaId,
    provider: atual?.provider || 'manual',   // NÃO troca o provedor de agendamento
    config: mapa,
    updated_at: new Date().toISOString(),
    updated_by: ctx.profile.id,
  }, { onConflict: 'empresa_id' })
  if (error) return res.status(400).json({ error: error.message })

  invalidarZapsign(ctx.empresaId)

  // Relê para devolver a URL do webhook — o segredo pode ter acabado de nascer
  // pelo default da coluna, na primeira gravação desta empresa.
  const { data: depois } = await supabaseAdmin
    .from('integracao_configs').select('webhook_segredo').eq('empresa_id', ctx.empresaId).maybeSingle()

  logAudit({
    empresaId: ctx.empresaId, atorId: ctx.profile.id, atorNome: ctx.profile.nome || ctx.profile.role,
    acao: 'zapsign.config_salva', entidade: 'integracao',
    detalhe: { ativo, ambiente, tokenTrocado: Boolean(token) },
  })

  res.json({
    ok: true, ativo, ambiente,
    tokenConfigurado: Boolean(token || salvo?.token),
    webhookUrl: urlWebhook(depois?.webhook_segredo, req),
  })
})

router.post('/testar', async (req, res) => {
  const ctx = await comEmpresa(req, res, { gestor: true }); if (!ctx) return

  let token = String(req.body?.token || '').trim()
  const ambiente = req.body?.ambiente === 'sandbox' ? 'sandbox' : 'producao'
  if (!token) {
    const { data } = await supabaseAdmin
      .from('integracao_configs').select('config').eq('empresa_id', ctx.empresaId).maybeSingle()
    token = subConfig(data?.config, 'zapsign')?.token || ''
  }
  if (!token) return res.status(400).json({ error: 'Informe o token do ZapSign.' })

  res.json(await testarToken(token, ambiente))
})

// ── Envio para assinatura ────────────────────────────────────────────────────

// Cria o documento no provedor e grava o rastro na linha correspondente.
// Compartilhado por contrato e DPA: só muda quem assina e de onde vem o texto.
async function enviarParaAssinatura({ req, empresaId, tipo, registroId, titulo, conteudo, signatario, referencia }) {
  const resolvido = await zapsignParaEmpresa(empresaId)
  if (resolvido.erro) return { status: 400, error: resolvido.erro }

  const { data: empresa } = await supabaseAdmin
    .from('empresas').select('nome, nome_exibicao, logo_url').eq('id', empresaId).maybeSingle()
  const marca = empresa?.nome_exibicao || empresa?.nome || 'ExameQR'

  let pdf
  try {
    const logoBuf = await baixarLogo(empresa?.logo_url)
    pdf = await gerarDocumentoPdf({
      titulo, conteudo, empresaNome: marca, logoBuf, referencia,
      rodape: `${marca} · assinado eletronicamente via ZapSign`,
    })
  } catch (e) {
    return { status: 500, error: `Falha ao gerar o PDF do documento: ${e.message}` }
  }

  const cfg = await configZapsign(empresaId)
  let doc
  try {
    doc = await resolvido.client.criarDocumento({
      nome: `${titulo} — ${signatario.nome}`,
      base64Pdf: pdf.toString('base64'),
      signatario,
      urlWebhook: urlWebhook(cfg.webhookSegredo, req),
    })
  } catch (e) {
    return { status: 502, error: 'Não foi possível enviar ao ZapSign', detail: e.message }
  }

  const signer = doc?.signers?.[0]
  const patch = {
    provedor: 'zapsign',
    status: 'pendente',
    externo_token: doc?.token || null,
    sign_url: signer?.sign_url || null,
    signatario_email: signatario.email,
    enviado_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from(TIPOS[tipo].tabela).update(patch).eq('id', registroId)
  if (error) return { status: 400, error: `Documento criado no ZapSign, mas o registro falhou: ${error.message}` }

  return { ok: true, signUrl: patch.sign_url, documentoToken: patch.externo_token }
}

// Contrato de parceria — quem assina é o coordenador do parceiro.
router.post('/contratos/:id/enviar', async (req, res) => {
  const ctx = await comEmpresa(req, res, { gestor: true }); if (!ctx) return

  const { data: contrato } = await supabaseAdmin
    .from('contratos')
    .select('id, empresa_id, parceiro_id, titulo, conteudo, status, provedor, externo_token, sign_url, parceiros(nome, email)')
    .eq('id', req.params.id)
    .maybeSingle()
  if (!contrato) return res.status(404).json({ error: 'Contrato não encontrado' })
  if (contrato.empresa_id !== ctx.empresaId) return res.status(403).json({ error: 'Contrato de outra empresa' })
  if (contrato.status === 'assinado') return res.status(400).json({ error: 'Este contrato já está assinado.' })
  if (contrato.status === 'cancelado') return res.status(400).json({ error: 'Contrato cancelado não vai para assinatura.' })

  // Reenviar criaria um SEGUNDO documento no ZapSign para o mesmo contrato: dois
  // links válidos circulando e cobrança dobrada no provedor.
  if (contrato.provedor === 'zapsign' && contrato.externo_token && contrato.status === 'pendente') {
    return res.json({ ok: true, signUrl: contrato.sign_url, jaEnviado: true })
  }

  // O e-mail do signatário não vem do corpo da requisição: aceitá-lo do cliente
  // deixaria qualquer um redirecionar o link — e o código de autenticação — para
  // a própria caixa.
  const { data: coord } = await supabaseAdmin
    .from('profiles').select('nome, email')
    .eq('parceiro_id', contrato.parceiro_id).eq('role', 'parceiro_coordenador')
    .limit(1).maybeSingle()

  const email = emailReal(coord?.email) || emailReal(contrato.parceiros?.email)
  if (!email) {
    return res.status(400).json({
      error: 'O parceiro não tem e-mail real cadastrado. Preencha o e-mail do parceiro (ou o do coordenador) antes de enviar — o link de assinatura vai por e-mail.',
    })
  }

  const r = await enviarParaAssinatura({
    req, empresaId: ctx.empresaId, tipo: 'contrato', registroId: contrato.id,
    titulo: contrato.titulo || 'Contrato de Parceria',
    conteudo: contrato.conteudo,
    referencia: `Contrato ${String(contrato.id).slice(0, 8).toUpperCase()}`,
    signatario: { nome: coord?.nome || contrato.parceiros?.nome || 'Representante do parceiro', email },
  })
  if (r.error) return res.status(r.status).json({ error: r.error, detail: r.detail })

  logAudit({
    empresaId: ctx.empresaId, atorId: ctx.profile.id, atorNome: ctx.profile.nome || ctx.profile.role,
    acao: 'contrato.enviado_assinatura', entidade: 'contrato', entidadeId: contrato.id,
    detalhe: { provedor: 'zapsign', email },
  })
  res.json(r)
})

// DPA — quem assina é o admin da empresa (a Controladora). O texto e a versão
// vêm do front, que é onde o DPA vive (frontend/src/legal/dpa.js) e onde o
// usuário efetivamente o leu.
router.post('/dpa/enviar', async (req, res) => {
  const ctx = await comEmpresa(req, res, { gestor: true }); if (!ctx) return

  const versao = String(req.body?.versao || '').trim()
  const conteudo = String(req.body?.conteudo || '').trim()
  const titulo = String(req.body?.titulo || 'Termo de Tratamento de Dados Pessoais (DPA)').trim()
  if (!versao || conteudo.length < 100) {
    return res.status(400).json({ error: 'Versão e conteúdo do DPA são obrigatórios.' })
  }

  // Já existe algo para esta empresa e versão?
  const { data: existente } = await supabaseAdmin
    .from('dpa_aceites').select('id, status, sign_url, externo_token, provedor')
    .eq('empresa_id', ctx.empresaId).eq('versao', versao)
    .order('id', { ascending: true }).limit(1).maybeSingle()

  if (existente?.status === 'assinado') return res.status(400).json({ error: 'Esta versão do DPA já foi aceita.' })
  if (existente?.provedor === 'zapsign' && existente?.externo_token && existente?.status === 'pendente') {
    return res.json({ ok: true, signUrl: existente.sign_url, jaEnviado: true })
  }

  // O signatário é o admin da empresa. Se quem dispara é o owner, procura-se o
  // admin da empresa-alvo — o owner não assina o DPA no lugar da Controladora.
  let signatario = null
  if (ctx.profile.role === 'empresa_admin') {
    const email = emailReal(ctx.profile.email)
    if (email) signatario = { nome: ctx.profile.nome || 'Representante da empresa', email }
  }
  if (!signatario) {
    const { data: admin } = await supabaseAdmin
      .from('profiles').select('nome, email')
      .eq('empresa_id', ctx.empresaId).eq('role', 'empresa_admin')
      .limit(1).maybeSingle()
    const { data: empresa } = await supabaseAdmin
      .from('empresas').select('nome, email').eq('id', ctx.empresaId).maybeSingle()
    const email = emailReal(admin?.email) || emailReal(empresa?.email)
    if (email) signatario = { nome: admin?.nome || empresa?.nome || 'Representante da empresa', email }
  }
  if (!signatario) {
    return res.status(400).json({
      error: 'A empresa não tem e-mail real cadastrado. Preencha o e-mail da empresa (ou o do administrador) antes de enviar — o link de assinatura vai por e-mail.',
    })
  }

  // A linha nasce aqui, pendente: o aceite só existe quando o webhook voltar.
  let registroId = existente?.id
  if (!registroId) {
    const { data: novo, error } = await supabaseAdmin.from('dpa_aceites').insert({
      empresa_id: ctx.empresaId,
      versao,
      conteudo_snapshot: conteudo,
      status: 'pendente',
      provedor: 'zapsign',
      aceito_at: null,
    }).select('id').single()
    if (error) return res.status(400).json({ error: error.message })
    registroId = novo.id
  }

  const r = await enviarParaAssinatura({
    req, empresaId: ctx.empresaId, tipo: 'dpa', registroId,
    titulo, conteudo, referencia: `DPA versão ${versao}`, signatario,
  })
  if (r.error) return res.status(r.status).json({ error: r.error, detail: r.detail })

  logAudit({
    empresaId: ctx.empresaId, atorId: ctx.profile.id, atorNome: ctx.profile.nome || ctx.profile.role,
    acao: 'dpa.enviado_assinatura', entidade: 'dpa', entidadeId: registroId,
    detalhe: { provedor: 'zapsign', versao, email: signatario.email },
  })
  res.json({ ...r, id: registroId })
})

// ── Consulta e arquivo ───────────────────────────────────────────────────────

// Carrega o registro conferindo a empresa. Devolve { linha } ou { status, error }.
async function registroDaEmpresa(tipo, id, empresaId) {
  const def = TIPOS[tipo]
  if (!def) return { status: 400, error: 'Tipo inválido' }
  const { data } = await supabaseAdmin
    .from(def.tabela)
    .select('id, empresa_id, status, provedor, externo_token, sign_url, arquivo_path')
    .eq('id', id).maybeSingle()
  if (!data) return { status: 404, error: `${def.rotulo} não encontrado` }
  if (data.empresa_id !== empresaId) return { status: 403, error: `${def.rotulo} de outra empresa` }
  return { linha: data }
}

// Reconsulta o provedor quando ainda está pendente. É o que faz o fluxo funcionar
// em desenvolvimento, onde o webhook não alcança o localhost.
// Gestor apenas: `registroDaEmpresa` recorta por empresa, e um coordenador de
// parceiro pertence à empresa — sem o recorte por papel ele leria o `sign_url`
// do contrato de OUTRO parceiro da mesma clínica.
router.get('/status/:tipo/:id', async (req, res) => {
  const ctx = await comEmpresa(req, res, { gestor: true }); if (!ctx) return
  const r = await registroDaEmpresa(req.params.tipo, req.params.id, ctx.empresaId)
  if (r.error) return res.status(r.status).json({ error: r.error })

  const linha = r.linha
  if (linha.provedor !== 'zapsign' || !linha.externo_token || linha.status !== 'pendente') {
    return res.json({ registro: linha })
  }

  const resolvido = await zapsignParaEmpresa(ctx.empresaId)
  if (resolvido.erro) return res.json({ registro: linha })

  try {
    const doc = await resolvido.client.buscarDocumento(linha.externo_token)
    const status = normalizeStatus(doc?.status)
    if (status === 'pendente') return res.json({ registro: linha })
    const atualizado = await concluir({
      tipo: req.params.tipo, registroId: linha.id, empresaId: ctx.empresaId, status, doc,
    })
    return res.json({ registro: atualizado || linha })
  } catch {
    return res.json({ registro: linha })
  }
})

// URL assinada e curta do PDF guardado. O bucket é privado e não tem policy:
// a permissão é conferida aqui, não no Storage.
router.get('/arquivo/:tipo/:id', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile

  const tipo = req.params.tipo
  const def = TIPOS[tipo]
  if (!def) return res.status(400).json({ error: 'Tipo inválido' })

  // `dpa_aceites` NÃO tem `parceiro_id` — pedir a coluna faria a consulta falhar.
  // O DPA é da empresa; só o contrato tem dono do lado do parceiro.
  const colunas = tipo === 'contrato'
    ? 'id, empresa_id, parceiro_id, arquivo_path'
    : 'id, empresa_id, arquivo_path'

  const { data: linha } = await supabaseAdmin
    .from(def.tabela).select(colunas).eq('id', req.params.id).maybeSingle()
  if (!linha) return res.status(404).json({ error: `${def.rotulo} não encontrado` })
  if (!linha.arquivo_path) return res.status(404).json({ error: 'Ainda não há documento assinado.' })

  // Owner vê tudo; empresa-level vê o da sua empresa; o parceiro vê o contrato dele.
  const daEmpresa = linha.empresa_id === p.empresa_id
  const doParceiro = tipo === 'contrato' && linha.parceiro_id && linha.parceiro_id === p.parceiro_id
  const pode = p.role === 'owner'
    || (daEmpresa && ['empresa_admin', 'empresa_operador'].includes(p.role))
    || doParceiro
  if (!pode) return res.status(403).json({ error: 'Sem permissão' })

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(linha.arquivo_path, 300)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ url: data?.signedUrl || null, expiraEm: 300 })
})

// ── Conclusão (compartilhada por webhook e reconsulta) ───────────────────────

// Baixa o arquivo assinado, guarda no bucket com o hash e fecha o registro.
// `doc` é a resposta do ZapSign (traz `signed_file` e o nome de quem assinou).
async function concluir({ tipo, registroId, empresaId, status, doc, motivo }) {
  const def = TIPOS[tipo]
  if (!def) return null

  if (status !== 'assinado') {
    const { data } = await supabaseAdmin.from(def.tabela)
      .update({ status, recusado_motivo: motivo || null })
      .eq('id', registroId).select('*').maybeSingle()
    return data
  }

  const patch = { status: 'assinado' }
  if (tipo === 'contrato') patch.assinado_at = new Date().toISOString()
  if (tipo === 'dpa') patch.aceito_at = new Date().toISOString()

  // O nome de quem assinou vem do provedor, não de um campo digitado na tela.
  const nome = doc?.signers?.[0]?.name
  if (nome) patch.assinante_nome = String(nome).slice(0, 200)

  // Sem o arquivo o registro ainda fecha como assinado — o provedor confirmou o
  // ato. O PDF entra quando estiver disponível (nova consulta ou novo webhook).
  if (doc?.signed_file) {
    try {
      const r = await fetch(doc.signed_file)
      if (r.ok) {
        const bytes = Buffer.from(await r.arrayBuffer())
        const caminho = `${tipo}/${registroId}/zapsign_${Date.now()}.pdf`
        const { error: upErr } = await supabaseAdmin.storage.from(BUCKET)
          .upload(caminho, bytes, { contentType: 'application/pdf', upsert: true })
        if (!upErr) {
          patch.arquivo_path = caminho
          patch.hash_sha256 = createHash('sha256').update(bytes).digest('hex')
        } else {
          console.warn('[zapsign] upload do assinado falhou:', upErr.message)
        }
      }
    } catch (e) {
      console.warn('[zapsign] download do assinado falhou:', e?.message)
    }
  }

  const { data } = await supabaseAdmin.from(def.tabela)
    .update(patch).eq('id', registroId).select('*').maybeSingle()

  logAudit({
    empresaId, atorId: null, atorNome: 'ZapSign (provedor de assinatura)',
    acao: tipo === 'contrato' ? 'contrato.assinado' : 'dpa.aceito',
    entidade: tipo, entidadeId: registroId,
    detalhe: { provedor: 'zapsign', hash: patch.hash_sha256 || null },
  })
  return data
}

// ── Webhook (público) ────────────────────────────────────────────────────────
// Público por necessidade: quem chama é o ZapSign. A documentação dele não
// descreve assinatura do payload, então a autenticidade vem do segredo no
// caminho — sem ele, qualquer um marcaria contrato como assinado.

router.post('/webhook/:segredo', async (req, res) => {
  const dono = await empresaDoWebhook(req.params.segredo)
  // 404 sem detalhe: um segredo errado não deve conseguir distinguir
  // "não existe" de "existe mas está desligado".
  if (!dono) return res.status(404).json({ error: 'Not found' })

  // Responder rápido: o ZapSign reenvia se demorarmos, e baixar o PDF leva tempo.
  res.json({ ok: true })

  const evento = String(req.body?.event_type || '')
  const tokenDoc = String(req.body?.token || req.body?.doc?.token || '')
  if (!tokenDoc) return

  try {
    // O mesmo token pode estar num contrato ou num DPA — procura nos dois,
    // sempre recortando pela empresa dona do segredo.
    let achado = null
    for (const tipo of Object.keys(TIPOS)) {
      const { data } = await supabaseAdmin
        .from(TIPOS[tipo].tabela).select('id, empresa_id')
        .eq('externo_token', tokenDoc).eq('empresa_id', dono.empresaId)
        .maybeSingle()
      if (data) { achado = { tipo, ...data }; break }
    }
    if (!achado) {
      console.warn('[zapsign] webhook sem documento correspondente na empresa:', tokenDoc)
      return
    }

    if (evento === 'doc_refused') {
      await concluir({
        tipo: achado.tipo, registroId: achado.id, empresaId: dono.empresaId,
        status: 'recusado', motivo: String(req.body?.reason || '').slice(0, 500) || null,
      })
      return
    }
    if (evento !== 'doc_signed') return

    const doc = await dono.client.buscarDocumento(tokenDoc)
    if (!doc?.signed_file) {
      console.warn('[zapsign] doc_signed ainda sem signed_file:', tokenDoc)
    }
    await concluir({
      tipo: achado.tipo, registroId: achado.id, empresaId: dono.empresaId,
      status: 'assinado', doc,
    })
    console.log('[zapsign]', achado.tipo, 'assinado:', achado.id)
  } catch (e) {
    console.error('[zapsign] webhook:', e?.message)
  }
})

export default router

