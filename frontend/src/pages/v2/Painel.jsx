import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../lib/supabase'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// Troca de senha obrigatória no primeiro acesso.
function TrocarSenha({ onDone }) {
  const [p1, setP1] = useState(''); const [p2, setP2] = useState('')
  const [msg, setMsg] = useState(''); const [loading, setLoading] = useState(false)
  async function submit(e) {
    e.preventDefault(); setMsg('')
    if (p1.length < 6) return setMsg('A senha deve ter ao menos 6 caracteres.')
    if (p1 !== p2) return setMsg('As senhas não coincidem.')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: p1 })
    if (error) { setMsg(error.message); setLoading(false); return }
    await supabase.rpc('mark_password_changed')
    setLoading(false); onDone()
  }
  return (
    <div className="min-h-screen soft-bg-gradient flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-surface-container-lowest rounded-xl shadow-card p-8 w-full max-w-sm space-y-4">
        <div className="text-center">
          <img src="/brotopay.png" alt="ExameQR" className="w-16 h-16 mx-auto mb-2 object-contain" />
          <h2 className="text-lg font-bold">Defina sua nova senha</h2>
          <p className="text-sm text-on-surface-variant">Primeiro acesso — troque a senha padrão.</p>
        </div>
        <input type="password" placeholder="Nova senha" value={p1} onChange={e => setP1(e.target.value)} className="w-full px-4 py-3 bg-surface-container rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm" required />
        <input type="password" placeholder="Confirmar nova senha" value={p2} onChange={e => setP2(e.target.value)} className="w-full px-4 py-3 bg-surface-container rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm" required />
        {msg && <p className="text-sm text-error">{msg}</p>}
        <button disabled={loading} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-container transition disabled:opacity-50">
          {loading ? 'Salvando…' : 'Salvar e continuar'}
        </button>
      </form>
    </div>
  )
}

// Área do OWNER: criar e listar empresas principais.
function Empresas() {
  const [list, setList] = useState([]); const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nome: '', cnpj: '', slug: '' })
  const [msg, setMsg] = useState(null); const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('empresas').select('id, nome, cnpj, slug, status, created_at').order('created_at', { ascending: false })
    setList(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create(e) {
    e.preventDefault(); setMsg(null); setSaving(true)
    const slug = (form.slug || form.nome).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await supabase.from('empresas').insert({ nome: form.nome.trim(), cnpj: form.cnpj.trim() || null, slug })
    if (error) setMsg({ t: 'err', m: error.message })
    else { setForm({ nome: '', cnpj: '', slug: '' }); setMsg({ t: 'ok', m: 'Empresa criada.' }); await load() }
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  return (
    <div className="space-y-8">
      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
        <h3 className="text-lg font-semibold mb-4">Nova empresa principal</h3>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Nome</label><input className={inputCls} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">CNPJ</label><input className={inputCls} value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Slug</label><input className={inputCls} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto" /></div>
          {msg && <div className={`md:col-span-3 text-sm px-3 py-2 rounded-lg ${msg.t === 'ok' ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant' : 'bg-error-container/50 text-on-error-container'}`}>{msg.m}</div>}
          <div className="md:col-span-3 flex justify-end"><button disabled={saving} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{saving ? 'Criando…' : 'Criar empresa'}</button></div>
        </form>
      </section>

      <section className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10"><h3 className="text-lg font-semibold">Empresas ({list.length})</h3></div>
        {loading ? <p className="text-center py-10 text-on-surface-variant text-sm">Carregando…</p>
          : list.length === 0 ? <p className="text-center py-10 text-on-surface-variant text-sm">Nenhuma empresa ainda.</p>
          : <div className="divide-y divide-outline-variant/10">
              {list.map(e => (
                <div key={e.id} className="flex items-center justify-between px-6 py-4">
                  <div><p className="font-semibold">{e.nome}</p><p className="text-[11px] text-on-surface-variant">{e.slug}{e.cnpj ? ` · ${e.cnpj}` : ''}</p></div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${e.status === 'ativa' ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant' : 'bg-surface-container text-on-surface-variant'}`}>{e.status}</span>
                </div>
              ))}
            </div>}
      </section>

      <p className="text-xs text-on-surface-variant">Próximo passo: criar o administrador de cada empresa (via backend com service role) — em construção.</p>
    </div>
  )
}

export default function Painel() {
  const { ready, loading, session, profile, role, signOut, reloadProfile } = useAuth()

  if (!ready) return <div className="p-10 text-center text-on-surface-variant">Supabase não configurado.</div>
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/entrar" replace />
  if (profile?.must_change_password) return <TrocarSenha onDone={reloadProfile} />

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex justify-between items-center px-8 py-4 bg-white border-b border-outline-variant/10 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/brotopay.png" alt="ExameQR" className="w-9 h-9 object-contain" />
          <span className="text-xl font-black tracking-tighter text-primary">ExameQR</span>
          <span className="ml-2 text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">{role || '—'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-on-surface-variant">{profile?.nome || profile?.email}</span>
          <button onClick={signOut} className="p-2 text-on-surface-variant hover:text-error rounded-full" title="Sair"><span className="material-symbols-outlined">logout</span></button>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Painel</h1>
        {role === 'owner'
          ? <Empresas />
          : <div className="bg-surface-container-lowest p-8 rounded-xl shadow-card text-center text-on-surface-variant">
              Área do perfil <b>{role || 'sem role'}</b> em construção.
            </div>}
      </main>
    </div>
  )
}
