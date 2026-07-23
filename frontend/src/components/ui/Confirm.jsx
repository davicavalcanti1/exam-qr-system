import { createContext, useContext, useState, useCallback } from 'react'
import { Button } from './primitives'

// Confirmação dentro do sistema (substitui o window.confirm nativo do navegador).
// Uso: const confirm = useConfirm(); if (!(await confirm({ message, danger }))) return
const ConfirmCtx = createContext(null)

export function ConfirmProvider({ children }) {
  const [st, setSt] = useState(null)
  const confirm = useCallback((opts = {}) => new Promise(resolve => {
    const base = typeof opts === 'string' ? { message: opts } : opts
    setSt({ title: 'Confirmar', confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', danger: false, ...base, resolve })
  }), [])
  const fechar = (v) => { st?.resolve(v); setSt(null) }

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {st && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadein" onClick={() => fechar(false)}>
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-popin" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${st.danger ? 'bg-error-container/50 text-on-error-container' : 'bg-primary/10 text-primary'}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{st.danger ? 'warning' : 'help'}</span>
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-extrabold tracking-tight">{st.title}</h3>
                {st.message && <p className="text-sm text-on-surface-variant mt-1 whitespace-pre-line">{st.message}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => fechar(false)}>{st.cancelLabel}</Button>
              <Button variant={st.danger ? 'danger' : 'primary'} onClick={() => fechar(true)}>{st.confirmLabel}</Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx)
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>')
  return ctx
}
