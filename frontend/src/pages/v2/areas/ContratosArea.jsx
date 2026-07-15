import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import ContratoModal from '../ContratoModal'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hojeBR = () => new Date().toLocaleDateString('pt-BR')

const MODELO_PADRAO = `Pelo presente instrumento, {{empresa_nome}} e o parceiro {{parceiro_nome}} (CNPJ {{parceiro_cnpj}}) firmam parceria para a realização de exames.

1. O parceiro custeia os exames de seus pacientes até o teto de {{teto}}.
2. O valor de cada exame é debitado do teto somente após a confirmação da realização (leitura do QR).
3. As cobranças são fechadas por lote, conforme período definido pela empresa.
4. Este contrato passa a vigorar na data da assinatura eletrônica: {{data}}.`

const ST = {
  pendente: { label: 'Aguardando assinatura', cls: 'bg-yellow-50 text-yellow-700' },
  assinado: { label: 'Assinado', cls: 'bg-primary/10 text-primary' },
  cancelado: { label: 'Cancelado', cls: 'bg-error-container/40 text-on-error-container' },
}

const preencher = (txt, ctx) => String(txt || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx[k] ?? `{{${k}}}`))

export default function ContratosArea() {
  const { empresaId } = useAuth()
  const [empresa, setEmpresa] = useState(null)
  const [modelo, setModelo] = useState({ titulo: 'Contrato de Parceria', conteudo: MODELO_PADRAO })
  const [savingModelo, setSavingModelo] = useState(false)
  const [modeloMsg, setModeloMsg] = useState('')
  const [parceiros, setParceiros] = useState([])
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [ver, setVer] = useState(null)
  const [gerando, setGerando] = useState(null)

  async function load() {
    const [{ data: emp }, { data: mod }, { data: parc }, { data: cont }] = await Promise.all([
      supabase.from('empresas').select('nome, cnpj').eq('id', empresaId).maybeSingle(),
      supabase.from('contrato_modelos').select('titulo, conteudo').eq('empresa_id', empresaId).maybeSingle(),
      supabase.from('parceiros').select('id, nome, cnpj, teto').order('nome'),
      supabase.from('contratos').select('id, parceiro_id, titulo, conteudo, status, assinante_nome, assinado_at, created_at').order('created_at', { ascending: false }),
    ])
    setEmpresa(emp)
    if (mod) setModelo(mod)
    setParceiros(parc || []); setContratos(cont || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function salvarModelo() {
    setSavingModelo(true); setModeloMsg('')
    const { error } = await supabase.from('contrato_modelos').upsert({
      empresa_id: empresaId, titulo: modelo.titulo, conteudo: modelo.conteudo, updated_at: new Date().toISOString(),
    }, { onConflict: 'empresa_id' })
    setSavingModelo(false)
    setModeloMsg(error ? error.message : 'Modelo salvo.')
  }

  async function gerar(parc) {
    setGerando(parc.id)
    const ctx = {
      parceiro_nome: parc.nome, parceiro_cnpj: parc.cnpj || '—', teto: fmt(parc.teto),
      empresa_nome: empresa?.nome || '', empresa_cnpj: empresa?.cnpj || '—', data: hojeBR(),
    }
    const { error } = await supabase.from('contratos').insert({
      empresa_id: empresaId, parceiro_id: parc.id, titulo: modelo.titulo,
      conteudo: preencher(modelo.conteudo, ctx), status: 'pendente',
    })
    setGerando(null)
    if (!error) await load()
  }

  async function cancelar(id) {
    await supabase.from('contratos').update({ status: 'cancelado' }).eq('id', id)
    await load()
  }

  const contratoDoParceiro = (pid) => contratos.find(c => c.parceiro_id === pid && c.status !== 'cancelado')

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  const input = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant'

  return (
    <div className="space-y-8">
      {/* Modelo */}
      <section className="bg-surface-container-lowest p-6 rounded-2xl shadow-card space-y-3">
        <h3 className="text-lg font-semibold">Modelo do contrato</h3>
        <p className="text-sm text-on-surface-variant">Use os campos entre chaves — eles são preenchidos ao gerar: <code className="text-xs bg-surface-container px-1 rounded">{'{{parceiro_nome}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{parceiro_cnpj}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{teto}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{empresa_nome}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{data}}'}</code></p>
        <div><label className={label}>Título</label><input className={input} value={modelo.titulo} onChange={e => setModelo(m => ({ ...m, titulo: e.target.value }))} /></div>
        <div><label className={label}>Texto</label><textarea className={`${input} font-mono`} rows={10} value={modelo.conteudo} onChange={e => setModelo(m => ({ ...m, conteudo: e.target.value }))} /></div>
        <div className="flex items-center gap-3">
          <button disabled={savingModelo} onClick={salvarModelo} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{savingModelo ? 'Salvando…' : 'Salvar modelo'}</button>
          {modeloMsg && <span className="text-sm text-on-surface-variant">{modeloMsg}</span>}
        </div>
      </section>

      {/* Contratos por parceiro */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10"><h3 className="text-lg font-semibold">Contratos por parceiro ({parceiros.length})</h3></div>
        {parceiros.length === 0 ? <p className="text-center py-10 text-on-surface-variant text-sm">Nenhum parceiro cadastrado.</p>
          : <div className="divide-y divide-outline-variant/10">
              {parceiros.map(p => {
                const c = contratoDoParceiro(p.id)
                const st = c ? (ST[c.status] || ST.pendente) : null
                return (
                  <div key={p.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0"><p className="font-semibold truncate">{p.nome}</p><p className="text-[11px] text-on-surface-variant">Teto {fmt(p.teto)}</p></div>
                    <div className="flex items-center gap-2 flex-none">
                      {c
                        ? <>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                            <button onClick={() => setVer(c)} className="p-2 text-on-surface-variant hover:text-primary" title="Ver contrato"><span className="material-symbols-outlined">description</span></button>
                            {c.status !== 'assinado' && <button onClick={() => cancelar(c.id)} className="p-2 text-on-surface-variant hover:text-error" title="Cancelar"><span className="material-symbols-outlined">close</span></button>}
                          </>
                        : <button disabled={gerando === p.id} onClick={() => gerar(p)} className="px-3 py-1.5 text-[11px] font-bold bg-primary text-white rounded-md hover:bg-primary-container transition disabled:opacity-50">{gerando === p.id ? 'Gerando…' : 'Gerar contrato'}</button>}
                    </div>
                  </div>
                )
              })}
            </div>}
      </section>

      {ver && <ContratoModal contrato={ver} onClose={() => setVer(null)} onChange={load} />}
    </div>
  )
}
