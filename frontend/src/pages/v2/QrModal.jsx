import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

const dataHora = (s) => {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Comprovante de exame (imprimível) com o QR. Só coordenador/empresa/owner geram.
export default function QrModal({ exame, onClose }) {
  const [loading, setLoading] = useState(true)
  const [dataUrl, setDataUrl] = useState(null)
  const [comp, setComp] = useState(null)
  const [err, setErr] = useState('')

  const liberado = exame && ['autorizado', 'realizado'].includes(exame.status)

  useEffect(() => {
    if (!exame || !liberado) { setLoading(false); return }
    let ok = true
    adminApi.gerarQr(exame.id)
      .then(r => { if (ok) { setDataUrl(r.dataUrl); setComp(r.comprovante || null) } })
      .catch(e => { if (ok) setErr(e.message) })
      .finally(() => { if (ok) setLoading(false) })
    return () => { ok = false }
  }, [exame?.id])

  if (!exame) return null
  const c = comp || {}
  const quando = dataHora(c.scheduledAt)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadein" onClick={onClose}>
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #comprovante-print, #comprovante-print * { visibility: visible !important; }
        #comprovante-print { position: absolute; inset: 0; margin: 0; box-shadow: none; border-radius: 0; }
        .no-print { display: none !important; }
      }`}</style>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto animate-popin" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 no-print">
          <h3 className="text-lg font-bold">Comprovante do exame</h3>
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
        </div>

        {!liberado ? (
          <div className="p-8 text-center text-on-surface-variant">
            <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>lock</span>
            <p className="mt-2 text-sm">Este exame ainda não foi autorizado. O coordenador precisa autorizar antes de gerar o comprovante.</p>
          </div>
        ) : loading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : err ? (
          <p className="p-8 text-sm text-error text-center">{err}</p>
        ) : (
          <>
            <div id="comprovante-print" className="p-6">
              {/* Cabeçalho: marca da clínica */}
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4 mb-5">
                <div className="flex items-center gap-2 min-w-0">
                  {c.empresa?.logo && <img src={c.empresa.logo} alt="" className="h-9 max-w-[150px] object-contain" />}
                  <span className="font-display text-xl font-extrabold tracking-tight text-primary truncate">{c.empresa?.nome || 'Clínica'}</span>
                </div>
                <div className="text-right text-[10px] text-on-surface-variant flex-none">
                  Comprovante<br /><span className="tabular-nums">#{c.protocolo}</span>
                </div>
              </div>

              {/* QR */}
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-2xl border-4 border-surface-container-high">
                  <img src={dataUrl} alt="QR do exame" className="w-52 h-52" />
                </div>
                <p className="text-xs text-on-surface-variant text-center max-w-[16rem]">Apresente este QR na recepção da clínica para confirmar o exame.</p>
              </div>

              {/* Dados */}
              <div className="mt-5 rounded-2xl bg-surface-container-low divide-y divide-outline-variant/10 text-sm">
                <div className="flex justify-between px-4 py-2.5"><span className="text-on-surface-variant">Paciente</span><span className="font-semibold text-right">{c.paciente}</span></div>
                <div className="flex justify-between px-4 py-2.5"><span className="text-on-surface-variant">Exame</span><span className="font-semibold text-right">{c.exame}</span></div>
                {quando && <div className="flex justify-between px-4 py-2.5"><span className="text-on-surface-variant">Data / horário</span><span className="font-semibold text-right tabular-nums">{quando}</span></div>}
              </div>

              <p className="text-[10px] text-on-surface-variant text-center mt-4">Comprovante gerado pelo ExameQR · não é um documento fiscal.</p>
            </div>

            <div className="no-print flex justify-end gap-2 px-6 pb-5">
              <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface rounded-lg">Fechar</button>
              <button onClick={() => window.print()} className="px-5 py-2 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary-container transition flex items-center gap-1.5"><span className="material-symbols-outlined text-base">print</span>Imprimir / PDF</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
