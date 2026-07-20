import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeCtx = createContext(null)
const KEY = 'exameqr-theme' // 'light' | 'dark' | 'system'

function systemPrefereDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

// Aplica de fato a classe .dark no <html> a partir da preferência.
function aplicar(pref) {
  const escuro = pref === 'dark' || (pref === 'system' && systemPrefereDark())
  document.documentElement.classList.toggle('dark', escuro)
  return escuro
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem(KEY) || 'light')
  const [escuro, setEscuro] = useState(() => aplicar(localStorage.getItem(KEY) || 'light'))

  const setTheme = useCallback((pref) => {
    localStorage.setItem(KEY, pref)
    setThemeState(pref)
    setEscuro(aplicar(pref))
  }, [])

  // Se estiver em "sistema", acompanha a mudança do SO em tempo real.
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setEscuro(aplicar('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return <ThemeCtx.Provider value={{ theme, escuro, setTheme }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme fora do ThemeProvider')
  return ctx
}
