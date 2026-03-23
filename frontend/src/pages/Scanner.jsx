import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api } from '../api'

const USE_TYPES = [
  { key: 'transport', icon: '🚌', label: 'Transporte' },
  { key: 'snack', icon: '🍱', label: 'Lanche' },
  { key: 'exam', icon: '🏥', label: 'Exame' },
]

export default function Scanner() {
  const [selectedType, setSelectedType] = useState('exam')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null) // { success, patient, protocol, error }
  const qrRef = useRef(null)
  const scannerRef = useRef(null)

  async function startScan() {
    if (scanning) return
    setResult(null)
    setScanning(true)
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop()
          setScanning(false)
          try {
            const data = await api.validateQr(decodedText, selectedType)
            setResult({ success: true, patient: data.patient, protocol: data.protocol })
          } catch (err) {
            setResult({ success: false, error: err.message || 'QR Code inválido ou expirado' })
          }
        },
        () => {}
      )
    } catch {
      setScanning(false)
      setResult({ success: false, error: 'Não foi possível acessar a câmera.' })
    }
  }

  async function stopScan() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => () => { stopScan() }, [])

  return (
    <div style={{ backgroundColor: '#111827' }} className="text-slate-100 min-h-screen flex flex-col font-inter">
      {/* Header */}
      <header className="p-6 md:p-10 flex justify-center">
        <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-indigo-500 uppercase">
          ExameQR — Leitor
        </h1>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 flex flex-col gap-8 pb-12">
        {/* Category Pill Selection */}
        <section className="flex flex-wrap justify-center gap-3">
          {USE_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setSelectedType(t.key)}
              className={`px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-all duration-200 ${
                selectedType === t.key
                  ? 'bg-indigo-600 border border-indigo-400 text-white font-bold ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="text-xl">{t.icon}</span> {t.label}
            </button>
          ))}
        </section>

        {/* Scanner Area */}
        <section className="relative flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-full max-w-sm aspect-square bg-slate-900/50 rounded-3xl border-2 border-slate-800 overflow-hidden flex items-center justify-center group">
            {/* Scanner animation */}
            {scanning && (
              <div className="absolute inset-0 scanner-viewport opacity-40">
                <div className="scanner-line" />
              </div>
            )}

            {/* Corner Brackets */}
            <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
            <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
            <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />

            {/* QR reader div */}
            <div id="qr-reader" className={`absolute inset-0 ${scanning ? 'opacity-100' : 'opacity-0'}`} />

            {/* Action button */}
            {!scanning && (
              <button
                onClick={startScan}
                className="relative z-10 flex flex-col items-center gap-4 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-2xl font-bold transition-all transform active:scale-95 shadow-2xl shadow-indigo-600/20"
              >
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                <span>Iniciar Câmera</span>
              </button>
            )}
            {scanning && (
              <button
                onClick={stopScan}
                className="relative z-10 flex flex-col items-center gap-4 bg-slate-700 hover:bg-slate-600 text-white px-8 py-5 rounded-2xl font-bold transition-all"
              >
                <span className="material-symbols-outlined text-4xl">stop</span>
                <span>Parar</span>
              </button>
            )}

            <p className="absolute bottom-10 text-slate-500 font-medium text-sm tracking-wide">
              Aponte para o QR Code do paciente
            </p>
          </div>
        </section>

        {/* Result States */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Success Card */}
          {result?.success && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 p-5 rounded-2xl flex items-start gap-4 col-span-full">
              <div className="bg-emerald-500/20 p-3 rounded-xl">
                <span className="material-symbols-outlined text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <div>
                <h3 className="font-bold text-emerald-100">Autorização Confirmada</h3>
                <p className="text-emerald-300/70 text-sm mt-1">
                  Paciente: {result.patient}<br />
                  Protocolo: #{result.protocol}
                </p>
                <div className="mt-3 inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">VÁLIDO HOJE</div>
              </div>
            </div>
          )}

          {/* Error Card */}
          {result && !result.success && (
            <div className="bg-rose-950/30 border border-rose-500/30 p-5 rounded-2xl flex items-start gap-4 col-span-full">
              <div className="bg-rose-500/20 p-3 rounded-xl">
                <span className="material-symbols-outlined text-rose-400" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              </div>
              <div>
                <h3 className="font-bold text-rose-100">Erro na Validação</h3>
                <p className="text-rose-300/70 text-sm mt-1">{result.error}</p>
                <button
                  className="mt-3 text-xs font-bold text-rose-400 hover:underline"
                  onClick={() => setResult(null)}
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {/* Default state cards */}
          {!result && (
            <>
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-5 rounded-2xl flex items-start gap-4">
                <div className="bg-emerald-500/20 p-3 rounded-xl">
                  <span className="material-symbols-outlined text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div>
                  <h3 className="font-bold text-emerald-100">Autorização Confirmada</h3>
                  <p className="text-emerald-300/70 text-sm mt-1">Paciente: Ricardo Oliveira<br />Protocolo: #4920-A</p>
                  <div className="mt-3 inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">VÁLIDO HOJE</div>
                </div>
              </div>
              <div className="bg-rose-950/30 border border-rose-500/30 p-5 rounded-2xl flex items-start gap-4">
                <div className="bg-rose-500/20 p-3 rounded-xl">
                  <span className="material-symbols-outlined text-rose-400" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                </div>
                <div>
                  <h3 className="font-bold text-rose-100">Cota Esgotada</h3>
                  <p className="text-rose-300/70 text-sm mt-1">Este voucher já foi utilizado ou expirou o prazo de 24h.</p>
                  <button className="mt-3 text-xs font-bold text-rose-400 hover:underline">Ver Detalhes</button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-8 border-t border-slate-800 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 text-slate-500 text-sm font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Terminal Ativo
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">history</span>
              Últimos 12 registros
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-30">
            <span className="text-[10px] tracking-[0.2em] font-black">SECURE SCAN TECHNOLOGY</span>
          </div>
        </footer>
      </main>

      {/* FAB */}
      <div className="fixed bottom-8 right-8">
        <button className="w-14 h-14 rounded-full bg-slate-800 text-white shadow-xl flex items-center justify-center hover:bg-slate-700 border border-slate-700 transition-all">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
      </div>
    </div>
  )
}
