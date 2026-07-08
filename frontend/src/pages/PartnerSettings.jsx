import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Banner({ msg }) {
  if (!msg) return null
  const ok = msg.type === 'ok'
  return (
    <div className={`text-sm font-medium px-4 py-2.5 rounded-lg ${ok ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant' : 'bg-error-container/50 text-on-error-container'}`}>
      {msg.text}
    </div>
  )
}

export default function PartnerSettings() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // perfil
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)

  // senha
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg] = useState(null)

  async function load() {
    try {
      const p = await api.getMyProfile()
      setProfile(p); setName(p.name); setEmail(p.email)
    } catch (err) {
      if (err.message?.includes('autorizado') || err.message?.includes('Token')) { localStorage.removeItem('token'); navigate('/login') }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function saveProfile(e) {
    e.preventDefault()
    setSavingProfile(true); setProfileMsg(null)
    try {
      await api.updateMyProfile({ name, email })
      setProfileMsg({ type: 'ok', text: 'Perfil atualizado com sucesso.' })
      await load()
    } catch (err) {
      setProfileMsg({ type: 'err', text: err.message })
    } finally { setSavingProfile(false) }
  }

  async function savePassword(e) {
    e.preventDefault()
    setPassMsg(null)
    if (next !== confirm) return setPassMsg({ type: 'err', text: 'A confirmação não corresponde à nova senha.' })
    if (next.length < 6) return setPassMsg({ type: 'err', text: 'A nova senha deve ter pelo menos 6 caracteres.' })
    setSavingPass(true)
    try {
      await api.changeMyPassword(current, next)
      setPassMsg({ type: 'ok', text: 'Senha alterada com sucesso.' })
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setPassMsg({ type: 'err', text: err.message })
    } finally { setSavingPass(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!profile) return null

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary transition'
  const labelCls = 'block text-[11px] font-bold text-on-surface-variant tracking-widest uppercase mb-1.5'

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações da conta</h1>
        <p className="text-sm text-on-surface-variant mt-1">Gerencie seus dados de acesso e senha.</p>
      </div>

      {/* Resumo da conta */}
      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Teto de crédito</span>
          <p className="text-lg font-extrabold tabular-nums mt-1 text-yellow-600">{fmt(profile.budget_limit)}</p>
        </div>
        <div>
          <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Situação</span>
          <p className="text-lg font-bold mt-1">{profile.status === 'blocked' ? 'Bloqueado' : 'Ativo'}</p>
        </div>
        <div>
          <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Parceiro desde</span>
          <p className="text-lg font-bold mt-1">{new Date(profile.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
      </section>

      {/* Perfil */}
      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
        <h3 className="text-lg font-semibold tracking-tight mb-4">Dados do perfil</h3>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className={labelCls}>Nome</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>E-mail de acesso</label>
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <Banner msg={profileMsg} />
          <div className="flex justify-end">
            <button disabled={savingProfile} className="px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-container transition disabled:opacity-50">
              {savingProfile ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </section>

      {/* Senha */}
      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
        <h3 className="text-lg font-semibold tracking-tight mb-4">Trocar senha</h3>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className={labelCls}>Senha atual</label>
            <input className={inputCls} type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nova senha</label>
              <input className={inputCls} type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <label className={labelCls}>Confirmar nova senha</label>
              <input className={inputCls} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          <Banner msg={passMsg} />
          <div className="flex justify-end">
            <button disabled={savingPass} className="px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-container transition disabled:opacity-50">
              {savingPass ? 'Alterando…' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
