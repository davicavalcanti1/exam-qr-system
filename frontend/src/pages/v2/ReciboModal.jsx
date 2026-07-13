import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dataBR = (s) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'

export default function ReciboModal({ cobrancaId, onClose }) {
  const [c, setC] = useState(null)
  const [itens, setItens] = useState([])

  useEffect(() => {
    (async () => {
      const { data: cob } = await supabase
        .from('cobrancas')
        .select('id, periodo_inicio, periodo_fim, valor_total, qtd_exames, status, created_at, parceiros(nome, cnpj), empresas(nome, cnpj)')
        .eq('id', cobrancaId).maybeSingle()
      setC(cob)
      const { data: ex } = await supabase
        .from('exames')
        .select('id, nome, valor, realizado_at, pacientes(nome)')
        .eq('cobranca_id', cobrancaId)
        .order('realizado_at')
      setItens(ex || [])
    })()
  }, [cobrancaId])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #recibo-print, #recibo-print * { visibility: visible !important; }
        #recibo-print { position: absolute; inset: 0; margin: 0; box-shadow: none; border-radius: 0; max-height: none; }
        .no-print { display: none !important; }
      }`}</style>
      <div className="bg-white rounded-xl shadow-card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {!c ? <div className="p-10 text-center text-on-surface-variant text-sm">Carregando…</div> : (
          <>
            <div id="recibo-print" className="p-8">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <img src="/brotopay.png" alt="ExameQR" className="w-9 h-9 object-contain" />
                  <span className="font-display text-2xl font-extrabold tracking-tight text-primary">ExameQR</span>
                </div>
                <div className="text-right text-[11px] text-on-surface-variant">
                  Recibo de lote<br /><span className="tabular-nums">#{c.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Cobrado por</p>
                  <p className="font-semibold">{c.empresas?.nome || '—'}</p>
                  {c.empresas?.cnpj && <p className="text-on-surface-variant text-xs tabular-nums">{c.empresas.cnpj}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Parceiro</p>
                  <p className="font-semibold">{c.parceiros?.nome || '—'}</p>
                  {c.parceiros?.cnpj && <p className="text-on-surface-variant text-xs tabular-nums">{c.parceiros.cnpj}</p>}
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Período</p>
                  <p className="text-sm tabular-nums">{dataBR(c.periodo_inicio)} — {dataBR(c.periodo_fim)}</p>
                </div>
              </div>

              <table className="w-full text-sm mb-5">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20">
                    <th className="text-left py-2">Paciente</th>
                    <th className="text-left py-2">Exame</th>
                    <th className="text-right py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map(i => (
                    <tr key={i.id} className="border-b border-outline-variant/10">
                      <td className="py-1.5">{i.pacientes?.nome || '—'}</td>
                      <td className="py-1.5 text-on-surface-variant">{i.nome}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(i.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between border-t-2 border-primary/30 pt-3">
                <span className="text-sm font-bold">Total ({c.qtd_exames} exames)</span>
                <span className="text-2xl font-extrabold tracking-tight tabular-nums text-primary">{fmt(c.valor_total)}</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-4">Status: {c.status} · Emitido em {dataBR(c.created_at)} · Gerado por ExameQR</p>
            </div>

            <div className="no-print flex justify-end gap-2 px-8 pb-6">
              <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface rounded-lg">Fechar</button>
              <button onClick={() => window.print()} className="px-5 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition flex items-center gap-1.5"><span className="material-symbols-outlined text-base">print</span>Imprimir / PDF</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
