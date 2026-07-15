import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../components/ui'
import { buscarCnpj as consultarCnpj } from '../../../integrations/brasilapi/cnpj'
import CreateUserModal from '../CreateUserModal'

export default function OwnerArea() {
  const toast = useToast()
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nome: '', cnpj: '', slug: '', nomeFantasia: '', endereco: '', telefone: '', email: '' })
  const [buscando, setBuscando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [admins, setAdmins] = useState({})       // empresaId -> [profiles]
  const [modal, setModal] = useState(null)        // empresaId p/ criar admin

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
    e.preventDefault(); setMsg(null); setSaving(true)
    const slug = (form.slug || form.nome).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await supabase.from('empresas').insert({
      nome: form.nome.trim(), cnpj: form.cnpj.trim() || null, slug,
      nome_fantasia: form.nomeFantasia || null, endereco: form.endereco || null, telefone: form.telefone || null, email: form.email || null,
    })
    if (error) setMsg({ t: 'err', m: error.message })
    else { setForm({ nome: '', cnpj: '', slug: '', nomeFantasia: '', endereco: '', telefone: '', email: '' }); await load() }
    setSaving(false)
  }

  const input = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant'

  return (
    <div className="space-y-8">
      <section className="bg-surface-container-lowest p-6 rounded-2xl shadow-card">
        <h3 className="text-lg font-semibold mb-4">Nova empresa principal</h3>
        <form onSubmit={createEmpresa} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label className={label}>CNPJ</label>
            <div className="flex gap-2">
              <input className={input} value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="só números" />
              <button type="button" onClick={buscarCnpj} disabled={buscando} className="px-3 py-2.5 bg-surface-container text-on-surface font-bold text-sm rounded-lg hover:bg-surface-container-high transition disabled:opacity-50 flex-none whitespace-nowrap">{buscando ? '…' : 'Buscar'}</button>
            </div>
          </div>
          <div><label className={label}>Nome / Razão social</label><input className={input} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
          <div><label className={label}>Slug</label><input className={input} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto" /></div>
          {(form.nomeFantasia || form.endereco) && <div className="md:col-span-3 text-[11px] text-on-surface-variant bg-surface rounded-lg px-3 py-2">{form.nomeFantasia && <b>{form.nomeFantasia}</b>}{form.endereco ? ` · ${form.endereco}` : ''}{form.telefone ? ` · ${form.telefone}` : ''}</div>}
          {msg && <div className="md:col-span-3 text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{msg.m}</div>}
          <div className="md:col-span-3 flex justify-end"><button disabled={saving} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{saving ? 'Criando…' : 'Criar empresa'}</button></div>
        </form>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10"><h3 className="text-lg font-semibold">Empresas ({empresas.length})</h3></div>
        {loading ? <p className="text-center py-10 text-on-surface-variant text-sm">Carregando…</p>
          : empresas.length === 0 ? <p className="text-center py-10 text-on-surface-variant text-sm">Nenhuma empresa ainda.</p>
          : <div className="divide-y divide-outline-variant/10">
              {empresas.map(emp => (
                <div key={emp.id}>
                  <button onClick={() => toggle(emp.id)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition text-left">
                    <div><p className="font-semibold">{emp.nome}</p><p className="text-[11px] text-on-surface-variant">{emp.slug}{emp.cnpj ? ` · ${emp.cnpj}` : ''}</p></div>
                    <span className="material-symbols-outlined text-on-surface-variant">{expanded === emp.id ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  {expanded === emp.id && (
                    <div className="px-6 pb-5 bg-slate-50/40">
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Usuários da empresa</span>
                        <button onClick={() => setModal(emp.id)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-sm">add</span>Criar administrador</button>
                      </div>
                      {(admins[emp.id] || []).length === 0
                        ? <p className="text-sm text-on-surface-variant py-2">Nenhum usuário. Crie o administrador da empresa.</p>
                        : <div className="space-y-1">
                            {admins[emp.id].map(u => (
                              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm">
                                <span>{u.nome} <span className="text-on-surface-variant">· {u.username}</span></span>
                                <span className="text-[10px] font-bold uppercase text-on-surface-variant">{u.role.replace('parceiro_', '').replace('empresa_', '')}</span>
                              </div>
                            ))}
                          </div>}
                    </div>
                  )}
                </div>
              ))}
            </div>}
      </section>

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
