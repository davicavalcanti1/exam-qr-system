import { useEffect, useRef, useState } from 'react'

const ROLE_LABEL = { owner: 'Dono', empresa_admin: 'Empresa', parceiro_coordenador: 'Coordenador', parceiro_funcionario: 'Funcionário' }

export default function PerfilMenu({ profile, role, signOut, onPerfil }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  const inicial = (profile?.nome || profile?.email || '?').charAt(0).toUpperCase()

  useEffect(() => {
    if (!aberto) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [aberto])

  const item = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition'

  return (
    <div className="p-3 border-t border-outline-variant/10 relative" ref={ref}>
      {aberto && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-surface-container-lowest rounded-2xl shadow-card ring-1 ring-outline-variant/15 p-2 animate-popin">
          <button onClick={() => { onPerfil?.(); setAberto(false) }} className={`${item} text-on-surface hover:bg-black/[.04]`}>
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>manage_accounts</span>
            Configurações do perfil
          </button>
          <a href="/documentacao" target="_blank" rel="noreferrer" onClick={() => setAberto(false)} className={`${item} text-on-surface hover:bg-black/[.04]`}>
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>menu_book</span>
            Documentação
          </a>
          <div className="mt-1 pt-1 border-t border-outline-variant/10">
            <button onClick={signOut} className={`${item} text-error hover:bg-error/10`}>
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
    </div>
  )
}
