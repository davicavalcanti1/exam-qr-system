import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { adminApi } from '../../../lib/adminApi'
import { useAuth } from '../../../auth/AuthContext'
import { Card, Button, Loading, EmptyState, Field, Select, useToast } from '../../../components/ui'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Funcionário da empresa: seleciona exames aguardando autorização de um parceiro
// e gera 1 link público de confirmação (enviado ao WhatsApp do parceiro).
export default function ConfirmacoesArea() {
  const { empresaId } = useAuth()
  const toast = useToast()
  const [parceiros, setParceiros] = useState([])
  const [parceiroSel, setParceiroSel] = useState('')
  const [exames, setExames] = useState(null)
  const [sel, setSel] = useState({})
  const [gerando, setGerando] = useState(false)
  const [resultado, setResultado] = useState(null)

  useEffect(() => { supabase.from('parceiros').select('id, nome').order('nome').then(({ data }) => setParceiros(data || [])) }, [])

  async function carregar(pid) {
    setExames(null); setSel({}); setResultado(null)
    const { data } = await supabase.from('exames')
      .select('id, nome, valor, scheduled_at, pacientes(nome)')
      .eq('parceiro_id', pid).eq('status', 'aguardando_autorizacao').is('autorizacao_lote_id', null)
      .order('created_at')
    setExames(data || [])
  }
  function escolherParceiro(pid) { setParceiroSel(pid); if (pid) carregar(pid); else setExames(null) }

  const ids = Object.keys(sel).filter(k => sel[k])
  const todos = exames && exames.length > 0 && ids.length === exames.length
  const totalSel = (exames || []).filter(e => sel[e.id]).reduce((s, e) => s + Number(e.valor || 0), 0)

  async function gerar() {
    if (!ids.length) return toast.error('Selecione ao menos um exame.')
    setGerando(true)
    try {
      const r = await adminApi.criarLoteAutorizacao({ exameIds: ids, parceiroId: parceiroSel, empresaId })
      setResultado(r)
      toast.success(`Link gerado (${r.qtd} exames).`)
      carregar(parceiroSel)
    } catch (e) { toast.error(e.message) } finally { setGerando(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold">Confirmações por link</h3>
        <p className="text-sm text-on-surface-variant mt-1 mb-4">Selecione os exames agendados e gere um link para o parceiro autorizar tudo de uma vez.</p>
        <Field label="Parceiro">
          <Select value={parceiroSel} onChange={e => escolherParceiro(e.target.value)}>
            <option value="">Selecione o parceiro…</option>
            {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </Field>
      </Card>

      {resultado && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-primary font-bold"><span className="material-symbols-outlined">link</span>Link de confirmação gerado</div>
          <div className="flex gap-2 mt-3">
            <input readOnly value={resultado.link} className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30" />
            <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(resultado.link); toast.success('Link copiado.') }} className="flex-none">Copiar</Button>
          </div>
          <p className="text-[12px] text-on-surface-variant mt-2">
            WhatsApp: {resultado.whatsapp?.enviado ? '✅ enviado ao parceiro' : `⚠️ não enviado (${resultado.whatsapp?.motivo}) — copie e envie manualmente`}
          </p>
        </Card>
      )}

      {parceiroSel && (exames === null ? <Loading />
        : exames.length === 0 ? <Card><EmptyState icon="fact_check" title="Nada aguardando" hint="Nenhum exame aguardando autorização para este parceiro." /></Card>
        : <Card className="overflow-hidden">
            <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                <input type="checkbox" checked={todos} onChange={e => setSel(e.target.checked ? Object.fromEntries(exames.map(x => [x.id, true])) : {})} className="w-4 h-4 accent-primary" />
                Selecionar todos ({exames.length})
              </label>
              <Button icon="send" onClick={gerar} loading={gerando} disabled={!ids.length}>Gerar link ({ids.length})</Button>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {exames.map(e => (
                <label key={e.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/[.02]">
                  <input type="checkbox" checked={!!sel[e.id]} onChange={ev => setSel(s => ({ ...s, [e.id]: ev.target.checked }))} className="w-4 h-4 accent-primary flex-none" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{e.pacientes?.nome || '—'}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{e.nome}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums flex-none">{fmt(e.valor)}</span>
                </label>
              ))}
            </div>
            {ids.length > 0 && <div className="p-4 border-t border-outline-variant/10 text-sm text-right">Selecionado: <b className="tabular-nums">{fmt(totalSel)}</b></div>}
          </Card>)}
    </div>
  )
}
