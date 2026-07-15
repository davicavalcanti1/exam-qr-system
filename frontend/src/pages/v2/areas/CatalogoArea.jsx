import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CatalogoArea() {
  const { empresaId } = useAuth()
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editValor, setEditValor] = useState('')

  async function load() {
    const { data } = await supabase.from('procedimentos').select('id, nome, valor, ativo').order('nome')
    setItens(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function criar(e) {
    e.preventDefault(); setErr('')
    const v = parseFloat(String(valor).replace(',', '.'))
    if (!nome.trim() || !(v >= 0)) { setErr('Informe nome e valor.'); return }
    setSaving(true)
    const { error } = await supabase.from('procedimentos').insert({ empresa_id: empresaId, nome: nome.trim(), valor: v })
    if (error) setErr(error.message)
    else { setNome(''); setValor(''); await load() }
    setSaving(false)
  }

  async function salvarValor(id) {
    const v = parseFloat(String(editValor).replace(',', '.'))
    if (!(v >= 0)) return
    await supabase.from('procedimentos').update({ valor: v }).eq('id', id)
    setEditId(null); await load()
  }
  async function toggle(item) {
    await supabase.from('procedimentos').update({ ativo: !item.ativo }).eq('id', item.id)
    await load()
  }

  const input = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant'

  return (
    <div className="space-y-8">
      <section className="bg-surface-container-lowest p-6 rounded-2xl shadow-card">
        <h3 className="text-lg font-semibold mb-4">Novo exame</h3>
        <form onSubmit={criar} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-end">
          <div><label className={label}>Nome do exame</label><input className={input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Mamografia Parceiro" required /></div>
          <div><label className={label}>Valor (R$)</label><input className={input} type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} required /></div>
          <button disabled={saving} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50 h-[42px]">{saving ? '…' : 'Adicionar'}</button>
          {err && <div className="md:col-span-3 text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{err}</div>}
        </form>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10"><h3 className="text-lg font-semibold">Exames oferecidos ({itens.length})</h3></div>
        {loading ? <p className="text-center py-10 text-on-surface-variant text-sm">Carregando…</p>
          : itens.length === 0 ? <p className="text-center py-10 text-on-surface-variant text-sm">Nenhum exame cadastrado. Adicione acima.</p>
          : <div className="divide-y divide-outline-variant/10">
              {itens.map(it => (
                <div key={it.id} className={`flex items-center justify-between gap-4 px-6 py-3 ${it.ativo ? '' : 'opacity-50'}`}>
                  <span className="font-medium">{it.nome}</span>
                  <div className="flex items-center gap-3">
                    {editId === it.id ? (
                      <>
                        <input className="w-28 px-2 py-1 text-sm rounded-lg ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary tabular-nums" type="number" min="0" step="0.01" value={editValor} onChange={e => setEditValor(e.target.value)} autoFocus />
                        <button onClick={() => salvarValor(it.id)} className="text-[11px] font-bold text-primary hover:underline">Salvar</button>
                        <button onClick={() => setEditId(null)} className="text-[11px] font-bold text-on-surface-variant hover:underline">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <span className="font-bold tabular-nums text-on-surface">{fmt(it.valor)}</span>
                        <button onClick={() => { setEditId(it.id); setEditValor(String(it.valor)) }} className="p-1 text-on-surface-variant hover:text-primary" title="Editar preço"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span></button>
                        <button onClick={() => toggle(it)} className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant">{it.ativo ? 'ativo' : 'inativo'}</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>}
      </section>
    </div>
  )
}
