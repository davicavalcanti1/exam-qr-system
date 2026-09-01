import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import { tentarEntrarPeloSistema } from './ssoDoSistema'

const AuthContext = createContext(null)

// Provider de autenticação sobre o Supabase Auth. Expõe a sessão, o perfil
// (role/empresa_id/parceiro_id vindos da tabela profiles) e ações de login/logout.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [parceiro, setParceiro] = useState(null)
  const [loading, setLoading] = useState(true)

  // Quem chamou precisa saber se havia perfil: sessao valida sem perfil e uma
  // sessao orfa, e ela deve ser descartada em vez de virar "sem acesso".
  let perfilEncontrado = false

  async function loadProfile(userId) {
    perfilEncontrado = false
    if (!userId) { setProfile(null); setEmpresa(null); setParceiro(null); return false }
    const { data } = await supabase
      .from('profiles')
      .select('id, empresa_id, parceiro_id, nome, email, role, ativo, username, must_change_password')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data || null)
    perfilEncontrado = !!data
    // Marca do tenant: empresa do usuário (owner não tem empresa → marca da plataforma).
    if (data?.empresa_id) {
      const { data: emp } = await supabase.from('empresas').select('*').eq('id', data.empresa_id).maybeSingle()
      setEmpresa(emp || null)
    } else {
      setEmpresa(null)
    }
    // Usuário do parceiro carrega a marca do próprio parceiro.
    if (data?.parceiro_id) {
      const { data: parc } = await supabase.from('parceiros').select('id, nome, nome_exibicao, logo_url, status').eq('id', data.parceiro_id).maybeSingle()
      setParceiro(parc || null)
    } else {
      setParceiro(null)
    }
  }

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return

      // Sem sessão, mas exibido dentro do Controle Operacional: tenta a entrada
      // por ticket antes de mostrar o login. Falha em silêncio — quem abre o app
      // direto, ou quem não tem papel traduzido, vê a tela de sempre.
      let sessao = data.session
      if (!sessao) {
        const entrou = await tentarEntrarPeloSistema()
        if (!mounted) return
        if (entrou) sessao = (await supabase.auth.getSession()).data.session
      }

      setSession(sessao)
      await loadProfile(sessao?.user?.id)

      // Sessão válida e perfil inexistente = sessão órfã. Acontece quando a
      // conta é apagada e o navegador ainda tem o token, que vale por cerca de
      // uma hora: o app fica "autenticado" e sem acesso a nada, e o SSO nem
      // chega a ser tentado, porque só roda quando NÃO há sessão.
      //
      // Descartar e tentar de novo faz a pessoa reentrar pelo sistema com uma
      // conta nova, em vez de esperar o token expirar sem entender por quê.
      if (sessao && !perfilEncontrado) {
        await supabase.auth.signOut()
        if (!mounted) return
        const reentrou = await tentarEntrarPeloSistema()
        if (!mounted) return
        sessao = reentrou ? (await supabase.auth.getSession()).data.session : null
        setSession(sessao)
        await loadProfile(sessao?.user?.id)
      }

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
    empresa,
    parceiro,
    role: profile?.role || null,
    empresaId: profile?.empresa_id || null,
    parceiroId: profile?.parceiro_id || null,
    // Marca no workspace: parceiro > empresa > plataforma (owner).
    branding: parceiro
      ? { nome: parceiro.nome_exibicao || parceiro.nome, logo: parceiro.logo_url || null, tenant: true }
      : empresa
        ? { nome: empresa.nome_exibicao || empresa.nome, logo: empresa.logo_url || null, tenant: true }
        : { nome: 'ExameQR', logo: '/brotopay.png', tenant: false },
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signInGoogle: () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/painel' } }),
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
