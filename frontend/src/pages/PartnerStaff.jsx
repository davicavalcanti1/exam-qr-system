import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { isCoordenador } from '../auth'

export default function PartnerStaff() {
  const navigate = useNavigate()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function load() {
    try {
      setStaff(await api.getStaff())
    } catch (err) {
      if (err.message?.includes('restrita') || err.message?.includes('coordenador')) return
      if (err.message?.includes('autorizado') || err.message?.includes('Token')) { localStorage.removeItem('token'); navigate('/login') }
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isCoordenador()) { navigate('/dashboard'); return }
    load()
  }, [])

  async function create(e) {
    e.preventDefault()
    setMsg(null); setSaving(true)
    try {
      await api.createStaff(form)
      setForm({ name: '', email: '', password: '' })
      setMsg({ type: 'ok', text: 'Funcionário criado com sucesso.' })
      await load()
    } catch (err) {
      setMsg({ type: 'err', text: err.message })
    } finally { setSaving(false) }
  }

  async function remove(u) {
    if (!confirm(`Remover o funcionário "${u.name}"? Ele perderá o acesso.`)) return
    try { await api.deleteStaff(u.id); await load() }
    catch (err) { alert(err.message) }
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary transition'
  const labelCls = 'block text-[11px] font-bold text-on-surface-variant tracking-widest uppercase mb-1.5'

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Funcionários podem <b>registrar pacientes e exames</b>. Só você (coordenador) <b>autoriza e gera o QR</b> de cada exame.
        </p>
      </div>

      {/* Novo funcionário */}
      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
        <h3 className="text-lg font-semibold tracking-tight mb-4">Adicionar funcionário</h3>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className={labelCls}>Nome</label>
            <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className={labelCls}>E-mail de acesso</label>
            <input className={inputCls} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className={labelCls}>Senha inicial</label>
            <input className={inputCls} type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="mín. 6 caracteres" required />
          </div>
          {msg && (
            <div className={`md:col-span-3 text-sm font-medium px-4 py-2.5 rounded-lg ${msg.type === 'ok' ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant' : 'bg-error-container/50 text-on-error-container'}`}>
              {msg.text}
            </div>
          )}
          <div className="md:col-span-3 flex justify-end">
            <button disabled={saving} className="px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-container transition disabled:opacity-50">
              {saving ? 'Criando…' : 'Criar funcionário'}
            </button>
          </div>
        </form>
      </section>

      {/* Lista */}
      <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-card">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="text-lg font-semibold tracking-tight">Equipe ({staff.length})</h3>
        </div>
        {loading ? (
          <p className="text-center py-12 text-on-surface-variant text-sm">Carregando…</p>
        ) : staff.length === 0 ? (
          <p className="text-center py-12 text-on-surface-variant text-sm">Nenhum funcionário cadastrado ainda.</p>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {staff.map(u => (
              <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm">
                    {u.name?.charAt(0)?.toUpperCase() || 'F'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{u.name}</p>
                    <p className="text-[11px] text-on-surface-variant">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Funcionário</span>
                  <button onClick={() => remove(u)} className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded-md transition" title="Remover">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
