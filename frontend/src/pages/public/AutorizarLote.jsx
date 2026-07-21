import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, resolveLoginEmail } from '../../lib/supabase'

export default function AutorizarLote() {
  const { token } = useParams()
  const [dados, setDados] = useState(undefined) // undefined=carregando, null=erro
  const [erro, setErro] = useState('')
  const [logado, setLogado] = useState(false)
  const [login, setLogin] = useState(''); const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [feito, setFeito] = useState(false)
  const [msg, setMsg] = useState('')

  async function carregar() {
    try {
      const r = await fetch(`/api/autorizacao/${token}`)
      const d = await r.json()
      if (!r.ok) { setErro(d.error || 'Link inválido'); setDados(null); return }
      setDados(d)
      if (d.status === 'confirmado') setFeito(true)
    } catch { setErro('Falha de conexão'); setDados(null) }
  }
  useEffect(() => {
    carregar()
    supabase.auth.getSession().then(({ data }) => setLogado(!!data.session))
  }, [token])

  async function entrar(e) {
    e.preventDefault(); setMsg(''); setEntrando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: resolveLoginEmail(login), password: senha })
    setEntrando(false)
    if (error) return setMsg('Usuário ou senha incorretos.')
    setLogado(true)
  }

  async function confirmar() {
    setMsg(''); setConfirmando(true)
    const { data, error } = await supabase.rpc('confirmar_lote_autorizacao', { p_token: token })
    setConfirmando(false)
    if (error) return setMsg(error.message.includes('permiss') ? 'Este login não é o coordenador responsável por este parceiro.' : error.message)
    setFeito(true)
  }

  if (dados === undefined) return <Tela><p className="text-on-surface-variant">Carregando…</p></Tela>
  if (dados === null) return <Tela><Erro texto={erro} /></Tela>

  return (
    <Tela empresa={dados.empresa}>
      <div className="text-center mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Confirmação de exames</h1>
        <p className="text-sm text-on-surface-variant mt-1">Parceiro: <b>{dados.parceiro}</b> · {dados.total} exame(s) · {dados.totalValor}</p>
      </div>

      {/* Lista */}
      <div className="bg-surface rounded-2xl ring-1 ring-outline-variant/15 divide-y divide-outline-variant/10 mb-5 max-h-[46vh] overflow-y-auto">
        {dados.itens.map((i, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{i.paciente}</p>
              <p className="text-[11px] text-on-surface-variant truncate">{i.exame}</p>
            </div>
            <span className="text-sm font-bold tabular-nums flex-none">{i.valorFmt}</span>
          </div>
        ))}
      </div>

      {feito ? (
        <div className="rounded-2xl bg-tertiary-fixed-dim/25 text-on-tertiary-fixed-variant p-5 text-center">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <p className="font-bold mt-1">Exames autorizados!</p>
          <p className="text-sm mt-1">Pode fechar esta página.</p>
        </div>
      ) : !logado ? (
        <form onSubmit={entrar} className="space-y-3">
          <p className="text-sm text-on-surface-variant text-center">Entre com seu usuário para autorizar.</p>
          <input value={login} onChange={e => setLogin(e.target.value)} placeholder="Usuário ou e-mail" autoFocus required className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" />
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha" required className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" />
          {msg && <p className="text-sm text-error text-center">{msg}</p>}
          <button disabled={entrando} className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:bg-primary-container transition disabled:opacity-50">{entrando ? 'Entrando…' : 'Entrar'}</button>
        </form>
      ) : (
        <div className="space-y-3">
          {msg && <p className="text-sm text-error text-center">{msg}</p>}
          <button disabled={confirmando} onClick={confirmar} className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-xl hover:bg-primary-container transition disabled:opacity-50 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">verified</span>{confirmando ? 'Autorizando…' : `Confirmar e autorizar (${dados.total})`}
          </button>
        </div>
      )}
    </Tela>
  )
}

function Tela({ children, empresa }) {
  return (
    <div className="min-h-[100dvh] soft-bg-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-card p-6">
        <div className="flex items-center justify-center gap-2 mb-5">
          {empresa?.logo ? <img src={empresa.logo} alt="" className="h-8 max-w-[160px] object-contain" />
            : <span className="font-display text-lg font-extrabold text-primary">{empresa?.nome || 'ExameQR'}</span>}
        </div>
        {children}
      </div>
    </div>
  )
}
function Erro({ texto }) {
  return (
    <div className="text-center py-6">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant">link_off</span>
      <p className="font-bold mt-2">{texto || 'Link inválido'}</p>
    </div>
  )
}
