import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import OwnerArea from './areas/OwnerArea'
import EmpresaArea from './areas/EmpresaArea'
import ParceiroArea from './areas/ParceiroArea'
import PacientesArea from './areas/PacientesArea'
import AutorizacoesArea from './areas/AutorizacoesArea'
import CatalogoArea from './areas/CatalogoArea'
import VisaoGeralArea from './areas/VisaoGeralArea'

function Spinner() {
  return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
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
        <button disabled={loading} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-container transition disabled:opacity-50">{loading ? 'Salvando…' : 'Salvar e continuar'}</button>
      </form>
    </div>
  )
}

const TITULOS = {
  owner: 'Empresas & administradores',
  empresa_admin: 'Parceiros & coordenadores',
  parceiro_coordenador: 'Funcionários',
  parceiro_funcionario: 'Pacientes',
}

const COORD_TABS = [
  { k: 'visao', label: 'Visão geral' },
  { k: 'pacientes', label: 'Pacientes' },
  { k: 'autorizacoes', label: 'Autorizações' },
  { k: 'equipe', label: 'Funcionários' },
]
const EMP_TABS = [
  { k: 'visao', label: 'Visão geral' },
  { k: 'parceiros', label: 'Parceiros' },
  { k: 'agendamentos', label: 'Agendamentos' },
  { k: 'catalogo', label: 'Exames & preços' },
]

function TabBar({ tabs, sec, onPick }) {
  return (
    <div className="flex gap-1 mb-6 bg-surface-container rounded-xl p-1 w-fit">
      {tabs.map(t => (
        <button key={t.k} onClick={() => onPick(t.k)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${sec === t.k ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default function Painel() {
  const { ready, loading, session, profile, role, signOut, reloadProfile } = useAuth()
  const [secao, setSecao] = useState('pacientes')

  if (!ready) return <div className="p-10 text-center text-on-surface-variant">Supabase não configurado.</div>
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/entrar" replace />
  if (profile?.must_change_password) return <TrocarSenha onDone={reloadProfile} />

  const roleLabel = { owner: 'Dono', empresa_admin: 'Empresa', parceiro_coordenador: 'Coordenador', parceiro_funcionario: 'Funcionário' }[role] || role

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex justify-between items-center px-8 py-4 bg-white border-b border-outline-variant/10 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/brotopay.png" alt="ExameQR" className="w-9 h-9 object-contain" />
          <span className="font-display text-2xl font-extrabold tracking-tight text-primary">ExameQR</span>
          <span className="ml-2 text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">{roleLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-on-surface-variant">{profile?.nome || profile?.email}</span>
          <button onClick={signOut} className="p-2 text-on-surface-variant hover:text-error rounded-full" title="Sair"><span className="material-symbols-outlined">logout</span></button>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto">
        {role === 'parceiro_coordenador' && (() => {
          const sec = COORD_TABS.some(t => t.k === secao) ? secao : 'visao'
          return (
            <>
              <TabBar tabs={COORD_TABS} sec={sec} onPick={setSecao} />
              {sec === 'visao' && <VisaoGeralArea />}
              {sec === 'pacientes' && <PacientesArea />}
              {sec === 'autorizacoes' && <AutorizacoesArea />}
              {sec === 'equipe' && <ParceiroArea />}
            </>
          )
        })()}

        {role === 'empresa_admin' && (() => {
          const sec = EMP_TABS.some(t => t.k === secao) ? secao : 'visao'
          return (
            <>
              <TabBar tabs={EMP_TABS} sec={sec} onPick={setSecao} />
              {sec === 'visao' && <VisaoGeralArea />}
              {sec === 'parceiros' && <EmpresaArea />}
              {sec === 'agendamentos' && <PacientesArea escolherParceiro />}
              {sec === 'catalogo' && <CatalogoArea />}
            </>
          )
        })()}

        {role === 'owner' && (<><h1 className="text-2xl font-bold tracking-tight mb-6">Empresas & administradores</h1><OwnerArea /></>)}
        {role === 'parceiro_funcionario' && (<><h1 className="text-2xl font-bold tracking-tight mb-6">Pacientes</h1><PacientesArea /></>)}
        {!role && (
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-card text-center text-on-surface-variant">
            Seu perfil ainda não tem um papel definido. Fale com o administrador.
          </div>
        )}
      </main>
    </div>
  )
}
