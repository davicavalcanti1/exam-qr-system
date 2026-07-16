import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { Card, Button, Field, Input, Badge, Loading, EmptyState, useToast } from '../../../components/ui'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CatalogoArea() {
  const { empresaId } = useAuth()
  const toast = useToast()
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
    else { setNome(''); setValor(''); toast.success('Exame adicionado.'); await load() }
    setSaving(false)
  }

  async function salvarValor(id) {
    const v = parseFloat(String(editValor).replace(',', '.'))
    if (!(v >= 0)) return
    await supabase.from('procedimentos').update({ valor: v }).eq('id', id)
    setEditId(null); toast.success('Preço atualizado.'); await load()
  }
  async function toggle(item) {
    await supabase.from('procedimentos').update({ ativo: !item.ativo }).eq('id', item.id)
    await load()
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Novo exame</h3>
        <form onSubmit={criar} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-end">
          <Field label="Nome do exame"><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Mamografia Parceiro" required /></Field>
          <Field label="Valor (R$)"><Input className="md:w-40" type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} required /></Field>
          <Button type="submit" loading={saving} icon="add">Adicionar</Button>
          {err && <div className="md:col-span-3 text-sm px-3 py-2 rounded-xl bg-error-container/50 text-on-error-container">{err}</div>}
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10"><h3 className="text-lg font-semibold">Exames oferecidos ({itens.length})</h3></div>
        {loading ? <Loading />
          : itens.length === 0 ? <EmptyState icon="medical_services" title="Nenhum exame no catálogo" hint="Adicione o primeiro exame no formulário acima." />
          : <div className="divide-y divide-outline-variant/10">
              {itens.map(it => (
                <div key={it.id} className={`flex items-center justify-between gap-4 px-6 py-3.5 transition hover:bg-black/[.02] ${it.ativo ? '' : 'opacity-55'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-none"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>medical_services</span></span>
                    <span className="font-semibold truncate">{it.nome}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-none">
                    {editId === it.id ? (
                      <>
                        <input className="w-28 px-3 py-1.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary tabular-nums" type="number" min="0" step="0.01" value={editValor} onChange={e => setEditValor(e.target.value)} autoFocus />
                        <Button size="sm" onClick={() => salvarValor(it.id)}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancelar</Button>
                      </>
                    ) : (
                      <>
                        <span className="font-bold tabular-nums text-on-surface w-24 text-right">{fmt(it.valor)}</span>
                        <button onClick={() => { setEditId(it.id); setEditValor(String(it.valor)) }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 hover:text-primary" title="Editar preço"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span></button>
                        <button onClick={() => toggle(it)} title={it.ativo ? 'Desativar' : 'Ativar'}>
                          <Badge tone={it.ativo ? 'success' : 'neutral'}>{it.ativo ? 'ativo' : 'inativo'}</Badge>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>}
      </Card>
    </div>
  )
}
