import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { adminApi, carregarTudo } from '../../../lib/adminApi'

const parseId = (v) => { const m = String(v || '').match(/^\s*(\d+)/); return m ? Number(m[1]) : null }
const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function NetrisMapeamento() {
  const { empresaId } = useAuth()
  const [novo, setNovo] = useState({ nome: '', valor: '', proc: '' })
  const [criando, setCriando] = useState(false)
  const [planos, setPlanos] = useState([])
  const [procs, setProcs] = useState([])
  const [parceiros, setParceiros] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState({}) // id -> 'ok'|'erro'|'salvando'

  useEffect(() => {
    (async () => {
      try {
        const [pl, pr, parc, cat] = await Promise.all([
          carregarTudo((p) => adminApi.netrisPlanos(p), 'planos'),
          carregarTudo((p) => adminApi.netrisProcedimentos(p), 'procedimentos'),
          supabase.from('parceiros').select('id, nome, netris_id_plano_convenio, netris_id_convenio').order('nome'),
          supabase.from('procedimentos').select('id, nome, netris_procedimento_id').order('nome'),
        ])
        // dedup procedimentos por id
        const seen = new Set(); const prU = []
        for (const x of pr) { if (x.idProcedimento && !seen.has(x.idProcedimento)) { seen.add(x.idProcedimento); prU.push(x) } }
        setPlanos(pl); setProcs(prU)
        setParceiros(parc.data || []); setCatalogo(cat.data || [])
      } catch (e) { setErro(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const marca = (id, estado) => setSalvo(s => ({ ...s, [id]: estado }))

  async function salvarParceiro(parc, valor) {
    const idPlano = parseId(valor)
    if (!idPlano) return
    const plano = planos.find(p => p.idPlanoConvenio === idPlano)
    marca(parc.id, 'salvando')
    try {
      await adminApi.updateParceiroNetris(parc.id, { idPlanoConvenio: idPlano, idConvenio: plano?.idConvenio ?? null })
      setParceiros(list => list.map(x => x.id === parc.id ? { ...x, netris_id_plano_convenio: idPlano, netris_id_convenio: plano?.idConvenio ?? null } : x))
      marca(parc.id, 'ok')
    } catch { marca(parc.id, 'erro') }
  }

  async function criarExame() {
    if (!novo.nome.trim()) return
    setCriando(true)
    const idProc = parseId(novo.proc)
    const { data, error } = await supabase.from('procedimentos').insert({
      empresa_id: empresaId, nome: novo.nome.trim(), valor: Number(novo.valor || 0),
      netris_procedimento_id: idProc ? String(idProc) : null, ativo: true,
    }).select('id, nome, netris_procedimento_id').single()
    setCriando(false)
    if (error) return
    setCatalogo(list => [...list, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNovo({ nome: '', valor: '', proc: '' })
  }

  async function salvarProc(cat, valor) {
    const idProc = parseId(valor)
    if (!idProc) return
    marca(cat.id, 'salvando')
    const { error } = await supabase.from('procedimentos').update({ netris_procedimento_id: String(idProc) }).eq('id', cat.id)
    if (error) { marca(cat.id, 'erro'); return }
    setCatalogo(list => list.map(x => x.id === cat.id ? { ...x, netris_procedimento_id: String(idProc) } : x))
    marca(cat.id, 'ok')
  }

  if (loading) return <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card"><div className="flex items-center gap-2 text-sm text-on-surface-variant"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />Carregando listas do NetRis…</div></section>
  if (erro) return <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card"><p className="text-sm text-on-error-container">Não foi possível carregar do NetRis: {erro}</p></section>

  const Selo = ({ id }) => salvo[id] === 'salvando' ? <span className="text-[11px] text-on-surface-variant">salvando…</span>
    : salvo[id] === 'ok' ? <span className="text-[11px] text-primary font-bold">✓ salvo</span>
    : salvo[id] === 'erro' ? <span className="text-[11px] text-error font-bold">erro</span> : null

  const input = 'flex-1 px-3 py-2 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  const planoLabel = (p) => `${p.netris_id_plano_convenio} — ${planos.find(x => x.idPlanoConvenio === p.netris_id_plano_convenio)?.nome || '?'}`
  const procLabel = (c) => `${c.netris_procedimento_id} — ${procs.find(x => x.idProcedimento === Number(c.netris_procedimento_id))?.nome || '?'}`

  return (
    <div className="space-y-6">
      <datalist id="dl-planos">{planos.map(p => <option key={p.idPlanoConvenio} value={`${p.idPlanoConvenio} — ${p.nome}`} />)}</datalist>
      <datalist id="dl-procs">{procs.map(p => <option key={p.idProcedimento} value={`${p.idProcedimento} — ${p.nome}`} />)}</datalist>

      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
        <h3 className="text-lg font-semibold mb-1">Parceiros → plano-convênio NetRis</h3>
        <p className="text-sm text-on-surface-variant mb-4">Vincule cada parceiro ao plano-convênio dele no NetRis ({planos.length} planos). O convênio é preenchido junto.</p>
        {parceiros.length === 0 ? <p className="text-sm text-on-surface-variant">Nenhum parceiro cadastrado.</p> : (
          <div className="space-y-3">
            {parceiros.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-40 flex-none text-sm font-semibold truncate">{p.nome}</span>
                <input className={input} list="dl-planos" placeholder="Buscar plano-convênio…"
                  defaultValue={p.netris_id_plano_convenio ? planoLabel(p) : ''}
                  onChange={e => { if (planos.some(x => `${x.idPlanoConvenio} — ${x.nome}` === e.target.value)) salvarParceiro(p, e.target.value) }} />
                <span className="w-16 flex-none text-right"><Selo id={p.id} /></span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
        <h3 className="text-lg font-semibold mb-1">Exames → procedimento NetRis</h3>
        <p className="text-sm text-on-surface-variant mb-4">Vincule cada item do catálogo ao procedimento do NetRis ({procs.length} procedimentos). Ex.: “Mamografia” → 1397 MAMOGRAFIA MARCADA ONLINE.</p>

        {/* criar exame já atribuindo o procedimento */}
        <div className="bg-surface rounded-lg p-3 mb-4 grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_1.4fr_auto] gap-2 items-center">
          <input className="px-3 py-2 text-sm rounded-lg bg-surface-container-lowest ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" placeholder="Novo exame (nome)" value={novo.nome} onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))} />
          <input className="px-3 py-2 text-sm rounded-lg bg-surface-container-lowest ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" placeholder="Valor" inputMode="decimal" value={novo.valor} onChange={e => setNovo(n => ({ ...n, valor: e.target.value }))} />
          <input className="px-3 py-2 text-sm rounded-lg bg-surface-container-lowest ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" list="dl-procs" placeholder="Procedimento NetRis (opcional)" value={novo.proc} onChange={e => setNovo(n => ({ ...n, proc: e.target.value }))} />
          <button type="button" onClick={criarExame} disabled={criando || !novo.nome.trim()} className="px-4 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50 flex-none">{criando ? '…' : 'Criar'}</button>
        </div>
        {catalogo.length === 0 ? <p className="text-sm text-on-surface-variant">Nenhum exame no catálogo.</p> : (
          <div className="space-y-3">
            {catalogo.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-40 flex-none text-sm font-semibold truncate">{c.nome}</span>
                <input className={input} list="dl-procs" placeholder="Buscar procedimento…"
                  defaultValue={c.netris_procedimento_id ? procLabel(c) : ''}
                  onChange={e => { if (procs.some(x => `${x.idProcedimento} — ${x.nome}` === e.target.value)) salvarProc(c, e.target.value) }} />
                <span className="w-16 flex-none text-right"><Selo id={c.id} /></span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
