import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { adminApi } from '../../../lib/adminApi'
import { useToast } from '../../../components/ui'
import ContratoModal from '../ContratoModal'
import { CONTRATO_MODELO, CONTRATO_TITULO } from '../../../legal/contratoParceria'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hojeBR = () => new Date().toLocaleDateString('pt-BR')

// Campos entre colchetes do modelo — comarca, prazo de pagamento, endereço — que
// só a clínica sabe preencher. Diferente de `{{placeholder}}`, que a geração
// resolve: colchete esquecido vai assim mesmo para o PDF que o parceiro assina.
const colchetesPendentes = (txt) => String(txt || '').match(/\[[^\]\n]{1,120}\]/g) || []

const ST = {
  pendente: { label: 'Aguardando assinatura', cls: 'bg-yellow-50 text-yellow-700' },
  assinado: { label: 'Assinado', cls: 'bg-primary/10 text-primary' },
  cancelado: { label: 'Cancelado', cls: 'bg-error-container/40 text-on-error-container' },
  recusado: { label: 'Recusado', cls: 'bg-error-container/40 text-on-error-container' },
  expirado: { label: 'Expirado', cls: 'bg-surface-container text-on-surface-variant' },
}

const preencher = (txt, ctx) => String(txt || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx[k] ?? `{{${k}}}`))

export default function ContratosArea() {
  const { empresaId } = useAuth()
  const toast = useToast()
  const [zapsign, setZapsign] = useState({ ativo: false })
  const [enviando, setEnviando] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [modelo, setModelo] = useState({ titulo: CONTRATO_TITULO, conteudo: CONTRATO_MODELO })
  const [savingModelo, setSavingModelo] = useState(false)
  const [modeloMsg, setModeloMsg] = useState('')
  const [parceiros, setParceiros] = useState([])
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [ver, setVer] = useState(null)
  const [gerando, setGerando] = useState(null)

  async function load() {
    const [{ data: emp }, { data: mod }, { data: parc }, { data: cont }] = await Promise.all([
      supabase.from('empresas').select('nome, cnpj, endereco').eq('id', empresaId).maybeSingle(),
      supabase.from('contrato_modelos').select('titulo, conteudo').eq('empresa_id', empresaId).maybeSingle(),
      supabase.from('parceiros').select('id, nome, cnpj, teto, endereco').order('nome'),
      supabase.from('contratos').select('id, parceiro_id, titulo, conteudo, status, assinante_nome, assinado_at, created_at, provedor, sign_url, arquivo_path, signatario_email, enviado_at').order('created_at', { ascending: false }),
    ])
    setEmpresa(emp)
    if (mod) setModelo(mod)
    setParceiros(parc || []); setContratos(cont || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  // A integração vive em integracao_configs, que o navegador não lê (RLS sem
  // policy) — quem responde se está ligada é o backend.
  useEffect(() => {
    adminApi.zapsignConfig().then(setZapsign).catch(() => setZapsign({ ativo: false }))
  }, [empresaId])

  async function enviarAssinatura(contrato) {
    setEnviando(contrato.id)
    try {
      const r = await adminApi.zapsignEnviarContrato(contrato.id)
      toast.success(r.jaEnviado
        ? 'Este contrato já estava aguardando assinatura.'
        : 'Enviado — o parceiro recebeu o link por e-mail.')
      await load()
    } catch (e) {
      toast.error(e.message || 'Falha ao enviar para assinatura.')
    } finally {
      setEnviando(null)
    }
  }

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
      parceiro_nome: parc.nome, parceiro_cnpj: parc.cnpj || '—', parceiro_endereco: parc.endereco || '—',
      teto: fmt(parc.teto),
      empresa_nome: empresa?.nome || '', empresa_cnpj: empresa?.cnpj || '—', empresa_endereco: empresa?.endereco || '—',
      data: hojeBR(),
    }
    const { error } = await supabase.from('contratos').insert({
      empresa_id: empresaId, parceiro_id: parc.id, titulo: modelo.titulo,
      conteudo: preencher(modelo.conteudo, ctx), status: 'pendente',
    })
    setGerando(null)
    if (!error) await load()
  }

  async function cancelar(id) {
    // O trigger `trg_contratos_protege` recusa alterações indevidas (reescrever o
    // texto, forjar assinatura). Sem checar o erro, a recusa passava despercebida
    // e a linha continuava na tela como se nada tivesse acontecido.
    const { error } = await supabase.from('contratos').update({ status: 'cancelado' }).eq('id', id)
    if (error) return toast.error(error.message)
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
        <p className="text-sm text-on-surface-variant">Use os campos entre chaves — eles são preenchidos ao gerar: <code className="text-xs bg-surface-container px-1 rounded">{'{{parceiro_nome}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{parceiro_cnpj}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{teto}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{parceiro_endereco}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{empresa_nome}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{empresa_cnpj}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{empresa_endereco}}'}</code> <code className="text-xs bg-surface-container px-1 rounded">{'{{data}}'}</code></p>
        <div><label className={label}>Título</label><input className={input} value={modelo.titulo} onChange={e => setModelo(m => ({ ...m, titulo: e.target.value }))} /></div>
        <div><label className={label}>Texto</label><textarea className={`${input} font-mono`} rows={24} value={modelo.conteudo} onChange={e => setModelo(m => ({ ...m, conteudo: e.target.value }))} /></div>
        {colchetesPendentes(modelo.conteudo).length > 0 && (
          <p className="text-sm text-on-error-container bg-error-container/40 rounded-lg px-3 py-2">
            <strong>{colchetesPendentes(modelo.conteudo).length} campo(s) entre colchetes</strong> ainda por preencher — eles vão assim mesmo para o contrato que o parceiro assina:{' '}
            <span className="font-mono text-xs">{colchetesPendentes(modelo.conteudo).slice(0, 6).join(' ')}{colchetesPendentes(modelo.conteudo).length > 6 ? ' …' : ''}</span>
          </p>
        )}
        <div className="flex items-center gap-3">
          <button disabled={savingModelo} onClick={salvarModelo} className="px-5 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{savingModelo ? 'Salvando…' : 'Salvar modelo'}</button>
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
                  <div key={p.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-black/[.02] transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-none">{(p.nome || '?').charAt(0).toUpperCase()}</span>
                      <div className="min-w-0"><p className="font-semibold truncate">{p.nome}</p><p className="text-[11px] text-on-surface-variant">Teto {fmt(p.teto)}</p></div>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      {c
                        ? <>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>{st.label}</span>

                            {/* Com o ZapSign ligado, o contrato pendente deixa de esperar
                                um clique do coordenador e passa a esperar a assinatura
                                autenticada — daí o botão de enviar. */}
                            {zapsign.ativo && ['pendente', 'recusado', 'expirado'].includes(c.status) && (
                              c.provedor === 'zapsign' && c.sign_url && c.status === 'pendente'
                                ? <button
                                    onClick={async () => {
                                      try { await navigator.clipboard.writeText(c.sign_url); toast.success('Link de assinatura copiado.') }
                                      catch { toast.error('Não foi possível copiar.') }
                                    }}
                                    className="p-2 text-on-surface-variant hover:text-primary"
                                    title={`Link enviado a ${c.signatario_email || 'e-mail do parceiro'} — copiar novamente`}
                                  ><span className="material-symbols-outlined">link</span></button>
                                : <button
                                    disabled={enviando === c.id}
                                    onClick={() => enviarAssinatura(c)}
                                    className="px-3 py-1.5 text-[11px] font-bold bg-secondary-container text-on-secondary-container rounded-md hover:brightness-95 transition disabled:opacity-50"
                                  >{enviando === c.id ? 'Enviando…' : c.status === 'pendente' ? 'Enviar para assinar' : 'Reenviar'}</button>
                            )}

                            <button onClick={() => setVer(c)} className="p-2 text-on-surface-variant hover:text-primary" title="Ver contrato"><span className="material-symbols-outlined">description</span></button>
                            {c.status !== 'assinado' && <button onClick={() => cancelar(c.id)} className="p-2 text-on-surface-variant hover:text-error" title="Cancelar"><span className="material-symbols-outlined">close</span></button>}
                          </>
                        : <button disabled={gerando === p.id} onClick={() => gerar(p)} className="px-3 py-1.5 text-[11px] font-bold bg-primary text-on-primary rounded-md hover:bg-primary-container transition disabled:opacity-50">{gerando === p.id ? 'Gerando…' : 'Gerar contrato'}</button>}
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
