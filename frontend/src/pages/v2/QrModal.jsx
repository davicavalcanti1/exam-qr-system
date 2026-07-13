import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

// Mostra o QR de um exame autorizado. Só o coordenador/empresa/owner geram.
export default function QrModal({ exame, onClose }) {
  const [loading, setLoading] = useState(true)
  const [dataUrl, setDataUrl] = useState(null)
  const [err, setErr] = useState('')

  const liberado = exame && ['autorizado', 'realizado'].includes(exame.status)

  useEffect(() => {
    if (!exame || !liberado) { setLoading(false); return }
    let ok = true
    adminApi.gerarQr(exame.id)
      .then(r => { if (ok) setDataUrl(r.dataUrl) })
      .catch(e => { if (ok) setErr(e.message) })
      .finally(() => { if (ok) setLoading(false) })
    return () => { ok = false }
  }, [exame?.id])

  if (!exame) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <div>
            <h3 className="text-lg font-bold">QR do exame</h3>
            <p className="text-xs text-on-surface-variant">{exame.nome}</p>
          </div>
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-6 flex flex-col items-center text-center gap-4">
          {!liberado ? (
            <div className="py-8 text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>lock</span>
              <p className="mt-2 text-sm">Este exame ainda não foi autorizado. O coordenador precisa autorizar antes de gerar o QR.</p>
            </div>
          ) : loading ? (
            <div className="py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : err ? (
            <p className="py-8 text-sm text-error">{err}</p>
          ) : (
            <>
              <div className="p-4 bg-white rounded-2xl border-4 border-surface-container-high">
                <img src={dataUrl} alt="QR do exame" className="w-56 h-56" />
              </div>
              <p className="text-sm text-on-surface-variant">Apresente na recepção da clínica para confirmar o exame.</p>
              {exame.status === 'realizado' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-on-tertiary-fixed-variant bg-tertiary-fixed-dim/20 px-3 py-1 rounded-full">
                  <span className="material-symbols-outlined text-sm">check_circle</span>Já realizado
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
