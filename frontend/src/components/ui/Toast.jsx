import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastCtx = createContext(null)
export function useToast() { return useContext(ToastCtx) }

const TONES = {
  neutral: { icon: 'info', cls: 'bg-surface-container-lowest text-on-surface ring-outline-variant/30' },
  success: { icon: 'check_circle', cls: 'bg-surface-container-lowest text-on-surface ring-primary/40' },
  danger: { icon: 'error', cls: 'bg-surface-container-lowest text-on-surface ring-error/40' },
}
const ICON_COLOR = { neutral: 'text-on-surface-variant', success: 'text-primary', danger: 'text-error' }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const seq = useRef(0)

  const push = useCallback((msg, opts = {}) => {
    const id = ++seq.current
    setToasts(l => [...l, { id, msg, tone: opts.tone || 'neutral' }])
    setTimeout(() => setToasts(l => l.filter(t => t.id !== id)), opts.duration || 4200)
  }, [])

  const toast = useMemo(() => ({
    show: (m, o) => push(m, o),
    success: (m) => push(m, { tone: 'success' }),
    error: (m) => push(m, { tone: 'danger', duration: 6000 }),
    info: (m) => push(m, { tone: 'neutral' }),
  }), [push])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed z-[60] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => {
          const cfg = TONES[t.tone] || TONES.neutral
          return (
            <div key={t.id} className={`pointer-events-auto flex items-start gap-2.5 max-w-sm w-full sm:w-auto px-4 py-3 rounded-xl shadow-card ring-1 animate-popin ${cfg.cls}`}>
              <span className={`material-symbols-outlined flex-none ${ICON_COLOR[t.tone]}`} style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>{cfg.icon}</span>
              <span className="text-sm leading-snug">{t.msg}</span>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
