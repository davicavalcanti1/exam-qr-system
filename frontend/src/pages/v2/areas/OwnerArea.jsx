import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Card, Button, Field, Input, Badge, Loading, EmptyState, useToast } from '../../../components/ui'
import { buscarCnpj as consultarCnpj } from '../../../integrations/brasilapi/cnpj'
import EmpresaDetalhe from './EmpresaDetalhe'

export default function OwnerArea() {
  const toast = useToast()
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nome: '', cnpj: '', slug: '', nomeFantasia: '', endereco: '', telefone: '', email: '' })
  const [buscando, setBuscando] = useState(false)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [novo, setNovo] = useState(false)
  const [selected, setSelected] = useState(null)

  async function load() {
    const { data } = await supabase.from('empresas').select('*').order('created_at', { ascending: false })
    setEmpresas(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function buscarCnpj() {
    const c = form.cnpj.replace(/\D/g, '')
    if (c.length !== 14) return toast.error('Informe um CNPJ com 14 dígitos.')
    setBuscando(true)
    try {
      const d = await consultarCnpj(c)
      setForm(f => ({ ...f, nome: d.razaoSocial || f.nome, nomeFantasia: d.nomeFantasia, endereco: d.endereco, telefone: d.telefone, email: d.email }))
      toast.success(`${d.razaoSocial}${d.situacao ? ' · ' + d.situacao : ''}`)
    } catch (e) { toast.error(e.message) } finally { setBuscando(false) }
  }

  async function createEmpresa(e) {
    e.preventDefault(); setErr(''); setSaving(true)
    const slug = (form.slug || form.nome).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await supabase.from('empresas').insert({
      nome: form.nome.trim(), cnpj: form.cnpj.trim() || null, slug,
      nome_fantasia: form.nomeFantasia || null, endereco: form.endereco || null, telefone: form.telefone || null, email: form.email || null,
    })
    if (error) setErr(error.message)
    else { setForm({ nome: '', cnpj: '', slug: '', nomeFantasia: '', endereco: '', telefone: '', email: '' }); setNovo(false); toast.success('Empresa criada.'); await load() }
    setSaving(false)
  }

  // Detalhe da empresa selecionada
  if (selected) {
    return <EmpresaDetalhe empresa={selected} onBack={() => { setSelected(null); load() }} onChange={load} />
  }

  return (
    <div className="space-y-6">
      {/* Nova empresa (recolhível) */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Empresas principais</h3>
          <Button size="sm" icon={novo ? 'close' : 'add'} variant={novo ? 'ghost' : 'primary'} onClick={() => setNovo(v => !v)}>{novo ? 'Cancelar' : 'Nova empresa'}</Button>
        </div>
        {novo && (
          <form onSubmit={createEmpresa} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-5 pt-5 border-t border-outline-variant/10">
            <Field label="CNPJ">
              <div className="flex gap-2">
                <Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="só números" />
                <Button type="button" variant="secondary" onClick={buscarCnpj} loading={buscando} className="flex-none">Buscar</Button>
              </div>
            </Field>
            <Field label="Nome / Razão social"><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></Field>
            <Field label="Slug"><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto" /></Field>
            {(form.nomeFantasia || form.endereco) && (
              <div className="md:col-span-3 text-[11px] text-on-surface-variant bg-surface rounded-xl px-3 py-2">
                {form.nomeFantasia && <b>{form.nomeFantasia}</b>}{form.endereco ? ` · ${form.endereco}` : ''}{form.telefone ? ` · ${form.telefone}` : ''}
              </div>
            )}
            {err && <div className="md:col-span-3 text-sm px-3 py-2 rounded-xl bg-error-container/50 text-on-error-container">{err}</div>}
            <div className="md:col-span-3 flex justify-end"><Button type="submit" loading={saving} icon="check">Criar empresa</Button></div>
          </form>
        )}
      </Card>

      {/* Grade de empresas (blocos clicáveis) */}
      {loading ? <Loading />
        : empresas.length === 0 ? <Card><EmptyState icon="business" title="Nenhuma empresa ainda" hint="Crie a primeira empresa principal." /></Card>
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {empresas.map(emp => (
              <Card as="button" key={emp.id} onClick={() => setSelected(emp)} className="p-5 text-left w-full hover:ring-2 hover:ring-primary/30 transition">
                <div className="flex items-start justify-between gap-2">
                  {emp.logo_url
                    ? <span className="h-11 flex items-center flex-none"><img src={emp.logo_url} alt="" className="max-h-9 max-w-[150px] object-contain" /></span>
                    : <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-none"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>business</span></span>}
                  <Badge tone={emp.status === 'ativa' ? 'success' : 'neutral'}>{emp.status}</Badge>
                </div>
                <p className="font-bold mt-3 truncate">{emp.nome}</p>
                <p className="text-[11px] text-on-surface-variant truncate">{emp.slug}{emp.cnpj ? ` · ${emp.cnpj}` : ''}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">Gerenciar<span className="material-symbols-outlined" style={{ fontSize: '15px' }}>chevron_right</span></span>
              </Card>
            ))}
          </div>}
    </div>
  )
}
