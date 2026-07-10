import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Client criado só quando o env está presente (evita crash se faltar config).
export const supabase = url && anon ? createClient(url, anon) : null
export const supabaseReady = Boolean(supabase)

// Domínio sintético dos usuários por username (nome.sobrenome). O owner usa e-mail real.
export const USER_EMAIL_DOMAIN = 'exameqr.app'

// Resolve o que o usuário digitou no login em um e-mail do Supabase Auth:
//  - contém "@"  → e-mail real (owner)
//  - senão       → "<nome.sobrenome>@exameqr.app" (demais usuários)
export function resolveLoginEmail(input) {
  const v = String(input || '').trim().toLowerCase()
  return v.includes('@') ? v : `${v}@${USER_EMAIL_DOMAIN}`
}
