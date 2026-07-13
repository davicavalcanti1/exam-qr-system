import { supabase } from './supabase'

async function token() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

async function post(path, body) {
  const t = await token()
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Erro na requisição')
  return data
}

export const adminApi = {
  createUser: (payload) => post('/api/admin/users', payload),
  createParceiro: (payload) => post('/api/admin/parceiros', payload),
  gerarQr: (exameId) => post('/api/qr/gerar', { exameId }),
}

// "João da Silva" -> "joao.silva"
export function sugerirUsername(nome) {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s.]/g, '')
    .trim().split(/\s+/).filter(Boolean).join('.')
}
