import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Card, Button, Field, Input, Badge, Loading, EmptyState, useToast } from '../../../components/ui'
import { buscarCnpj as consultarCnpj } from '../../../integrations/brasilapi/cnpj'
import CreateUserModal from '../CreateUserModal'
import DesenvolvedorArea from './DesenvolvedorArea'

export default function OwnerArea() {
  const toast = useToast()
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nome: '', cnpj: '', slug: '', nomeFantasia: '', endereco: '', telefone: '', email: '' })
  const [buscando, setBuscando] = useState(false)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [admins, setAdmins] = useState({})
  const [modal, setModal] = useState(null)
  const [config, setConfig] = useState(null)

  async function load() {
    const { data } = await supabase.from('empresas').select('id, nome, cnpj, slug, status, created_at').order('created_at', { ascending: false })
    setEmpresas(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function loadAdmins(empresaId) {
    const { data } = await supabase.from('profiles').select('id, nome, username, email, role, ativo').eq('empresa_id', empresaId).order('created_at', { ascending: false })
    setAdmins(a => ({ ...a, [empresaId]: data || [] }))
  }
  function toggle(empresaId) {
    const next = expanded === empresaId ? null : empresaId
    setExpanded(next)
    if (next && !admins[next]) loadAdmins(next)
  }

  async function buscarCnpj() {
    const c = form.cnpj.replace(/\D/g, '')
    if (c.length !== 14) return toast.error('Informe um CNPJ com 14 dígitos.')
    setBuscando(true)
    try {
      const d = await consultarCnpj(c)
      setForm(f => ({ ...f, nome: d.razaoSocial || f.nome, nomeFantasia: d.nomeFantasia, endereco: d.endereco, telefone: d.telefone, email: d.email }))
      toast.success(`${d.razaoSocial}${d.situacao ? ' · ' + d.situacao : ''}`)
    } catch (e) { toast.error(e.message) } finally { setBuscando(false) }
  }

  async function createEmpresa(e) {
    e.preventDefault(); setErr(''); setSaving(true)
    const slug = (form.slug || form.nome).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await supabase.from('empresas').insert({
      nome: form.nome.trim(), cnpj: form.cnpj.trim() || null, slug,
      nome_fantasia: form.nomeFantasia || null, endereco: form.endereco || null, telefone: form.telefone || null, email: form.email || null,
    })
    if (error) setErr(error.message)
    else { setForm({ nome: '', cnpj: '', slug: '', nomeFantasia: '', endereco: '', telefone: '', email: '' }); toast.success('Empresa criada.'); await load() }
    setSaving(false)
  }

  const roleLabel = (r) => ({ empresa_admin: 'Admin', parceiro_coordenador: 'Coordenador', parceiro_funcionario: 'Funcionário', owner: 'Dono' }[r] || r)

  // modo configuração: Desenvolvedor da empresa selecionada
  if (config) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" icon="arrow_back" onClick={() => setConfig(null)}>Voltar às empresas</Button>
        <DesenvolvedorArea empresaId={config.id} empresaNome={config.nome} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Nova empresa */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Nova empresa principal</h3>
        <form onSubmit={createEmpresa} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Field label="CNPJ">
            <div className="flex gap-2">
              <Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="só números" />
              <Button type="button" variant="secondary" onClick={buscarCnpj} loading={buscando} className="flex-none">Buscar</Button>
            </div>
          </Field>
          <Field label="Nome / Razão social"><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></Field>
          <Field label="Slug"><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto" /></Field>
          {(form.nomeFantasia || form.endereco) && (
            <div className="md:col-span-3 text-[11px] text-on-surface-variant bg-surface rounded-xl px-3 py-2">
              {form.nomeFantasia && <b>{form.nomeFantasia}</b>}{form.endereco ? ` · ${form.endereco}` : ''}{form.telefone ? ` · ${form.telefone}` : ''}
            </div>
          )}
          {err && <div className="md:col-span-3 text-sm px-3 py-2 rounded-xl bg-error-container/50 text-on-error-container">{err}</div>}
          <div className="md:col-span-3 flex justify-end"><Button type="submit" loading={saving} icon="add">Criar empresa</Button></div>
        </form>
      </Card>

      {/* Lista de empresas */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10"><h3 className="text-lg font-semibold">Empresas ({empresas.length})</h3></div>
        {loading ? <Loading />
          : empresas.length === 0 ? <EmptyState icon="business" title="Nenhuma empresa ainda" hint="Cadastre a primeira empresa principal acima." />
          : <div className="divide-y divide-outline-variant/10">
              {empresas.map(emp => {
                const on = expanded === emp.id
                return (
                  <div key={emp.id}>
                    <button onClick={() => toggle(emp.id)} className="w-full flex items-center gap-3 px-6 py-4 hover:bg-black/[.02] transition text-left">
                      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-none"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>business</span></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{emp.nome}</p>
                        <p className="text-[11px] text-on-surface-variant truncate">{emp.slug}{emp.cnpj ? ` · ${emp.cnpj}` : ''}</p>
                      </div>
                      <Badge tone={emp.status === 'ativa' ? 'success' : 'neutral'}>{emp.status}</Badge>
                      <span className="material-symbols-outlined text-on-surface-variant flex-none">{on ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {on && (
                      <div className="px-6 pb-5 space-y-4 bg-black/[.015]">
                        <button onClick={() => setConfig({ id: emp.id, nome: emp.nome })} className="w-full flex items-center justify-between gap-2 px-4 py-3 mt-3 rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant/20 hover:ring-primary/40 transition text-left">
                          <span className="flex items-center gap-2 text-sm font-bold"><span className="material-symbols-outlined text-primary">terminal</span>Configurar integração (Desenvolvedor)</span>
                          <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                        </button>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Usuários da empresa</span>
                            <Button variant="ghost" size="sm" icon="add" onClick={() => setModal(emp.id)}>Criar administrador</Button>
                          </div>
                          {(admins[emp.id] || []).length === 0
                            ? <p className="text-sm text-on-surface-variant py-1">Nenhum usuário. Crie o administrador da empresa.</p>
                            : <div className="space-y-1.5">
                                {admins[emp.id].map(u => (
                                  <div key={u.id} className="flex items-center gap-3 bg-surface-container-lowest rounded-xl px-3 py-2 text-sm">
                                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-none">{(u.nome || '?').charAt(0).toUpperCase()}</span>
                                    <span className={`flex-1 truncate ${u.ativo ? '' : 'opacity-50 line-through'}`}>{u.nome} <span className="text-on-surface-variant">· {u.username}</span></span>
                                    <Badge tone="primary">{roleLabel(u.role)}</Badge>
                                  </div>
                                ))}
                              </div>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>}
      </Card>

      <CreateUserModal
        open={modal !== null}
        title="Novo administrador da empresa"
        role="empresa_admin"
        empresaId={modal}
        onClose={() => setModal(null)}
        onCreated={() => modal && loadAdmins(modal)}
      />
    </div>
  )
}
