import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'

const AuthContext = createContext(null)

// Provider de autenticação sobre o Supabase Auth. Expõe a sessão, o perfil
// (role/empresa_id/parceiro_id vindos da tabela profiles) e ações de login/logout.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId) {
    if (!userId) { setProfile(null); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, empresa_id, parceiro_id, nome, email, role, ativo, username, must_change_password')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data || null)
  }

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      loadProfile(s?.user?.id)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  const value = {
    ready: supabaseReady,
    loading,
    session,
    user: session?.user || null,
    profile,
    role: profile?.role || null,
    empresaId: profile?.empresa_id || null,
    parceiroId: profile?.parceiro_id || null,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    reloadProfile: () => loadProfile(session?.user?.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
