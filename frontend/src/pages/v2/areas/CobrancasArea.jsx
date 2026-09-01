import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { logAudit } from '../../../lib/audit'
import { adminApi } from '../../../lib/adminApi'
import ReciboModal from '../ReciboModal'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hoje = () => new Date().toISOString().slice(0, 10)
const primeiroDia = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }
const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

const ST = {
  aberta: { label: 'Aberta', cls: 'bg-yellow-50 text-yellow-700' },
  paga: { label: 'Paga', cls: 'bg-primary/10 text-primary' },
  cancelada: { label: 'Cancelada', cls: 'bg-error-container/40 text-on-error-container' },
}

export default function CobrancasArea({ somenteLeitura = false }) {
  const { user, profile, empresaId, empresa } = useAuth()
  const [parceiros, setParceiros] = useState([])
  const [parceiroSel, setParceiroSel] = useState('')
  const [ini, setIni] = useState(() => empresa?.periodo_cobranca_dias ? diasAtras(empresa.periodo_cobranca_dias) : primeiroDia())
  const [fim, setFim] = useState(hoje())
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [recibo, setRecibo] = useState(null)
  const [asaasAtivo, setAsaasAtivo] = useState(false)
  const [gerando, setGerando] = useState(null) // id da cobrança em geração
  const [erroLinha, setErroLinha] = useState({}) // id -> mensagem
  const [anexo, setAnexo] = useState(null)

  useEffect(() => {
    supabase.from('parceiros').select('id, nome').order('nome').then(({ data }) => setParceiros(data || []))
  }, [])

  // Só quem administra a empresa (gestor) configura/vê o Asaas — mesmo recorte
  // do backend (comEmpresa gestor:true). O parceiro (somenteLeitura) não chama
  // isso; ele só enxerga o link/PIX já gerados, que vêm junto do lote.
  useEffect(() => {
    if (somenteLeitura) return
    adminApi.asaasConfig().then(r => setAsaasAtivo(!!r.ativo)).catch(() => setAsaasAtivo(false))
  }, [somenteLeitura])

  async function load() {
    const { data } = await supabase
      .from('cobrancas')
      .select('id, periodo_inicio, periodo_fim, valor_total, qtd_exames, status, created_at, gateway, gateway_id, link_pagamento, pix_copia_cola, anexo_path, anexo_nome, parceiros(nome)')
      .order('created_at', { ascending: false })
    setLista(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function calcular() {
    setErr(''); setPreview(null)
    if (!parceiroSel) return setErr('Selecione o parceiro.')
    const { data, error } = await supabase
      .from('exames')
      .select('id, nome, valor, realizado_at, pacientes(nome)')
      .eq('parceiro_id', parceiroSel)
      .eq('status', 'realizado')
      .is('cobranca_id', null)
      .gte('realizado_at', `${ini}T00:00:00`)
      .lte('realizado_at', `${fim}T23:59:59`)
      .order('realizado_at')
    if (error) return setErr(error.message)
    const total = (data || []).reduce((s, e) => s + Number(e.valor || 0), 0)
    setPreview({ itens: data || [], total })
  }

  async function fechar() {
    if (!preview || preview.itens.length === 0) return
    setBusy(true); setErr('')
    try {
      const { data: cob, error: cErr } = await supabase.from('cobrancas').insert({
        empresa_id: empresaId, parceiro_id: parceiroSel,
        periodo_inicio: ini, periodo_fim: fim,
        valor_total: preview.total, qtd_exames: preview.itens.length,
        status: 'aberta', criada_por: user?.id,
      }).select('id').single()
      if (cErr) throw cErr
      const ids = preview.itens.map(i => i.id)
      const { error: eErr } = await supabase.from('exames').update({ cobranca_id: cob.id }).in('id', ids)
      if (eErr) throw eErr
      // Anexo (boleto/fatura) — opcional e best-effort: falha no upload não
      // desfaz o lote, só avisa. Caminho amarrado às policies do bucket:
      // <empresa_id>/<parceiro_id>/<cobranca_id>/<arquivo>
      if (anexo) {
        const nomeArq = anexo.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${empresaId}/${parceiroSel}/${cob.id}/${nomeArq}`
        const { error: upErr } = await supabase.storage.from('cobrancas').upload(path, anexo, { upsert: true })
        if (upErr) setErr(`Lote fechado, mas o anexo falhou: ${upErr.message}`)
        else await supabase.from('cobrancas').update({ anexo_path: path, anexo_nome: anexo.name }).eq('id', cob.id)
      }
      logAudit({ empresaId, atorId: user?.id, atorNome: profile?.nome, acao: 'cobranca.fechada', entidade: 'cobranca', entidadeId: cob.id, detalhe: { total: preview.total, qtd: preview.itens.length, periodo: `${ini}..${fim}`, anexo: anexo?.name || null } })
      setPreview(null); setParceiroSel(''); setAnexo(null); await load()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  async function gerarPagamento(id) {
    setGerando(id); setErroLinha(e => ({ ...e, [id]: '' }))
    try {
      await adminApi.asaasGerarPagamento(id)
      logAudit({ empresaId, atorId: user?.id, atorNome: profile?.nome, acao: 'cobranca.pagamento_gerado_ui', entidade: 'cobranca', entidadeId: id })
      await load()
    } catch (e) { setErroLinha(er => ({ ...er, [id]: e.message })) } finally { setGerando(null) }
  }

  async function verificarPagamento(id) {
    setGerando(id); setErroLinha(e => ({ ...e, [id]: '' }))
    try { await adminApi.asaasStatusCobranca(id); await load() }
    catch (e) { setErroLinha(er => ({ ...er, [id]: e.message })) } finally { setGerando(null) }
  }

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto) } catch { /* sem clipboard, sem drama */ }
  }

  async function abrirAnexo(c) {
    const { data, error } = await supabase.storage.from('cobrancas').createSignedUrl(c.anexo_path, 300)
    if (error || !data?.signedUrl) return window.alert('Não foi possível abrir o anexo: ' + (error?.message || 'sem URL'))
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function marcarPaga(id) {
    await supabase.from('cobrancas').update({ status: 'paga', paga_at: new Date().toISOString() }).eq('id', id)
    logAudit({ empresaId, atorId: user?.id, atorNome: profile?.nome, acao: 'cobranca.paga', entidade: 'cobranca', entidadeId: id })
    await load()
  }

  async function cancelar(id) {
    // libera os exames do lote de volta para cobrança
    await supabase.from('exames').update({ cobranca_id: null }).eq('cobranca_id', id)
    await supabase.from('cobrancas').update({ status: 'cancelada' }).eq('id', id)
    await load()
  }

  const input = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant'

  return (
    <div className="space-y-8">
      {!somenteLeitura && (
      <section className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl shadow-card">
        <h3 className="text-lg font-semibold mb-1">Fechar lote de cobrança</h3>
        <p className="text-sm text-on-surface-variant mb-4">Soma os exames <b>realizados</b> (débito no scan) do parceiro no período, ainda não faturados.</p>
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className={label}>Parceiro</label>
            <select className={input} value={parceiroSel} onChange={e => { setParceiroSel(e.target.value); setPreview(null) }}>
              <option value="">Selecione…</option>
              {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div><label className={label}>De</label><input type="date" className={input} value={ini} onChange={e => { setIni(e.target.value); setPreview(null) }} /></div>
          <div><label className={label}>Até</label><input type="date" className={input} value={fim} onChange={e => { setFim(e.target.value); setPreview(null) }} /></div>
          <button onClick={calcular} className="px-4 py-2.5 bg-surface-container text-on-surface font-bold text-sm rounded-lg hover:bg-surface-container-high transition">Calcular</button>
        </div>
        {err && <div className="mt-3 text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{err}</div>}

        {preview && (
          <div className="mt-5 border-t border-outline-variant/10 pt-5">
            {preview.itens.length === 0
              ? <p className="text-sm text-on-surface-variant">Nenhum exame realizado e não faturado nesse período.</p>
              : <>
                  <div className="space-y-1 max-h-52 overflow-y-auto mb-4">
                    {preview.itens.map(i => (
                      <div key={i.id} className="flex justify-between text-sm py-1.5 border-b border-outline-variant/5">
                        <span className="truncate">{i.pacientes?.nome || '—'} · <span className="text-on-surface-variant">{i.nome}</span></span>
                        <span className="tabular-nums flex-none ml-3">{fmt(i.valor)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mb-4">
                    <label className={label}>Anexo <span className="font-normal normal-case">(opcional — boleto, fatura… o parceiro vê)</span></label>
                    <div className="flex items-center gap-2 mt-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container text-sm font-bold cursor-pointer hover:bg-surface-container-high transition">
                        <span className="material-symbols-outlined text-base">attach_file</span>{anexo ? 'Trocar arquivo' : 'Escolher arquivo'}
                        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e => setAnexo(e.target.files?.[0] || null)} />
                      </label>
                      {anexo && <span className="text-sm text-on-surface-variant truncate">{anexo.name} <button onClick={() => setAnexo(null)} className="text-error font-bold ml-1" title="Remover">×</button></span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">{preview.itens.length} exame(s) · Total <b className="text-on-surface tabular-nums">{fmt(preview.total)}</b></span>
                    <button disabled={busy} onClick={fechar} className="px-5 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{busy ? 'Fechando…' : 'Fechar lote'}</button>
                  </div>
                </>}
          </div>
        )}
      </section>
      )}

      <section className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-outline-variant/10"><h3 className="text-lg font-semibold">{somenteLeitura ? 'Suas cobranças' : 'Lotes'} ({lista.length})</h3></div>
        {loading ? <p className="text-center py-10 text-on-surface-variant text-sm">Carregando…</p>
          : lista.length === 0 ? <p className="text-center py-10 text-on-surface-variant text-sm">Nenhum lote fechado ainda.</p>
          : <div className="divide-y divide-outline-variant/10">
              {lista.map(c => {
                const st = ST[c.status] || ST.aberta
                const emGeracao = gerando === c.id
                return (
                  <div key={c.id} className="px-4 sm:px-6 py-4 hover:bg-black/[.02] transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-none">{(c.parceiros?.nome || '?').charAt(0).toUpperCase()}</span>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{c.parceiros?.nome || '—'}</p>
                          <p className="text-[11px] text-on-surface-variant tabular-nums">{c.periodo_inicio} → {c.periodo_fim} · {c.qtd_exames} exame(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap pl-12 sm:pl-0">
                        <span className="tabular-nums font-semibold">{fmt(c.valor_total)}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                        {c.anexo_path && <button onClick={() => abrirAnexo(c)} className="p-2 text-on-surface-variant hover:text-primary" title={`Anexo: ${c.anexo_nome || 'arquivo'}`}><span className="material-symbols-outlined">attach_file</span></button>}
                        <button onClick={() => setRecibo(c.id)} className="p-2 text-on-surface-variant hover:text-primary" title="Recibo"><span className="material-symbols-outlined">receipt_long</span></button>
                        {!somenteLeitura && c.status === 'aberta' && !c.gateway_id && <>
                          {asaasAtivo && (
                            <button disabled={emGeracao} onClick={() => gerarPagamento(c.id)} className="px-3 py-1.5 text-[11px] font-bold bg-primary text-on-primary rounded-md hover:bg-primary-container transition disabled:opacity-50">
                              {emGeracao ? 'Gerando…' : 'Gerar cobrança'}
                            </button>
                          )}
                          <button onClick={() => marcarPaga(c.id)} className="px-3 py-1.5 text-[11px] font-bold bg-surface-container text-on-surface rounded-md hover:bg-surface-container-high transition">Marcar paga</button>
                          <button onClick={() => cancelar(c.id)} className="p-2 text-on-surface-variant hover:text-error" title="Cancelar lote"><span className="material-symbols-outlined">close</span></button>
                        </>}
                        {!somenteLeitura && c.status === 'aberta' && c.gateway_id && <>
                          <button disabled={emGeracao} onClick={() => verificarPagamento(c.id)} className="px-3 py-1.5 text-[11px] font-bold bg-surface-container text-on-surface rounded-md hover:bg-surface-container-high transition disabled:opacity-50">
                            {emGeracao ? 'Verificando…' : 'Verificar pagamento'}
                          </button>
                          <button onClick={() => cancelar(c.id)} className="p-2 text-on-surface-variant hover:text-error" title="Cancelar lote"><span className="material-symbols-outlined">close</span></button>
                        </>}
                      </div>
                    </div>

                    {erroLinha[c.id] && (
                      <p className="mt-2 text-[11px] text-on-error-container bg-error-container/40 rounded-lg px-3 py-1.5">{erroLinha[c.id]}</p>
                    )}

                    {/* Link/PIX — visível pro parceiro também (é ele quem paga), não só pro gestor. */}
                    {c.status === 'aberta' && c.gateway === 'asaas' && (c.link_pagamento || c.pix_copia_cola) && (
                      <div className="mt-3 ml-0 sm:ml-12 flex flex-wrap items-center gap-2 text-[11px]">
                        {c.link_pagamento && (
                          <a href={c.link_pagamento} target="_blank" rel="noreferrer" className="px-3 py-1.5 font-bold bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition">Abrir cobrança</a>
                        )}
                        {c.pix_copia_cola && (
                          <button onClick={() => copiar(c.pix_copia_cola)} className="px-3 py-1.5 font-bold bg-surface-container text-on-surface rounded-md hover:bg-surface-container-high transition">Copiar PIX copia-e-cola</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>}
      </section>

      {recibo && <ReciboModal cobrancaId={recibo} onClose={() => setRecibo(null)} />}
    </div>
  )
}
