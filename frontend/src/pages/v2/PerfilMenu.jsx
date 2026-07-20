import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../theme/ThemeContext'
import { Modal, Field, Input, Button, useToast } from '../../components/ui'

const ROLE_LABEL = { owner: 'Dono', empresa_admin: 'Empresa', parceiro_coordenador: 'Coordenador', parceiro_funcionario: 'Funcionário' }
const TEMAS = [
  { k: 'light', label: 'Claro', icon: 'light_mode' },
  { k: 'dark', label: 'Escuro', icon: 'dark_mode' },
  { k: 'system', label: 'Sistema', icon: 'contrast' },
]

// Modal de configurações do perfil: alterar nome + alterar senha.
function ConfigModal({ profile, onClose, onSaved }) {
  const toast = useToast()
  const [nome, setNome] = useState(profile?.nome || '')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [s1, setS1] = useState(''); const [s2, setS2] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  async function salvarNome(e) {
    e.preventDefault()
    const n = nome.trim()
    if (!n) return toast.error('Informe um nome.')
    setSalvandoNome(true)
    const { error } = await supabase.rpc('update_own_name', { p_nome: n })
    setSalvandoNome(false)
    if (error) return toast.error(error.message)
    toast.success('Nome atualizado.'); onSaved?.()
  }

  async function salvarSenha(e) {
    e.preventDefault()
    if (s1.length < 6) return toast.error('A senha deve ter ao menos 6 caracteres.')
    if (s1 !== s2) return toast.error('As senhas não coincidem.')
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: s1 })
    setSalvandoSenha(false)
    if (error) return toast.error(error.message)
    setS1(''); setS2(''); toast.success('Senha alterada.')
  }

  return (
    <Modal open onClose={onClose} title="Configurações do perfil" subtitle={profile?.email || profile?.username} icon="manage_accounts">
      <div className="space-y-6">
        <form onSubmit={salvarNome} className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Nome de exibição</span>
          <div className="flex gap-2">
            <Field className="flex-1"><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" /></Field>
            <Button type="submit" variant="secondary" loading={salvandoNome} className="flex-none">Salvar</Button>
          </div>
        </form>

        <form onSubmit={salvarSenha} className="space-y-3 pt-5 border-t border-outline-variant/15">
          <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Alterar senha</span>
          <Field label="Nova senha"><Input type="password" value={s1} onChange={e => setS1(e.target.value)} placeholder="mínimo 6 caracteres" /></Field>
          <Field label="Confirmar nova senha"><Input type="password" value={s2} onChange={e => setS2(e.target.value)} /></Field>
          <div className="flex justify-end"><Button type="submit" loading={salvandoSenha}>Alterar senha</Button></div>
        </form>
      </div>
    </Modal>
  )
}

export default function PerfilMenu({ profile, role, signOut, reloadProfile }) {
  const { theme, setTheme } = useTheme()
  const [aberto, setAberto] = useState(false)
  const [config, setConfig] = useState(false)
  const ref = useRef(null)
  const inicial = (profile?.nome || profile?.email || '?').charAt(0).toUpperCase()

  // fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [aberto])

  return (
    <div className="p-3 border-t border-outline-variant/10 relative" ref={ref}>
      {aberto && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-surface-container-lowest rounded-2xl shadow-card ring-1 ring-outline-variant/15 p-2 animate-popin">
          <button onClick={() => { setConfig(true); setAberto(false) }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-on-surface hover:bg-black/[.04] transition">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>manage_accounts</span>
            Configurações do perfil
          </button>
          <a href="/documentacao" target="_blank" rel="noreferrer" onClick={() => setAberto(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-on-surface hover:bg-black/[.04] transition">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>menu_book</span>
            Documentação
          </a>

          <div className="px-3 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Tema</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1 bg-surface rounded-xl p-1">
              {TEMAS.map(t => {
                const on = theme === t.k
                return (
                  <button key={t.k} onClick={() => setTheme(t.k)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold transition ${on ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{t.icon}</span>
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-1 pt-1 border-t border-outline-variant/10">
            <button onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-error hover:bg-error/10 transition">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
              Encerrar sessão
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setAberto(v => !v)}
        className={`w-full flex items-center gap-3 rounded-xl px-1.5 py-1.5 transition ${aberto ? 'bg-black/[.04]' : 'hover:bg-black/[.04]'}`}>
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-none">{inicial}</div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold truncate text-on-surface">{profile?.nome || profile?.email}</p>
          <p className="text-[11px] text-on-surface-variant">{ROLE_LABEL[role] || role}</p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant flex-none" style={{ fontSize: '20px' }}>{aberto ? 'expand_more' : 'unfold_more'}</span>
      </button>

      {config && <ConfigModal profile={profile} onClose={() => setConfig(false)} onSaved={reloadProfile} />}
    </div>
  )
}
