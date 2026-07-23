import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { adminApi } from '../../../lib/adminApi'
import { useAuth } from '../../../auth/AuthContext'
import { Card, Button, Loading, EmptyState, Field, Select, useToast } from '../../../components/ui'

const dataHora = (s) => {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Kit de comprovantes: seleciona pacientes (exames AUTORIZADOS) e baixa 1 PDF
// com todos os QR codes juntos — para enviar ao parceiro (ou imprimir/distribuir).
export default function ComprovantesArea() {
  const { role, empresaId, parceiroId } = useAuth()
  const toast = useToast()
  const ehParceiro = role === 'parceiro_coordenador'
  const [parceiros, setParceiros] = useState([])
  const [parceiroSel, setParceiroSel] = useState(ehParceiro ? parceiroId : '')
  const [exames, setExames] = useState(null)
  const [sel, setSel] = useState({})
  const [baixando, setBaixando] = useState(false)
  const [enviando, setEnviando] = useState(null) // 'paciente' | 'parceiro'

  useEffect(() => {
    if (ehParceiro) { carregar(parceiroId); return }
    supabase.from('parceiros').select('id, nome').order('nome').then(({ data }) => setParceiros(data || []))
  }, [])

  async function carregar(pid) {
    if (!pid) { setExames(null); return }
    setExames(null); setSel({})
    let q = supabase.from('exames')
      .select('id, nome, scheduled_at, pacientes(nome)')
      .eq('parceiro_id', pid).eq('status', 'autorizado').order('created_at')
    if (empresaId) q = q.eq('empresa_id', empresaId)
    const { data } = await q
    setExames(data || [])
  }
  function escolherParceiro(pid) { setParceiroSel(pid); carregar(pid) }

  const ids = Object.keys(sel).filter(k => sel[k])
  const todos = exames && exames.length > 0 && ids.length === exames.length

  async function baixar() {
    if (!ids.length) return toast.error('Selecione ao menos um paciente.')
    setBaixando(true)
    try {
      const nome = ids.length === 1 ? 'comprovante' : `comprovantes-${ids.length}`
      await adminApi.gerarQrPdf(ids, `${nome}.pdf`)
      toast.success(`PDF gerado com ${ids.length} comprovante(s).`)
    } catch (e) { toast.error(e.message) } finally { setBaixando(false) }
  }

  async function enviar(destino) {
    if (!ids.length) return toast.error('Selecione ao menos um paciente.')
    setEnviando(destino)
    try {
      const r = await adminApi.enviarComprovanteWhatsapp(ids, destino)
      if (destino === 'parceiro') {
        r.ok ? toast.success(`PDF com ${r.enviados} comprovante(s) enviado ao parceiro${r.parceiro ? ` (${r.parceiro})` : ''}.`)
             : toast.error('Não foi possível enviar ao parceiro.')
      } else {
        const falhas = (r.resultados || []).filter(x => !x.ok)
        if (r.enviados > 0 && !falhas.length) toast.success(`Comprovante enviado a ${r.enviados} paciente(s).`)
        else if (r.enviados > 0) toast.success(`${r.enviados} enviado(s); ${falhas.length} sem telefone/erro.`)
        else toast.error('Nenhum paciente tinha telefone válido cadastrado.')
      }
    } catch (e) { toast.error(e.message) } finally { setEnviando(null) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <h3 className="text-lg font-semibold">Comprovantes (QR) em lote</h3>
        <p className="text-sm text-on-surface-variant mt-1 mb-4">
          Selecione os pacientes com exame autorizado e baixe <b>um único PDF</b> com todos os QR codes — pronto para enviar ao parceiro pelo WhatsApp ou imprimir. Cada QR também pode ser baixado individualmente pelo comprovante do paciente.
        </p>
        {!ehParceiro && (
          <Field label="Parceiro">
            <Select value={parceiroSel} onChange={e => escolherParceiro(e.target.value)}>
              <option value="">Selecione o parceiro…</option>
              {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </Field>
        )}
      </Card>

      {parceiroSel && (exames === null ? <Loading />
        : exames.length === 0 ? <Card><EmptyState icon="qr_code_2" title="Nada autorizado" hint="Nenhum exame autorizado (com QR disponível) para este parceiro." /></Card>
        : <Card className="overflow-hidden">
            <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                <input type="checkbox" checked={todos} onChange={e => setSel(e.target.checked ? Object.fromEntries(exames.map(x => [x.id, true])) : {})} className="w-4 h-4 accent-primary" />
                Selecionar todos ({exames.length})
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="secondary" icon="picture_as_pdf" onClick={baixar} loading={baixando} disabled={!ids.length}>PDF ({ids.length})</Button>
                <Button variant="secondary" icon="send" onClick={() => enviar('paciente')} loading={enviando === 'paciente'} disabled={!ids.length || !!enviando}>Enviar a pacientes</Button>
                <Button icon="send" onClick={() => enviar('parceiro')} loading={enviando === 'parceiro'} disabled={!ids.length || !!enviando}>Enviar ao parceiro</Button>
              </div>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {exames.map(e => (
                <label key={e.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/[.02]">
                  <input type="checkbox" checked={!!sel[e.id]} onChange={ev => setSel(s => ({ ...s, [e.id]: ev.target.checked }))} className="w-4 h-4 accent-primary flex-none" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{e.pacientes?.nome || '—'}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{e.nome}{dataHora(e.scheduled_at) ? ` · ${dataHora(e.scheduled_at)}` : ''}</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant/50 flex-none" style={{ fontSize: '20px' }}>qr_code_2</span>
                </label>
              ))}
            </div>
          </Card>)}
    </div>
  )
}
