import { supabase } from './supabase'

// Uso agregado por empresa (RPC owner-only get_empresa_uso).
export async function carregarUso() {
  const { data, error } = await supabase.rpc('get_empresa_uso')
  if (error) throw error
  return data || []
}

export async function carregarMensal(empresaId) {
  const { data, error } = await supabase.rpc('get_empresa_exames_mensal', { p_empresa_id: empresaId })
  if (error) throw error
  return data || []
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const rotuloMes = (iso) => { const d = new Date(iso + 'T00:00:00'); return `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` }

export function fmtBytes(n) {
  n = Number(n || 0)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtData = (s) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'
