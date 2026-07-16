import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// Busca rápida de pacientes na topbar. onSelect(paciente) navega para a lista.
export default function BuscaGlobal({ onSelect }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState([])
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim().replace(/[,%]/g, '')
      if (term.length < 2) { setRes([]); return }
      const qd = term.replace(/\D/g, '')
      const filtro = qd ? `nome.ilike.%${term}%,cpf.ilike.%${qd}%` : `nome.ilike.%${term}%`
      const { data } = await supabase.from('pacientes').select('id, nome, cpf, anonimizado').or(filtro).limit(6)
      setRes(data || []); setOpen(true)
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={box} className="relative w-56 max-w-[45vw]">
      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" style={{ fontSize: '18px' }}>search</span>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => res.length && setOpen(true)}
        placeholder="Buscar paciente…"
        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary"
      />
      {open && res.length > 0 && (
        <div className="absolute z-30 mt-1 w-72 max-w-[80vw] right-0 bg-surface-container-lowest rounded-xl shadow-card ring-1 ring-outline-variant/15 overflow-hidden animate-popin">
          {res.map(p => (
            <button key={p.id} onClick={() => { onSelect?.(p); setOpen(false); setQ('') }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-black/[.03] text-left">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-none text-sm">{(p.nome || '?').charAt(0).toUpperCase()}</span>
              <span className="min-w-0"><span className="block text-sm font-semibold truncate">{p.nome}</span><span className="block text-[11px] text-on-surface-variant tabular-nums">{p.anonimizado ? '—' : p.cpf}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
