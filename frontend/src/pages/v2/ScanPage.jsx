import { useRef, useState, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [info, setInfo] = useState('')
  const scannerRef = useRef(null)

  async function stop() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }
  useEffect(() => () => { stop() }, [])

  async function start() {
    if (scanning) return
    setResult(null); setInfo('Iniciando câmera…'); setScanning(true)
    try {
      const scanner = new Html5Qrcode('qr-reader-v2', { verbose: false })
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        async (token) => {
          await stop()
          setInfo('')
          try {
            const r = await fetch('/api/qr/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
            const d = await r.json()
            if (d.valid) { navigator.vibrate?.(120); setResult({ ok: true, ...d }) }
            else { navigator.vibrate?.([60, 40, 60]); setResult({ ok: false, error: d.error || 'QR inválido' }) }
          } catch { setResult({ ok: false, error: 'Falha de conexão ao validar. Tente novamente.' }) }
        },
        () => {}
      )
      setInfo('Aponte para o QR do paciente')
    } catch {
      setScanning(false); setInfo('')
      setResult({ ok: false, error: 'Não foi possível acessar a câmera. Verifique a permissão do navegador.' })
    }
  }

  return (
    <div className="scan-root min-h-[100dvh] flex flex-col text-white overflow-hidden">
      <style>{`
        .scan-root { background: radial-gradient(120% 90% at 50% 0%, #123722 0%, #0B2417 45%, #06120B 100%); }
        @keyframes scanline { 0% { top: 4%; } 50% { top: 92%; } 100% { top: 4%; } }
        @keyframes framepulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        @keyframes popin { 0% { transform: translateY(16px) scale(.98); opacity: 0; } 100% { transform: none; opacity: 1; } }
        .sheet-in { animation: popin .28s cubic-bezier(.2,.8,.2,1) both; }
        .laser { animation: scanline 2.6s ease-in-out infinite; }
        .brackets span { animation: framepulse 2s ease-in-out infinite; }
        #qr-reader-v2 video { object-fit: cover !important; border-radius: 1.5rem; }
        #qr-reader-v2 img { display: none; }
        @media (prefers-reduced-motion: reduce) { .laser, .brackets span, .sheet-in { animation: none !important; } }
      `}</style>

      {/* Cabeçalho */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-300" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
          <span className="font-display text-xl font-extrabold tracking-tight">Leitor de QR</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${scanning ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />Leitor
        </span>
      </header>

      {/* Palco da câmera */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="relative w-full max-w-xs aspect-square">
          {/* vídeo */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden bg-black/40 ring-1 ring-white/10">
            <div id="qr-reader-v2" className="w-full h-full" />
          </div>

          {/* overlay ocioso */}
          {!scanning && !result && (
            <button onClick={start} className="absolute inset-0 rounded-3xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-3 bg-black/20 active:scale-[.98] transition">
              <span className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
              </span>
              <span className="font-bold text-sm">Tocar para escanear</span>
            </button>
          )}

          {/* moldura de mira + laser (só enquanto escaneia) */}
          {scanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="brackets absolute inset-4">
                <span className="absolute top-0 left-0 w-9 h-9 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                <span className="absolute top-0 right-0 w-9 h-9 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                <span className="absolute bottom-0 left-0 w-9 h-9 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                <span className="absolute bottom-0 right-0 w-9 h-9 border-b-4 border-r-4 border-primary rounded-br-2xl" />
              </div>
              <div className="laser absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_12px_2px_rgba(52,211,153,.7)]" />
            </div>
          )}
        </div>

        {info && <p className="text-emerald-300/90 text-sm font-medium animate-pulse text-center">{info}</p>}
        {!scanning && !result && <p className="text-white/50 text-xs text-center max-w-[15rem]">Enquadre o QR do paciente dentro da área. A confirmação é automática.</p>}

        {scanning && (
          <button onClick={stop} className="px-5 py-2.5 bg-white/10 backdrop-blur rounded-xl font-bold text-sm active:scale-95 transition">
            Cancelar
          </button>
        )}
      </div>

      {/* Resultado */}
      {result && (
        <div className="p-5">
          <div className={`sheet-in rounded-3xl p-6 text-center ${result.ok ? 'bg-emerald-500/15 ring-2 ring-emerald-400' : 'bg-rose-500/15 ring-2 ring-rose-400'}`}>
            <span
              className="material-symbols-outlined text-6xl"
              style={{ fontVariationSettings: "'FILL' 1", color: result.ok ? '#34d399' : '#fb7185' }}
            >{result.ok ? 'check_circle' : 'cancel'}</span>

            {result.ok ? (
              <>
                {result.empresa && (
                  <div className="flex items-center justify-center mb-2">
                    {result.empresa.logo
                      ? <img src={result.empresa.logo} alt={result.empresa.nome} className="h-9 max-w-[180px] object-contain" />
                      : <span className="font-display text-lg font-extrabold tracking-tight">{result.empresa.nome}</span>}
                  </div>
                )}
                <h2 className="font-display text-2xl font-extrabold mt-1">Exame confirmado</h2>
                <div className="mt-4 bg-black/20 rounded-2xl divide-y divide-white/10 text-left">
                  <div className="flex justify-between px-4 py-3"><span className="text-white/50 text-xs uppercase tracking-widest font-bold">Paciente</span><span className="font-semibold text-sm text-right">{result.paciente}</span></div>
                  <div className="flex justify-between px-4 py-3"><span className="text-white/50 text-xs uppercase tracking-widest font-bold">Exame</span><span className="font-semibold text-sm text-right">{result.exame}</span></div>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold mt-1">Não validado</h2>
                <p className="text-white/70 text-sm mt-2">{result.error}</p>
              </>
            )}

            <button onClick={() => { setResult(null); start() }} className="mt-5 w-full bg-primary text-on-primary font-bold py-3.5 rounded-2xl active:scale-[.98] transition flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xl">qr_code_scanner</span>Escanear outro
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
