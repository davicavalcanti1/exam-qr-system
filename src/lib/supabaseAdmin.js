import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client com SERVICE ROLE — bypassa RLS. NUNCA expor no frontend.
export const supabaseAdmin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

export function supabaseConfigured() { return Boolean(supabaseAdmin) }

// Sanidade: a chave do backend PRECISA ser a service_role (bypassa RLS).
// Se alguém colar a anon por engano, os updates falham silenciosamente (0 linhas).
if (serviceKey) {
  try {
    const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString())
    if (payload.role !== 'service_role') {
      console.warn(`[supabaseAdmin] ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY tem role="${payload.role}" (esperado "service_role"). Escritas/validação de QR vão falhar por RLS.`)
    }
  } catch { /* chave não-JWT: ignora */ }
}

// Valida o token do Supabase (Bearer) e carrega o profile de quem chama.
export async function getCaller(req) {
  if (!supabaseConfigured()) return { status: 503, error: 'Supabase não configurado no servidor' }
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { status: 401, error: 'Não autenticado' }
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return { status: 401, error: 'Sessão inválida' }
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, role, empresa_id, parceiro_id')
    .eq('id', data.user.id)
    .maybeSingle()
  if (!profile) return { status: 403, error: 'Perfil não encontrado' }
  return { user: data.user, profile }
}
