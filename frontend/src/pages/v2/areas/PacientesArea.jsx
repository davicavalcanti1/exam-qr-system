import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'

const CATALOGO = [
  { nome: 'Mamografia', valor: 120 },
  { nome: 'Ressonância Magnética', valor: 500 },
  { nome: 'Tomografia', valor: 350 },
  { nome: 'Ultrassom', valor: 150 },
  { nome: 'Raio-X', valor: 80 },
  { nome: 'Densitometria Óssea', valor: 100 },
]
const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const novoExame = () => ({ idx: 0, indicacao: '' })

const STATUS = {
  rascunho: { label: 'Rascunho', cls: 'bg-surface-container text-on-surface-variant' },
  aguardando_autorizacao: { label: 'Aguardando autorização', cls: 'bg-yellow-50 text-yellow-700' },
  autorizado: { label: 'Autorizado', cls: 'bg-primary/10 text-primary' },
  realizado: { label: 'Realizado', cls: 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant' },
  cancelado: { label: 'Cancelado', cls: 'bg-error-container/40 text-on-error-container' },
}

export default function PacientesArea({ escolherParceiro = false }) {
  const { user, empresaId, parceiroId } = useAuth()
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [exames, setExames] = useState([novoExame()])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [parceiros, setParceiros] = useState([])
  const [parceiroSel, setParceiroSel] = useState('')

  useEffect(() => {
    if (!escolherParceiro) return
    supabase.from('parceiros').select('id, nome').order('nome').then(({ data }) => setParceiros(data || []))
  }, [escolherParceiro])

  // parceiro efetivo: escolhido (admin da empresa) ou o do próprio usuário
  const pid = escolherParceiro ? parceiroSel : parceiroId

  async function load() {
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome, cpf, created_at, exames(id, nome, valor, status)')
      .order('created_at', { ascending: false })
    setLista(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const total = exames.reduce((s, e) => s + (CATALOGO[e.idx]?.valor || 0), 0)

  async function submit(e) {
    e.preventDefault(); setErr('')
    if (escolherParceiro && !pid) { setErr('Selecione o parceiro.'); return }
    setSaving(true)
    try {
      const cpfLimpo = cpf.replace(/\D/g, '')
      const { data: pac, error: pErr } = await supabase
        .from('pacientes')
        .insert({ empresa_id: empresaId, parceiro_id: pid, nome: nome.trim(), cpf: cpfLimpo })
        .select('id').single()
      if (pErr) throw pErr
      const rows = exames.map(ex => ({
        empresa_id: empresaId, parceiro_id: pid, paciente_id: pac.id,
        nome: CATALOGO[ex.idx].nome, valor: CATALOGO[ex.idx].valor,
        indicacao: ex.indicacao || null, status: 'aguardando_autorizacao', criado_por: user?.id,
      }))
      const { error: eErr } = await supabase.from('exames').insert(rows)
      if (eErr) throw eErr
      setNome(''); setCpf(''); setExames([novoExame()]); await load()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const input = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant'

  return (
    <div className="space-y-8">
      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
        <h3 className="text-lg font-semibold mb-4">Novo paciente</h3>
        <form onSubmit={submit} className="space-y-5">
          {escolherParceiro && (
            <div>
              <label className={label}>Parceiro</label>
              <select className={input} value={parceiroSel} onChange={e => setParceiroSel(e.target.value)} required>
                <option value="">Selecione o parceiro…</option>
                {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={label}>Nome</label><input className={input} value={nome} onChange={e => setNome(e.target.value)} required /></div>
            <div><label className={label}>CPF</label><input className={input} value={cpf} onChange={e => setCpf(e.target.value)} required /></div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={label}>Exames</span>
              <button type="button" onClick={() => setExames(x => [...x, novoExame()])} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-sm">add</span>Adicionar exame</button>
            </div>
            {exames.map((ex, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center bg-surface rounded-lg p-3">
                <select className={input} value={ex.idx} onChange={e => setExames(x => x.map((y, idx) => idx === i ? { ...y, idx: Number(e.target.value) } : y))}>
                  {CATALOGO.map((c, idx) => <option key={idx} value={idx}>{c.nome} ({fmt(c.valor)})</option>)}
                </select>
                <input className={input} placeholder="Indicação (opcional)" value={ex.indicacao} onChange={e => setExames(x => x.map((y, idx) => idx === i ? { ...y, indicacao: e.target.value } : y))} />
                {exames.length > 1
                  ? <button type="button" onClick={() => setExames(x => x.filter((_, idx) => idx !== i))} className="p-2 text-on-surface-variant hover:text-error"><span className="material-symbols-outlined">delete</span></button>
                  : <span />}
              </div>
            ))}
          </div>
          {err && <div className="text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{err}</div>}
          <div className="flex items-center justify-between">
            <span className="text-sm text-on-surface-variant">Total: <b className="text-on-surface tabular-nums">{fmt(total)}</b></span>
            <button disabled={saving} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{saving ? 'Salvando…' : 'Registrar paciente'}</button>
          </div>
        </form>
      </section>

      <section className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10"><h3 className="text-lg font-semibold">Pacientes ({lista.length})</h3></div>
        {loading ? <p className="text-center py-10 text-on-surface-variant text-sm">Carregando…</p>
          : lista.length === 0 ? <p className="text-center py-10 text-on-surface-variant text-sm">Nenhum paciente ainda.</p>
          : <div className="divide-y divide-outline-variant/10">
              {lista.map(p => (
                <div key={p.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div><p className="font-semibold">{p.nome}</p><p className="text-[11px] text-on-surface-variant tabular-nums">{p.cpf}</p></div>
                    <span className="text-sm text-on-surface-variant tabular-nums">{fmt((p.exames || []).reduce((s, e) => s + Number(e.valor || 0), 0))}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(p.exames || []).map(ex => {
                      const st = STATUS[ex.status] || STATUS.rascunho
                      return <span key={ex.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>{ex.nome} · {st.label}</span>
                    })}
                  </div>
                </div>
              ))}
            </div>}
      </section>
    </div>
  )
}
