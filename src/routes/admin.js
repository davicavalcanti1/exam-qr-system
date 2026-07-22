import { Router } from 'express'
import { supabaseAdmin, getCaller } from '../lib/supabaseAdmin.js'

const router = Router()
const EMAIL_DOMAIN = 'exameqr.app'
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'ExameQR@123'
const CREATABLE_ROLES = ['empresa_admin', 'empresa_operador', 'parceiro_coordenador', 'parceiro_funcionario']

// Cria um usuário da hierarquia (auth + profile) via service role.
// Regras de quem cria quem + escopo por empresa/parceiro.
router.post('/users', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })

  const { nome, username, role, empresaId, parceiroId, senha } = req.body || {}
  if (!nome || !username || !role) return res.status(400).json({ error: 'nome, username e role são obrigatórios' })
  if (!CREATABLE_ROLES.includes(role)) return res.status(400).json({ error: 'role inválido (owner é criado só via dashboard)' })

  const p = c.profile
  let empresa_id = empresaId || null
  let parceiro_id = parceiroId || null

  if (role === 'empresa_admin') {
    if (p.role !== 'owner') return res.status(403).json({ error: 'Apenas o owner cria administrador de empresa' })
    if (!empresa_id) return res.status(400).json({ error: 'empresaId é obrigatório' })
    parceiro_id = null
  } else if (role === 'empresa_operador') {
    if (!['owner', 'empresa_admin'].includes(p.role)) return res.status(403).json({ error: 'Sem permissão' })
    if (p.role === 'empresa_admin') empresa_id = p.empresa_id
    if (!empresa_id) return res.status(400).json({ error: 'empresaId é obrigatório' })
    parceiro_id = null
  } else if (role === 'parceiro_coordenador') {
    if (!['owner', 'empresa_admin'].includes(p.role)) return res.status(403).json({ error: 'Sem permissão' })
    if (p.role === 'empresa_admin') empresa_id = p.empresa_id
    if (!empresa_id || !parceiro_id) return res.status(400).json({ error: 'empresaId e parceiroId são obrigatórios' })
  } else { // parceiro_funcionario
    if (p.role === 'parceiro_coordenador') { empresa_id = p.empresa_id; parceiro_id = p.parceiro_id }
    else if (p.role === 'empresa_admin') { empresa_id = p.empresa_id }
    else if (p.role !== 'owner') return res.status(403).json({ error: 'Sem permissão' })
    if (!empresa_id || !parceiro_id) return res.status(400).json({ error: 'empresaId e parceiroId são obrigatórios' })
  }

  const uname = String(username).trim().toLowerCase().replace(/\s+/g, '.')
  const email = `${uname}@${EMAIL_DOMAIN}`

  const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha || DEFAULT_PASSWORD,
    email_confirm: true,
    // o trigger handle_new_user cria o profile a partir destes metadados
    user_metadata: { nome: String(nome).trim(), username: uname, role, empresa_id, parceiro_id, must_change_password: true },
  })
  if (cErr) return res.status(400).json({ error: cErr.message })

  // upsert reconcilia com a linha que o trigger já criou (garante os valores exatos)
  const { error: pErr } = await supabaseAdmin.from('profiles').upsert({
    id: created.user.id, nome: String(nome).trim(), username: uname, email,
    role, empresa_id, parceiro_id, must_change_password: true,
  }, { onConflict: 'id' })
  if (pErr) {
    // rollback do auth user se o profile falhar
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {})
    return res.status(400).json({ error: pErr.message })
  }

  res.status(201).json({ id: created.user.id, username: uname, email, senha_inicial: senha || DEFAULT_PASSWORD })
})

// Cria um parceiro (organização) dentro de uma empresa.
router.post('/parceiros', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  if (!['owner', 'empresa_admin'].includes(p.role)) return res.status(403).json({ error: 'Sem permissão' })

  const { nome, cnpj, teto, empresaId, nomeFantasia, endereco, telefone, email } = req.body || {}
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' })
  const empresa_id = p.role === 'owner' ? empresaId : p.empresa_id
  if (!empresa_id) return res.status(400).json({ error: 'empresaId é obrigatório' })

  const { data, error } = await supabaseAdmin.from('parceiros')
    .insert({
      empresa_id, nome: String(nome).trim(), cnpj: cnpj || null, teto: teto || 2000,
      nome_fantasia: nomeFantasia || null, endereco: endereco || null, telefone: telefone || null, email: email || null,
    })
    .select('id').single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ id: data.id })
})

// Edita um parceiro (nome/cnpj/teto/status). Empresa-level, mesma empresa.
router.put('/parceiros/:id', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  if (!['owner', 'empresa_admin'].includes(p.role)) return res.status(403).json({ error: 'Sem permissão' })

  const { data: parc } = await supabaseAdmin.from('parceiros').select('id, empresa_id').eq('id', req.params.id).maybeSingle()
  if (!parc) return res.status(404).json({ error: 'Parceiro não encontrado' })
  if (p.role !== 'owner' && parc.empresa_id !== p.empresa_id) return res.status(403).json({ error: 'Parceiro de outra empresa' })

  const { nome, cnpj, teto, status, whatsapp } = req.body || {}
  const patch = {}
  if (typeof nome === 'string' && nome.trim()) patch.nome = nome.trim()
  if (cnpj !== undefined) patch.cnpj = cnpj || null
  if (teto !== undefined && teto !== '' && teto !== null) patch.teto = Number(teto)
  if (status && ['ativo', 'bloqueado', 'suspenso'].includes(status)) patch.status = status
  if (whatsapp !== undefined) patch.whatsapp = String(whatsapp).replace(/\D/g, '') || null
  if (!Object.keys(patch).length) return res.json({ ok: true })

  const { error } = await supabaseAdmin.from('parceiros').update(patch).eq('id', parc.id)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

// Edita um usuário (nome/ativo). Regras de quem edita quem + ban no Auth ao desativar.
router.patch('/users/:id', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const me = c.profile
  const { data: alvo } = await supabaseAdmin.from('profiles').select('id, role, empresa_id, parceiro_id').eq('id', req.params.id).maybeSingle()
  if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' })

  const { nome, ativo } = req.body || {}
  if (alvo.id === me.id && ativo === false) return res.status(400).json({ error: 'Você não pode desativar a própria conta' })

  const pode = me.role === 'owner'
    || (me.role === 'empresa_admin' && alvo.empresa_id === me.empresa_id && !['owner', 'empresa_admin'].includes(alvo.role))
    || (me.role === 'parceiro_coordenador' && alvo.parceiro_id === me.parceiro_id && alvo.role === 'parceiro_funcionario')
  if (!pode) return res.status(403).json({ error: 'Sem permissão para editar este usuário' })

  const patch = {}
  if (typeof nome === 'string' && nome.trim()) patch.nome = nome.trim()
  if (typeof ativo === 'boolean') patch.ativo = ativo
  if (Object.keys(patch).length) {
    const { error } = await supabaseAdmin.from('profiles').update(patch).eq('id', alvo.id)
    if (error) return res.status(400).json({ error: error.message })
  }
  // ban/unban no Supabase Auth para bloquear o login de fato
  if (typeof ativo === 'boolean') {
    try { await supabaseAdmin.auth.admin.updateUserById(alvo.id, { ban_duration: ativo ? 'none' : '876000h' }) } catch { /* best-effort */ }
  }
  res.json({ ok: true })
})

// Redefine a senha de um usuário (recuperação). Regras de quem-pode + força troca
// no próximo acesso. Devolve a senha temporária para o admin repassar.
router.post('/users/:id/reset-senha', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const me = c.profile
  const { data: alvo } = await supabaseAdmin.from('profiles').select('id, role, empresa_id, parceiro_id').eq('id', req.params.id).maybeSingle()
  if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' })

  const pode = me.role === 'owner'
    || (me.role === 'empresa_admin' && alvo.empresa_id === me.empresa_id && !['owner', 'empresa_admin'].includes(alvo.role))
    || (me.role === 'parceiro_coordenador' && alvo.parceiro_id === me.parceiro_id && alvo.role === 'parceiro_funcionario')
  if (!pode) return res.status(403).json({ error: 'Sem permissão para redefinir a senha deste usuário' })

  const novaSenha = req.body?.senha || DEFAULT_PASSWORD
  const { error: aErr } = await supabaseAdmin.auth.admin.updateUserById(alvo.id, { password: novaSenha })
  if (aErr) return res.status(400).json({ error: aErr.message })
  await supabaseAdmin.from('profiles').update({ must_change_password: true }).eq('id', alvo.id)
  res.json({ ok: true, senha: novaSenha })
})

// Atualiza o mapeamento NetRis de um parceiro (plano-convênio/convênio/unidade).
router.put('/parceiros/:id/netris', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  if (!['owner', 'empresa_admin'].includes(p.role)) return res.status(403).json({ error: 'Sem permissão' })

  const { idPlanoConvenio, idConvenio, idUnidade } = req.body || {}
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))

  // garante que o parceiro é da empresa do caller (owner pode tudo)
  const { data: parc } = await supabaseAdmin.from('parceiros').select('id, empresa_id').eq('id', req.params.id).maybeSingle()
  if (!parc) return res.status(404).json({ error: 'Parceiro não encontrado' })
  if (p.role !== 'owner' && parc.empresa_id !== p.empresa_id) return res.status(403).json({ error: 'Parceiro de outra empresa' })

  const { error } = await supabaseAdmin.from('parceiros').update({
    netris_id_plano_convenio: num(idPlanoConvenio),
    netris_id_convenio: num(idConvenio),
    netris_id_unidade: num(idUnidade),
  }).eq('id', req.params.id)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

export default router
