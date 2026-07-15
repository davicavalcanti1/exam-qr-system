import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { adminApi } from '../../../lib/adminApi'
import { useAuth } from '../../../auth/AuthContext'
import { useToast } from '../../../components/ui'
import CreateUserModal from '../CreateUserModal'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function EmpresaArea() {
  const { empresaId } = useAuth()
  const toast = useToast()
  const [parceiros, setParceiros] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nome: '', cnpj: '', teto: 2000, nomeFantasia: '', endereco: '', telefone: '', email: '' })
  const [buscando, setBuscando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [users, setUsers] = useState({})   // parceiroId -> [profiles]
  const [modal, setModal] = useState(null)  // parceiroId p/ criar coordenador
  const [edit, setEdit] = useState({})      // parceiroId -> {teto, status}
  const [savingP, setSavingP] = useState(null)

  async function load() {
    const { data } = await supabase.from('parceiros').select('id, nome, cnpj, teto, status, contrato_status').order('created_at', { ascending: false })
    setParceiros(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function loadUsers(pid) {
    const { data } = await supabase.from('profiles').select('id, nome, username, role, ativo').eq('parceiro_id', pid).order('created_at', { ascending: false })
    setUsers(u => ({ ...u, [pid]: data || [] }))
  }
  function toggle(pid) {
    const next = expanded === pid ? null : pid
    setExpanded(next)
    if (next) {
      if (!users[next]) loadUsers(next)
      const p = parceiros.find(x => x.id === next)
      setEdit(e => ({ ...e, [next]: { teto: p?.teto ?? 0, status: p?.status || 'ativo' } }))
    }
  }

  async function salvarParceiro(p) {
    setSavingP(p.id)
    try { await adminApi.updateParceiro(p.id, edit[p.id]); await load() }
    catch (e) { setErr(e.message) } finally { setSavingP(null) }
  }
  async function toggleUser(pid, u) {
    await adminApi.updateUser(u.id, { ativo: !u.ativo }).catch(() => {})
    await loadUsers(pid)
  }
  async function resetarSenha(u) {
    if (!window.confirm(`Redefinir a senha de ${u.nome}? Será gerada uma senha temporária.`)) return
    try { const r = await adminApi.resetarSenha(u.id); window.alert(`Nova senha de ${u.nome}:\n\n${r.senha}\n\nRepasse ao usuário — ele troca no próximo acesso.`) }
    catch (e) { window.alert('Falha: ' + e.message) }
  }

  async function buscarCnpj() {
    const c = form.cnpj.replace(/\D/g, '')
    if (c.length !== 14) return toast.error('Informe um CNPJ com 14 dígitos.')
    setBuscando(true)
    try {
      const d = await adminApi.buscarCnpj(c)
      setForm(f => ({ ...f, nome: d.razaoSocial || f.nome, nomeFantasia: d.nomeFantasia, endereco: d.endereco, telefone: d.telefone, email: d.email }))
      toast.success(`${d.razaoSocial}${d.situacao ? ' · ' + d.situacao : ''}`)
    } catch (e) { toast.error(e.message) } finally { setBuscando(false) }
  }

  async function createParceiro(e) {
    e.preventDefault(); setErr(''); setSaving(true)
    try {
      await adminApi.createParceiro({
        nome: form.nome, cnpj: form.cnpj || undefined, teto: Number(form.teto) || 2000,
        nomeFantasia: form.nomeFantasia || undefined, endereco: form.endereco || undefined, telefone: form.telefone || undefined, email: form.email || undefined,
      })
      setForm({ nome: '', cnpj: '', teto: 2000, nomeFantasia: '', endereco: '', telefone: '', email: '' }); await load()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const input = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant'
  const roleLabel = (r) => r === 'parceiro_coordenador' ? 'Coordenador' : r === 'parceiro_funcionario' ? 'Funcionário' : r

  return (
    <div className="space-y-8">
      <section className="bg-surface-container-lowest p-6 rounded-2xl shadow-card">
        <h3 className="text-lg font-semibold mb-4">Novo parceiro</h3>
        <form onSubmit={createParceiro} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className={label}>CNPJ</label>
            <div className="flex gap-2">
              <input className={input} value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="só números" />
              <button type="button" onClick={buscarCnpj} disabled={buscando} className="px-3 py-2.5 bg-surface-container text-on-surface font-bold text-sm rounded-lg hover:bg-surface-container-high transition disabled:opacity-50 flex-none whitespace-nowrap">{buscando ? '…' : 'Buscar'}</button>
            </div>
          </div>
          <div><label className={label}>Nome / Razão social</label><input className={input} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
          <div><label className={label}>Teto (R$)</label><input className={input} type="number" min="0" step="100" value={form.teto} onChange={e => setForm({ ...form, teto: e.target.value })} /></div>
          {(form.nomeFantasia || form.endereco) && <div className="md:col-span-3 text-[11px] text-on-surface-variant bg-surface rounded-lg px-3 py-2">{form.nomeFantasia && <b>{form.nomeFantasia}</b>}{form.endereco ? ` · ${form.endereco}` : ''}{form.telefone ? ` · ${form.telefone}` : ''}</div>}
          {err && <div className="md:col-span-3 text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{err}</div>}
          <div className="md:col-span-3 flex justify-end"><button disabled={saving} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{saving ? 'Criando…' : 'Criar parceiro'}</button></div>
        </form>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10"><h3 className="text-lg font-semibold">Parceiros ({parceiros.length})</h3></div>
        {loading ? <p className="text-center py-10 text-on-surface-variant text-sm">Carregando…</p>
          : parceiros.length === 0 ? <p className="text-center py-10 text-on-surface-variant text-sm">Nenhum parceiro ainda.</p>
          : <div className="divide-y divide-outline-variant/10">
              {parceiros.map(p => (
                <div key={p.id}>
                  <button onClick={() => toggle(p.id)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition text-left">
                    <div><p className="font-semibold">{p.nome}</p><p className="text-[11px] text-on-surface-variant">Teto {fmt(p.teto)} · contrato {p.contrato_status}</p></div>
                    <span className="material-symbols-outlined text-on-surface-variant">{expanded === p.id ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  {expanded === p.id && (
                    <div className="px-6 pb-5 bg-slate-50/40">
                      <div className="flex flex-wrap items-end gap-3 py-3 border-b border-outline-variant/10">
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Teto (R$)</label><input type="number" min="0" step="100" className="w-32 px-3 py-2 text-sm rounded-lg bg-white ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" value={edit[p.id]?.teto ?? ''} onChange={e => setEdit(x => ({ ...x, [p.id]: { ...x[p.id], teto: e.target.value } }))} /></div>
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</label>
                          <select className="px-3 py-2 text-sm rounded-lg bg-white ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" value={edit[p.id]?.status || 'ativo'} onChange={e => setEdit(x => ({ ...x, [p.id]: { ...x[p.id], status: e.target.value } }))}>
                            <option value="ativo">Ativo</option><option value="bloqueado">Bloqueado</option><option value="suspenso">Suspenso</option>
                          </select>
                        </div>
                        <button onClick={() => salvarParceiro(p)} disabled={savingP === p.id} className="px-4 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{savingP === p.id ? 'Salvando…' : 'Salvar'}</button>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Usuários do parceiro</span>
                        <button onClick={() => setModal(p.id)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-sm">add</span>Criar coordenador</button>
                      </div>
                      {(users[p.id] || []).length === 0
                        ? <p className="text-sm text-on-surface-variant py-2">Nenhum usuário. Crie o coordenador do parceiro.</p>
                        : <div className="space-y-1">
                            {users[p.id].map(u => (
                              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm">
                                <span className={u.ativo ? '' : 'opacity-50 line-through'}>{u.nome} <span className="text-on-surface-variant">· {u.username}</span></span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase text-on-surface-variant">{roleLabel(u.role)}</span>
                                  <button onClick={() => resetarSenha(u)} title="Redefinir senha" className="p-1 text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>key</span></button>
                                  <button onClick={() => toggleUser(p.id, u)} title={u.ativo ? 'Desativar' : 'Ativar'} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.ativo ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant hover:bg-error-container/50 hover:text-on-error-container' : 'bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary'}`}>{u.ativo ? 'ativo' : 'inativo'}</button>
                                </div>
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
        title="Novo coordenador do parceiro"
        role="parceiro_coordenador"
        empresaId={empresaId}
        parceiroId={modal}
        onClose={() => setModal(null)}
        onCreated={() => modal && loadUsers(modal)}
      />
    </div>
  )
}
