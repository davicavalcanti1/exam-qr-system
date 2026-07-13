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
      scannerRef.current = null
    }
    setScanning(false)
  }
  useEffect(() => () => { stop() }, [])

  async function start() {
    if (scanning) return
    setResult(null); setInfo('Iniciando câmera…'); setScanning(true)
    try {
      const scanner = new Html5Qrcode('qr-reader-v2')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (token) => {
          await stop()
          setInfo('')
          try {
            const r = await fetch('/api/qr/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
            const d = await r.json()
            if (d.valid) { navigator.vibrate?.(120); setResult({ ok: true, ...d }) }
            else setResult({ ok: false, error: d.error || 'QR inválido' })
          } catch { setResult({ ok: false, error: 'Falha ao validar' }) }
        },
        () => {}
      )
      setInfo('Aponte para o QR do paciente')
    } catch (e) {
      setScanning(false); setInfo('')
      setResult({ ok: false, error: 'Não foi possível acessar a câmera. Verifique a permissão no navegador.' })
    }
  }

  return (
    <div className="min-h-screen bg-[#0E2A1A] text-white flex flex-col items-center p-6 gap-6">
      <div className="flex items-center gap-2 mt-4">
        <img src="/brotopay.png" alt="ExameQR" className="w-9 h-9 object-contain" />
        <span className="font-display text-2xl font-extrabold tracking-tight text-white">ExameQR</span>
        <span className="ml-1 text-[10px] font-bold uppercase bg-white/10 px-2 py-0.5 rounded-full">Leitor</span>
      </div>

      <div className="w-full max-w-md">
        {!scanning && (
          <div className="aspect-square rounded-3xl border-2 border-white/15 flex flex-col items-center justify-center gap-4 bg-black/30">
            <button onClick={start} className="flex flex-col items-center gap-3 bg-primary text-white px-8 py-5 rounded-2xl font-bold active:scale-95 transition">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
              Iniciar câmera
            </button>
          </div>
        )}
        {scanning && (
          <div className="relative rounded-3xl overflow-hidden border-2 border-white/15">
            <div id="qr-reader-v2" style={{ width: '100%', minHeight: 340 }} />
            <button onClick={stop} className="absolute bottom-3 right-3 bg-white/15 backdrop-blur px-4 py-2 rounded-xl font-bold text-sm">Parar</button>
          </div>
        )}
        {info && <p className="text-center text-emerald-300 text-sm mt-3 animate-pulse">{info}</p>}
      </div>

      {result && (
        <div className={`w-full max-w-md rounded-2xl p-6 text-center ${result.ok ? 'bg-emerald-900/60 border-2 border-emerald-500' : 'bg-rose-900/50 border-2 border-rose-500'}`}>
          <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>{result.ok ? 'check_circle' : 'error'}</span>
          {result.ok ? (
            <>
              <h2 className="text-xl font-black mt-2">Exame confirmado! ✓</h2>
              <p className="text-emerald-200 mt-2">{result.paciente}</p>
              <p className="text-emerald-300/70 text-sm">{result.exame}</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold mt-2">Não validado</h2>
              <p className="text-rose-200 text-sm mt-1">{result.error}</p>
            </>
          )}
          <button onClick={() => { setResult(null); start() }} className="mt-5 bg-white/15 px-5 py-2.5 rounded-xl font-bold text-sm">Ler outro</button>
        </div>
      )}
    </div>
  )
}
