import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { adminApi } from '../../../lib/adminApi'
import { useAuth } from '../../../auth/AuthContext'
import CreateUserModal from '../CreateUserModal'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function EmpresaArea() {
  const { empresaId } = useAuth()
  const [parceiros, setParceiros] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nome: '', cnpj: '', teto: 2000 })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [users, setUsers] = useState({})   // parceiroId -> [profiles]
  const [modal, setModal] = useState(null)  // parceiroId p/ criar coordenador

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
    setExpanded(next); if (next && !users[next]) loadUsers(next)
  }

  async function createParceiro(e) {
    e.preventDefault(); setErr(''); setSaving(true)
    try {
      await adminApi.createParceiro({ nome: form.nome, cnpj: form.cnpj || undefined, teto: Number(form.teto) || 2000 })
      setForm({ nome: '', cnpj: '', teto: 2000 }); await load()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const input = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant'
  const roleLabel = (r) => r === 'parceiro_coordenador' ? 'Coordenador' : r === 'parceiro_funcionario' ? 'Funcionário' : r

  return (
    <div className="space-y-8">
      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
        <h3 className="text-lg font-semibold mb-4">Novo parceiro</h3>
        <form onSubmit={createParceiro} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div><label className={label}>Nome</label><input className={input} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
          <div><label className={label}>CNPJ</label><input className={input} value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} /></div>
          <div><label className={label}>Teto (R$)</label><input className={input} type="number" min="0" step="100" value={form.teto} onChange={e => setForm({ ...form, teto: e.target.value })} /></div>
          {err && <div className="md:col-span-3 text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{err}</div>}
          <div className="md:col-span-3 flex justify-end"><button disabled={saving} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{saving ? 'Criando…' : 'Criar parceiro'}</button></div>
        </form>
      </section>

      <section className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
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
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Usuários do parceiro</span>
                        <button onClick={() => setModal(p.id)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-sm">add</span>Criar coordenador</button>
                      </div>
                      {(users[p.id] || []).length === 0
                        ? <p className="text-sm text-on-surface-variant py-2">Nenhum usuário. Crie o coordenador do parceiro.</p>
                        : <div className="space-y-1">
                            {users[p.id].map(u => (
                              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm">
                                <span>{u.nome} <span className="text-on-surface-variant">· {u.username}</span></span>
                                <span className="text-[10px] font-bold uppercase text-on-surface-variant">{roleLabel(u.role)}</span>
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
