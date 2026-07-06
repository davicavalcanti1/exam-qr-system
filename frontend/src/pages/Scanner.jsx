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
  const [result, setResult] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')
  const scannerRef = useRef(null)

  async function checkCameraPermission() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(d => d.kind === 'videoinput')
      console.log('Câmeras encontradas:', cameras.length)

      if (cameras.length === 0) {
        throw new Error('Nenhuma câmera encontrada no dispositivo')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (err) {
      console.error('Permission error:', err)
      throw err
    }
  }

  async function startScan() {
    if (scanning) return
    setResult(null)
    setDebugInfo('Verificando câmera...')
    setScanning(true)

    try {
      await checkCameraPermission()
      setDebugInfo('Câmera acessível. Iniciando scanner...')

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
        } catch {}
      }

      await new Promise(resolve => setTimeout(resolve, 100))

      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          console.log('QR detectado:', decodedText)
          setDebugInfo('QR detectado! Processando...')

          try {
            if (scannerRef.current) {
              await scannerRef.current.stop()
            }
            setScanning(false)
            const data = await api.validateQr(decodedText, selectedType)
            playSuccessConfirmation()
            setResult({ success: true, patient: data.patient, protocol: data.protocol })
          } catch (err) {
            setResult({ success: false, error: err.message || 'QR Code inválido ou expirado' })
          }
        },
        () => {} // Ignore scanning errors
      )

      setDebugInfo('Scanner ativo - aponte para o QR Code')
    } catch (error) {
      console.error('Erro ao iniciar scanner:', error)
      setScanning(false)
      setDebugInfo('')

      let errorMsg = 'Não foi possível acessar a câmera.'

      if (error.name === 'NotAllowedError') {
        errorMsg = 'Permissão de câmera negada. Verifique as configurações do navegador.'
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'Nenhuma câmera encontrada. Verifique se seu dispositivo tem câmera.'
      } else if (error.name === 'NotReadableError') {
        errorMsg = 'Câmera em uso por outro app. Feche outros apps e tente novamente.'
      } else if (error.message) {
        errorMsg = error.message
      }

      setResult({ success: false, error: errorMsg })
    }
  }

  async function stopScan() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
      scannerRef.current = null
    }
    setScanning(false)
    setDebugInfo('')
  }

  function playSuccessConfirmation() {
    // Vibração (haptic feedback)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }

    // Som de sucesso (beep)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (err) {
      console.log('Audio context not available')
    }
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
        <section className="relative flex-1 flex flex-col items-center justify-center min-h-[500px]">
          {!scanning && (
            <div className="relative w-full max-w-md bg-black rounded-3xl border-2 border-slate-800 overflow-hidden flex items-center justify-center aspect-video">
              {/* Corner Brackets */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
              <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />

              <button
                onClick={startScan}
                className="relative z-10 flex flex-col items-center gap-4 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-2xl font-bold transition-all transform active:scale-95 shadow-2xl shadow-indigo-600/20"
              >
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                <span>Iniciar Câmera</span>
              </button>

              <p className="absolute bottom-10 text-slate-500 font-medium text-sm tracking-wide">
                Aponte para o QR Code do paciente
              </p>
            </div>
          )}

          {scanning && (
            <div className="relative w-full max-w-md rounded-3xl border-2 border-slate-800 overflow-hidden">
              <div id="qr-reader" style={{ width: '100%', minHeight: '400px' }} />

              <button
                onClick={stopScan}
                className="absolute bottom-4 right-4 z-20 flex flex-col items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-2xl font-bold transition-all"
              >
                <span className="material-symbols-outlined text-2xl">stop</span>
                <span className="text-xs">Parar</span>
              </button>

              {debugInfo && (
                <p className="absolute top-4 left-4 right-4 z-20 text-indigo-300 font-medium text-sm tracking-wide animate-pulse bg-black/50 px-3 py-2 rounded">
                  {debugInfo}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Success Confirmation Modal */}
        {result?.success && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
            `}</style>
            <div className="bg-gradient-to-b from-emerald-900 to-emerald-950 border-2 border-emerald-500 rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-emerald-500/50" style={{ animation: 'scaleIn 0.4s ease-out' }}>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative bg-emerald-500/20 p-6 rounded-full border-2 border-emerald-500">
                    <span className="material-symbols-outlined text-6xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-emerald-100 mb-2">
                  Autorização Confirmada! ✓
                </h2>

                <p className="text-emerald-300/70 text-sm mb-6">
                  QR Code validado com sucesso
                </p>

                <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-2xl p-4 w-full mb-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-emerald-400/70 text-xs uppercase tracking-wider mb-1">Paciente</p>
                      <p className="text-white font-bold text-lg">{result.patient}</p>
                    </div>
                    <div>
                      <p className="text-emerald-400/70 text-xs uppercase tracking-wider mb-1">Protocolo</p>
                      <p className="text-emerald-300 font-mono font-bold">#{result.protocol}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-full mb-6 w-full">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  VÁLIDO HOJE — Exame Autorizado
                </div>

                <button
                  onClick={() => setResult(null)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl transition-all active:scale-95"
                >
                  Continuar Lendo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result States */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Success Card (kept for larger screens) */}
          {result?.success && (
            <div className="hidden md:flex bg-emerald-950/30 border border-emerald-500/30 p-5 rounded-2xl flex-col gap-4 col-span-full">
              <div className="flex items-start gap-4">
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

          {/* Idle state — instructions */}
          {!result && (
            <div className="col-span-full bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl flex items-start gap-4">
              <div className="bg-indigo-500/20 p-3 rounded-xl flex-shrink-0">
                <span className="material-symbols-outlined text-indigo-400" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-200">Aguardando leitura</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Selecione o tipo de uso acima, clique em <span className="text-indigo-400 font-semibold">Iniciar Câmera</span> e aponte para o QR Code do paciente.
                </p>
                <div className="mt-3 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span> QR Codes são válidos por 72h</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span> Dados criptografados</span>
                </div>
              </div>
            </div>
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
        <button
          onClick={() => alert('Suporte ExameQR\n\nDúvidas com o scanner?\n• Certifique-se que a câmera está ativada no navegador\n• O QR Code deve estar bem iluminado\n• Mantenha o dispositivo estável\n\nContato: suporte@exameqr.com.br')}
          className="w-14 h-14 rounded-full bg-slate-800 text-white shadow-xl flex items-center justify-center hover:bg-slate-700 border border-slate-700 transition-all"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>
      </div>
    </div>
  )
}
