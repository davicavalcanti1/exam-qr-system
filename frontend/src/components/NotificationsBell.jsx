import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

// Sino de notificações. Sem backend de eventos: deriva avisos reais dos dados
// já existentes (teto, bloqueios). variant: 'partner' | 'clinic'.
export default function NotificationsBell({ variant = 'partner' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const navigate = useNavigate()

  async function loadPartner() {
    const b = await api.getBudget()
    const pct = Math.round(b.percentUsed || 0)
    const out = []
    if (b.budgetBlocked || b.blocked) {
      out.push({ level: 'error', icon: 'lock', text: 'Teto atingido. Registre um pagamento para liberar novas emissões.', to: '/payment' })
    } else if (pct >= 70) {
      out.push({ level: 'warn', icon: 'warning', text: `Você já usou ${pct}% do seu teto de crédito.`, to: '/dashboard' })
    }
    if (typeof b.pending === 'number' && b.pending > 0) {
      out.push({ level: 'info', icon: 'schedule', text: 'Há exames emitidos aguardando confirmação no scan.', to: '/dashboard' })
    }
    return out
  }

  async function loadClinic() {
    const s = await api.getClinicStats()
    const out = []
    if (s.blocked > 0) out.push({ level: 'error', icon: 'block', text: `${s.blocked} parceiro(s) com teto estourado, pendentes de pagamento.`, to: '/clinic/finance' })
    if (s.atRisk > 0) out.push({ level: 'warn', icon: 'warning', text: `${s.atRisk} parceiro(s) acima de 70% do teto.`, to: '/clinic' })
    return out
  }

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && !loaded) {
      setLoading(true)
      try {
        setItems(variant === 'clinic' ? await loadClinic() : await loadPartner())
      } catch { setItems([]) } finally { setLoading(false); setLoaded(true) }
    }
  }

  const dot = { error: 'bg-error', warn: 'bg-yellow-400', info: 'bg-primary' }

  return (
    <div className="relative">
      <button
        title="Notificações"
        onClick={toggle}
        className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors relative"
      >
        <span className="material-symbols-outlined">notifications</span>
        {loaded && items.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-card ring-1 ring-outline-variant/10 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant/10">
              <p className="text-sm font-bold">Notificações</p>
            </div>
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-on-surface-variant">Carregando…</p>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="material-symbols-outlined text-tertiary-fixed-dim" style={{ fontSize: '32px' }}>check_circle</span>
                <p className="text-sm text-on-surface-variant mt-2">Tudo em dia — nenhuma notificação.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10 max-h-96 overflow-y-auto">
                {items.map((n, i) => (
                  <button
                    key={i}
                    onClick={() => { setOpen(false); if (n.to) navigate(n.to) }}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className={`mt-1 w-2 h-2 rounded-full flex-none ${dot[n.level] || 'bg-primary'}`} />
                    <span className="text-sm text-on-surface">{n.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
