import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import { Button, Field, Input, Loading } from '../../components/ui'
import OwnerArea from './areas/OwnerArea'
import EmpresaArea from './areas/EmpresaArea'
import ParceiroArea from './areas/ParceiroArea'
import PacientesArea from './areas/PacientesArea'
import AutorizacoesArea from './areas/AutorizacoesArea'
import CatalogoArea from './areas/CatalogoArea'
import VisaoGeralArea from './areas/VisaoGeralArea'
import CobrancasArea from './areas/CobrancasArea'
import AgendaArea from './areas/AgendaArea'
import DesenvolvedorArea from './areas/DesenvolvedorArea'
import ContratosArea from './areas/ContratosArea'
import ContratoArea from './areas/ContratoArea'
import AuditoriaArea from './areas/AuditoriaArea'

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
      <form onSubmit={submit} className="bg-surface-container-lowest rounded-2xl shadow-card p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <img src="/brotopay.png" alt="ExameQR" className="w-14 h-14 mx-auto mb-2 object-contain" />
          <h2 className="font-display text-xl font-extrabold tracking-tight">Defina sua nova senha</h2>
          <p className="text-sm text-on-surface-variant mt-1">Primeiro acesso — troque a senha padrão.</p>
        </div>
        <Field label="Nova senha"><Input type="password" value={p1} onChange={e => setP1(e.target.value)} required /></Field>
        <Field label="Confirmar nova senha"><Input type="password" value={p2} onChange={e => setP2(e.target.value)} required /></Field>
        {msg && <p className="text-sm text-error">{msg}</p>}
        <Button type="submit" loading={loading} className="w-full">Salvar e continuar</Button>
      </form>
    </div>
  )
}

// Navegação por papel: cada item {k, label, icon}. Ordem = ordem na sidebar.
const NAV = {
  owner: [{ k: 'empresas', label: 'Empresas', icon: 'business' }],
  empresa_admin: [
    { k: 'visao', label: 'Visão geral', icon: 'dashboard' },
    { k: 'parceiros', label: 'Parceiros', icon: 'handshake' },
    { k: 'agendamentos', label: 'Agendamentos', icon: 'event' },
    { k: 'agenda', label: 'Agenda', icon: 'calendar_month' },
    { k: 'catalogo', label: 'Exames & preços', icon: 'medical_services' },
    { k: 'cobrancas', label: 'Cobranças', icon: 'receipt_long' },
    { k: 'contratos', label: 'Contratos', icon: 'description' },
    { k: 'auditoria', label: 'Auditoria', icon: 'history' },
    { k: 'dev', label: 'Desenvolvedor', icon: 'terminal' },
  ],
  parceiro_coordenador: [
    { k: 'visao', label: 'Visão geral', icon: 'dashboard' },
    { k: 'pacientes', label: 'Pacientes', icon: 'groups' },
    { k: 'agenda', label: 'Agenda', icon: 'calendar_month' },
    { k: 'autorizacoes', label: 'Autorizações', icon: 'fact_check' },
    { k: 'cobrancas', label: 'Cobranças', icon: 'receipt_long' },
    { k: 'contrato', label: 'Contrato', icon: 'description' },
    { k: 'equipe', label: 'Funcionários', icon: 'badge' },
  ],
  parceiro_funcionario: [{ k: 'pacientes', label: 'Pacientes', icon: 'groups' }],
}

const ROLE_LABEL = { owner: 'Dono', empresa_admin: 'Empresa', parceiro_coordenador: 'Coordenador', parceiro_funcionario: 'Funcionário' }

function renderArea(role, k) {
  const map = {
    empresas: <OwnerArea />,
    visao: <VisaoGeralArea />,
    parceiros: <EmpresaArea />,
    agendamentos: <PacientesArea escolherParceiro />,
    agenda: <AgendaArea />,
    catalogo: <CatalogoArea />,
    contratos: <ContratosArea />,
    auditoria: <AuditoriaArea />,
    dev: <DesenvolvedorArea />,
    pacientes: <PacientesArea />,
    autorizacoes: <AutorizacoesArea />,
    contrato: <ContratoArea />,
    equipe: <ParceiroArea />,
    cobrancas: role === 'empresa_admin' ? <CobrancasArea /> : <CobrancasArea somenteLeitura />,
  }
  return map[k] || null
}

export default function Painel() {
  const { ready, loading, session, profile, role, signOut, reloadProfile } = useAuth()
  const [secao, setSecao] = useState(null)
  const [menuAberto, setMenuAberto] = useState(false)

  if (!ready) return <div className="p-10 text-center text-on-surface-variant">Supabase não configurado.</div>
  if (loading) return <div className="min-h-screen bg-surface"><Loading /></div>
  if (!session) return <Navigate to="/entrar" replace />
  if (profile?.must_change_password) return <TrocarSenha onDone={reloadProfile} />

  const nav = NAV[role] || []
  const sec = nav.some(n => n.k === secao) ? secao : nav[0]?.k
  const atual = nav.find(n => n.k === sec)
  const inicial = (profile?.nome || profile?.email || '?').charAt(0).toUpperCase()

  const irPara = (k) => { setSecao(k); setMenuAberto(false) }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* overlay mobile */}
      {menuAberto && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMenuAberto(false)} />}

      {/* Sidebar */}
      <aside className={`fixed z-40 inset-y-0 left-0 w-64 bg-surface-container-lowest border-r border-outline-variant/15 flex flex-col transition-transform lg:translate-x-0 ${menuAberto ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 py-5 flex items-center gap-2 border-b border-outline-variant/10">
          <img src="/brotopay.png" alt="ExameQR" className="w-9 h-9 object-contain" />
          <div className="leading-none">
            <div className="font-display text-xl font-extrabold tracking-tight text-primary">ExameQR</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-0.5">{ROLE_LABEL[role] || role}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map(n => {
            const on = n.k === sec
            return (
              <button key={n.k} onClick={() => irPara(n.k)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition ${on ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-black/[.03] hover:text-on-surface'}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: on ? "'FILL' 1" : "'FILL' 0" }}>{n.icon}</span>
                {n.label}
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-outline-variant/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-none">{inicial}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{profile?.nome || profile?.email}</p>
            <button onClick={signOut} className="text-[11px] font-bold text-on-surface-variant hover:text-error flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>logout</span>Sair</button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur border-b border-outline-variant/10 px-5 lg:px-8 h-16 flex items-center gap-3">
          <button onClick={() => setMenuAberto(true)} className="lg:hidden p-2 -ml-2 text-on-surface-variant"><span className="material-symbols-outlined">menu</span></button>
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{atual?.icon || 'dashboard'}</span>
          <h1 className="font-display text-lg font-extrabold tracking-tight">{atual?.label || 'Painel'}</h1>
        </header>

        <main className="flex-1 p-5 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {nav.length === 0
              ? <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-card text-center text-on-surface-variant">Seu perfil ainda não tem um papel definido. Fale com o administrador.</div>
              : renderArea(role, sec)}
          </div>
        </main>
      </div>
    </div>
  )
}
