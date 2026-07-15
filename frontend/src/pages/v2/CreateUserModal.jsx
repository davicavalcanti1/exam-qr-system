import { useState, useEffect } from 'react'
import { adminApi, sugerirUsername } from '../../lib/adminApi'

// Modal genérico de criação de usuário da hierarquia.
// role/empresaId/parceiroId vêm do contexto de quem está criando.
export default function CreateUserModal({ open, title, role, empresaId, parceiroId, onClose, onCreated }) {
  const [nome, setNome] = useState('')
  const [username, setUsername] = useState('')
  const [touched, setTouched] = useState(false)
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => { if (open) { setNome(''); setUsername(''); setTouched(false); setSenha(''); setErr(''); setResult(null) } }, [open])
  useEffect(() => { if (!touched) setUsername(sugerirUsername(nome)) }, [nome, touched])

  if (!open) return null

  async function submit(e) {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      const r = await adminApi.createUser({ nome, username, role, empresaId, parceiroId, senha: senha || undefined })
      setResult(r); onCreated && onCreated()
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  const input = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadein" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-popin" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h3 className="text-lg font-bold">{title || 'Novo usuário'}</h3>
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary"><span className="material-symbols-outlined">check_circle</span><b>Usuário criado!</b></div>
            <div className="bg-surface-container rounded-lg p-4 text-sm space-y-2">
              <div><span className="text-on-surface-variant">Usuário: </span><b className="tabular-nums">{result.username}</b></div>
              <div><span className="text-on-surface-variant">Senha inicial: </span><b className="tabular-nums">{result.senha_inicial}</b></div>
              <p className="text-xs text-on-surface-variant">Repasse essas credenciais. No 1º acesso o sistema pede troca de senha.</p>
            </div>
            <button onClick={onClose} className="w-full bg-primary text-white font-bold py-2.5 rounded-lg hover:bg-primary-container transition">Fechar</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-4">
            <div><label className={label}>Nome completo</label><input className={input} value={nome} onChange={e => setNome(e.target.value)} required autoFocus /></div>
            <div>
              <label className={label}>Usuário (login)</label>
              <input className={input} value={username} onChange={e => { setTouched(true); setUsername(e.target.value) }} placeholder="nome.sobrenome" required />
            </div>
            <div><label className={label}>Senha inicial (opcional)</label><input className={input} value={senha} onChange={e => setSenha(e.target.value)} placeholder="padrão do sistema" /></div>
            {err && <p className="text-sm text-error">{err}</p>}
            <button disabled={loading} className="w-full bg-primary text-white font-bold py-2.5 rounded-lg hover:bg-primary-container transition disabled:opacity-50">
              {loading ? 'Criando…' : 'Criar usuário'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
