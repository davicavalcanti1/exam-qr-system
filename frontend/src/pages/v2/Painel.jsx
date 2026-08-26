import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import { Button, Field, Input, Loading } from '../../components/ui'
import BuscaGlobal from '../../components/BuscaGlobal'
import PerfilMenu from './PerfilMenu'
import AceiteDPA from './AceiteDPA'
import { DPA_VERSAO } from '../../legal/dpa'
import OwnerArea from './areas/OwnerArea'
import SsoArea from './areas/SsoArea'
import EmpresaArea from './areas/EmpresaArea'
import ParceiroArea from './areas/ParceiroArea'
import PacientesArea from './areas/PacientesArea'
import AutorizacoesArea from './areas/AutorizacoesArea'
import CatalogoArea from './areas/CatalogoArea'
import VisaoGeralArea from './areas/VisaoGeralArea'
import CobrancasArea from './areas/CobrancasArea'
import AgendaArea from './areas/AgendaArea'
import ContratosArea from './areas/ContratosArea'
import ContratoArea from './areas/ContratoArea'
import AuditoriaArea from './areas/AuditoriaArea'
import UsoArea from './areas/UsoArea'
import ConfiguracoesArea from './areas/ConfiguracoesArea'
import ParceiroMarcaArea from './areas/ParceiroMarcaArea'
import PerfilArea from './areas/PerfilArea'
import ConfirmacoesArea from './areas/ConfirmacoesArea'
import ComprovantesArea from './areas/ComprovantesArea'
import MapaArea from './areas/MapaArea'

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

// Conta autenticada mas sem papel (ex.: entrou com Google sem convite).
function SemAcesso({ nome, onSignOut }) {
  return (
    <div className="min-h-screen soft-bg-gradient flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-card p-8 w-full max-w-sm text-center">
        <span className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-surface-container flex items-center justify-center"><span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '28px' }}>lock_person</span></span>
        <h2 className="font-display text-xl font-extrabold tracking-tight">Conta sem acesso</h2>
        <p className="text-sm text-on-surface-variant mt-2">Olá{nome ? `, ${nome}` : ''}. Seu login funcionou, mas este e-mail ainda não foi convidado por nenhuma empresa. Peça ao administrador para convidar <b>este mesmo e-mail</b>.</p>
        <button onClick={onSignOut} className="mt-6 w-full py-3 rounded-xl bg-surface-container font-bold text-sm hover:bg-surface-container-high transition">Sair</button>
      </div>
    </div>
  )
}

// Navegação por papel: cada item {k, label, icon}. Ordem = ordem na sidebar.
const NAV = {
  owner: [
    { k: 'empresas', label: 'Empresas', icon: 'business' },
    { k: 'mapa', label: 'Mapa', icon: 'map' },
    { k: 'uso', label: 'Consumo', icon: 'monitoring' },
    // Quem, de fora, entra aqui. Decisao de plataforma, nao de clinica — por
    // isso so aparece para owner.
    { k: 'sso', label: 'Acesso externo', icon: 'key' },
  ],
  empresa_admin: [
    { k: 'visao', label: 'Visão geral', icon: 'dashboard' },
    { k: 'parceiros', label: 'Parceiros', icon: 'handshake' },
    { k: 'agendamentos', label: 'Agendamentos', icon: 'event' },
    { k: 'confirmacoes', label: 'Confirmações', icon: 'checklist' },
    { k: 'comprovantes', label: 'Comprovantes', icon: 'qr_code_2' },
    { k: 'agenda', label: 'Agenda', icon: 'calendar_month' },
    { k: 'catalogo', label: 'Exames & preços', icon: 'medical_services' },
    { k: 'cobrancas', label: 'Cobranças', icon: 'receipt_long' },
    { k: 'contratos', label: 'Contratos', icon: 'description' },
    { k: 'auditoria', label: 'Auditoria', icon: 'history' },
    { k: 'config', label: 'Configurações', icon: 'settings' },
  ],
  parceiro_coordenador: [
    { k: 'visao', label: 'Visão geral', icon: 'dashboard' },
    { k: 'pacientes', label: 'Pacientes', icon: 'groups' },
    { k: 'agenda', label: 'Agenda', icon: 'calendar_month' },
    { k: 'autorizacoes', label: 'Autorizações', icon: 'fact_check' },
    { k: 'comprovantes', label: 'Comprovantes', icon: 'qr_code_2' },
    { k: 'cobrancas', label: 'Cobranças', icon: 'receipt_long' },
    { k: 'contrato', label: 'Contrato', icon: 'description' },
    { k: 'equipe', label: 'Funcionários', icon: 'badge' },
    { k: 'marca', label: 'Minha marca', icon: 'palette' },
  ],
  parceiro_funcionario: [{ k: 'pacientes', label: 'Pacientes', icon: 'groups' }],
  empresa_operador: [
    { k: 'agendamentos', label: 'Agendamentos', icon: 'event' },
    { k: 'confirmacoes', label: 'Confirmações', icon: 'checklist' },
    { k: 'comprovantes', label: 'Comprovantes', icon: 'qr_code_2' },
  ],
}

const ROLE_LABEL = { owner: 'Dono', empresa_admin: 'Empresa', empresa_operador: 'Operador', parceiro_coordenador: 'Coordenador', parceiro_funcionario: 'Funcionário' }

function renderArea(role, k, irPara) {
  const map = {
    empresas: <OwnerArea />,
    sso: <SsoArea />,
    uso: <UsoArea />,
    mapa: <MapaArea />,
    config: <ConfiguracoesArea />,
    visao: <VisaoGeralArea irPara={irPara} />,
    parceiros: <EmpresaArea />,
    agendamentos: <PacientesArea escolherParceiro />,
    confirmacoes: <ConfirmacoesArea />,
    comprovantes: <ComprovantesArea />,
    agenda: <AgendaArea />,
    catalogo: <CatalogoArea />,
    contratos: <ContratosArea />,
    auditoria: <AuditoriaArea />,
    pacientes: <PacientesArea />,
    autorizacoes: <AutorizacoesArea />,
    contrato: <ContratoArea />,
    equipe: <ParceiroArea />,
    marca: <ParceiroMarcaArea />,
    cobrancas: role === 'empresa_admin' ? <CobrancasArea /> : <CobrancasArea somenteLeitura />,
  }
  return map[k] || null
}

export default function Painel() {
  const { ready, loading, session, profile, role, branding, signOut, reloadProfile } = useAuth()
  const [secao, setSecao] = useState(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const [view, setView] = useState(null) // 'perfil' | null

  // Embutido = exibido dentro do Controle Operacional. Calculado no render:
  // uma página não deixa de estar em iframe no meio da vida. try/catch por
  // segurança. Ver ADR 0003 em imago-platform/docs/adr.
  let embutido = false
  try { embutido = window.self !== window.top } catch { embutido = true }
  const [dpaOk, setDpaOk] = useState(null) // null=carregando; true=aceito/não aplicável; false=pendente

  useEffect(() => {
    if (role !== 'empresa_admin' || !profile?.empresa_id) { setDpaOk(true); return }
    setDpaOk(null)
    // `status` entra aqui porque, com a assinatura pelo ZapSign, a linha passa a
    // nascer PENDENTE no envio. Sem o filtro, mandar o Termo para assinar já
    // liberaria o painel — e a empresa entraria sem ter aceitado nada.
    supabase.from('dpa_aceites').select('id').eq('empresa_id', profile.empresa_id)
      .eq('versao', DPA_VERSAO).eq('status', 'assinado').limit(1)
      .then(({ data }) => setDpaOk((data?.length || 0) > 0))
  }, [role, profile?.empresa_id])

  if (!ready) return <div className="p-10 text-center text-on-surface-variant">Supabase não configurado.</div>
  if (loading) return <div className="min-h-screen bg-surface"><Loading /></div>
  if (!session) return <Navigate to="/entrar" replace />
  if (profile && !role) return <SemAcesso nome={profile.nome} onSignOut={signOut} />
  if (profile?.must_change_password) return <TrocarSenha onDone={reloadProfile} />
  if (role === 'empresa_admin' && dpaOk === null) return <div className="min-h-screen bg-surface"><Loading /></div>
  if (role === 'empresa_admin' && dpaOk === false) return <AceiteDPA onDone={() => setDpaOk(true)} />

  const nav = NAV[role] || []
  const sec = nav.some(n => n.k === secao) ? secao : nav[0]?.k
  const atual = nav.find(n => n.k === sec)

  const irPara = (k) => { setSecao(k); setView(null); setMenuAberto(false) }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* overlay mobile */}
      {menuAberto && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMenuAberto(false)} />}

      {/* Sidebar */}
      {/* ── Casca em modo embutido ──────────────────────────────────────────
          Exibido dentro do Controle Operacional, este painel some com o que a
          casca de lá já oferece — marca e menu de perfil — e mantém o que é só
          dele: a navegação entre as áreas. São níveis diferentes de navegação;
          esconder a lateral inteira deixaria o módulo sem como circular.

          O "Sair" some por um motivo além da duplicação: sair daqui sem sair do
          sistema faria o SSO entrar de novo no carregamento seguinte. O botão
          existiria para não funcionar. */}
      <aside className={`fixed z-40 inset-y-0 left-0 w-64 bg-surface-container-lowest border-r border-outline-variant/15 flex flex-col transition-transform lg:translate-x-0 ${menuAberto ? 'translate-x-0' : '-translate-x-full'}`}>
        {!embutido && (
        <div className="px-5 py-5 border-b border-outline-variant/10">
          {branding.tenant && branding.logo
            ? <img src={branding.logo} alt={branding.nome} className="h-14 max-w-full object-contain object-left" />
            : branding.tenant
              ? <div className="font-display text-2xl font-extrabold tracking-tight text-primary truncate">{branding.nome}</div>
              : <div className="flex items-center gap-2">
                  <img src="/brotopay.png" alt="ExameQR" className="w-9 h-9 object-contain flex-none" />
                  <div className="leading-none min-w-0">
                    <div className="font-display text-xl font-extrabold tracking-tight text-primary truncate">{branding.nome}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-0.5">{ROLE_LABEL[role] || role}</div>
                  </div>
                </div>}
        </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map(n => {
            const on = n.k === sec
            return (
              <button key={n.k} onClick={() => irPara(n.k)}
                className={`group relative w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-bold transition ${on ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-black/[.04] hover:text-on-surface'}`}>
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full bg-primary transition-all ${on ? 'h-5 opacity-100' : 'h-0 opacity-0'}`} />
                <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: on ? "'FILL' 1" : "'FILL' 0" }}>{n.icon}</span>
                {n.label}
              </button>
            )
          })}
        </nav>

        {embutido ? (
          /* Embutido, "Sair" nao faz sentido — a casca de fora e que manda na
             sessao do sistema. Mas ALGUMA acao precisa existir: o SSO so decide
             quem voce e quando NAO ha sessao, entao mudanca de papel, de empresa
             ou de vinculo so chega na proxima entrada. Sem isto a pessoa fica
             presa na identidade da primeira vez, sem nada na tela para
             explicar. Aconteceu em 26/ago: o vinculo foi criado e o painel
             continuou mostrando a conta antiga.

             Encerra a sessao daqui e recarrega; o SSO reentra sozinho, agora com
             os dados atuais. */
          <button
            type="button"
            onClick={async () => { await signOut(); window.location.reload() }}
            className="m-3 flex items-center justify-center gap-2 rounded-xl border border-outline-variant/20 px-3 py-2 text-xs font-bold text-on-surface-variant transition hover:bg-black/[.04]"
            title="Reentra pelo sistema com papel e empresa atualizados"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Atualizar acesso
          </button>
        ) : (
          <PerfilMenu profile={profile} role={role} signOut={signOut} onPerfil={() => { setView('perfil'); setMenuAberto(false) }} />
        )}
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur border-b border-outline-variant/10 px-5 lg:px-8 h-16 flex items-center gap-3">
          <button onClick={() => setMenuAberto(true)} className="lg:hidden p-2 -ml-2 text-on-surface-variant"><span className="material-symbols-outlined">menu</span></button>
          <span className="material-symbols-outlined text-primary flex-none" style={{ fontVariationSettings: "'FILL' 1" }}>{view === 'perfil' ? 'manage_accounts' : (atual?.icon || 'dashboard')}</span>
          <h1 className="font-display text-lg font-extrabold tracking-tight truncate min-w-0">{view === 'perfil' ? 'Perfil' : (atual?.label || 'Painel')}</h1>
          {role !== 'owner' && nav.length > 0 && (
            <div className="ml-auto">
              <BuscaGlobal onSelect={() => irPara(role === 'empresa_admin' ? 'agendamentos' : 'pacientes')} />
            </div>
          )}
        </header>

        <main className="flex-1 p-5 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {view === 'perfil'
              ? <PerfilArea onBack={() => setView(null)} />
              : nav.length === 0
                ? <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-card text-center text-on-surface-variant">Seu perfil ainda não tem um papel definido. Fale com o administrador.</div>
                : renderArea(role, sec, irPara)}
          </div>
        </main>
      </div>
    </div>
  )
}
