import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api } from '../api'

const USE_TYPES = [
  { value: 'transport', label: 'Transporte', icon: 'directions_bus' },
  { value: 'snack', label: 'Lanche', icon: 'restaurant' },
  { value: 'exam', label: 'Exame', icon: 'biotech' },
]

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtCpf = (c) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
const USE_LABELS = { transport: 'Transporte', snack: 'Lanche', exam: 'Exame' }
const USE_ICONS = { transport: 'directions_bus', snack: 'restaurant', exam: 'biotech' }

export default function Scanner() {
  const [useType, setUseType] = useState('transport')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const html5QrcodeRef = useRef(null)

  async function startScanner() {
    setResult(null)
    setError('')
    setScanning(true)

    const html5Qrcode = new Html5Qrcode('qr-reader')
    html5QrcodeRef.current = html5Qrcode

    try {
      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          if (validating) return

          if (!decodedText.startsWith('EXAMSYS_V1:')) {
            await stopScanner()
            setError('QR Code inválido — este código não pertence ao sistema Carnexa.')
            return
          }

          await stopScanner()
          setValidating(true)

          try {
            const data = await api.validateQR(decodedText, useType)
            setResult(data)
          } catch (err) {
            setError(err.message)
          } finally {
            setValidating(false)
          }
        },
        () => {}
      )
    } catch (err) {
      setScanning(false)
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
    }
  }

  async function stopScanner() {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop()
        html5QrcodeRef.current.clear()
      } catch {}
      html5QrcodeRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  function reset() {
    setResult(null)
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f172a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 glass-gradient rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '18px' }}>qr_code_scanner</span>
          </div>
          <div>
            <span className="font-bold text-white text-sm">Carnexa Scanner</span>
            <p className="text-slate-400 text-xs">Leitor de QR Code</p>
          </div>
        </div>
        <a href="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          Painel
        </a>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-md mx-auto w-full">

        {/* Use type selector */}
        <div className="w-full mb-6">
          <p className="text-xs text-slate-400 mb-3 text-center font-medium uppercase tracking-widest">Tipo de Utilização</p>
          <div className="grid grid-cols-3 gap-2">
            {USE_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setUseType(t.value)}
                disabled={scanning}
                className={`flex flex-col items-center gap-2 py-3.5 rounded-2xl text-sm font-medium transition border ${
                  useType === t.value
                    ? 'glass-gradient text-white border-transparent shadow-lg'
                    : 'text-slate-300 hover:text-white border-slate-700 hover:border-slate-500'
                }`}
                style={useType !== t.value ? { background: '#1e293b' } : {}}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{t.icon}</span>
                <span className="text-xs">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scanner area */}
        {!result && !error && (
          <div className="w-full">
            {/* Camera container */}
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <div id="qr-reader" className="w-full h-full" />

              {/* Corner brackets overlay */}
              {scanning && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
                    <div className="relative w-56 h-56">
                      {/* Corners */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#4f46e5] rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#4f46e5] rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#4f46e5] rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#4f46e5] rounded-br-lg" />
                      {/* Scan line */}
                      <div className="scanner-line" />
                    </div>
                  </div>
                </>
              )}

              {/* Placeholder when not scanning */}
              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#334155' }}>
                    <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '40px' }}>qr_code_scanner</span>
                  </div>
                  <p className="text-slate-400 text-sm text-center px-4">
                    Pressione o botão para<br />abrir a câmera
                  </p>
                </div>
              )}
            </div>

            {!scanning && (
              <button
                onClick={startScanner}
                disabled={validating}
                className="w-full mt-4 glass-gradient text-white font-bold py-4 rounded-2xl text-base transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {validating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>photo_camera</span>
                    Iniciar Câmera
                  </>
                )}
              </button>
            )}

            {scanning && (
              <div className="mt-4 text-center">
                <p className="text-sm text-blue-300 animate-pulse mb-3">
                  Aponte para o QR Code do paciente...
                </p>
                <button
                  onClick={stopScanner}
                  className="text-slate-400 hover:text-white text-sm underline transition"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error result */}
        {error && !result && (
          <div className="w-full">
            <div className="rounded-3xl p-6 text-center" style={{ background: '#1e293b', border: '1px solid #ef44441a' }}>
              <div className="w-16 h-16 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-error" style={{ fontSize: '32px' }}>cancel</span>
              </div>
              <h2 className="text-xl font-bold text-red-300 mb-2">QR Code Inválido</h2>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
            <button
              onClick={reset}
              className="w-full mt-4 py-3.5 rounded-2xl font-medium transition text-white flex items-center justify-center gap-2"
              style={{ background: '#1e293b', border: '1px solid #334155' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
              Tentar novamente
            </button>
          </div>
        )}

        {/* Success result */}
        {result && (
          <div className="w-full space-y-4">
            {result.valid ? (
              <div className="rounded-3xl p-5" style={{ background: '#1e293b', border: '1px solid #16a34a33' }}>
                <div className="text-center mb-5">
                  <div className="w-16 h-16 bg-green-900/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-green-400" style={{ fontSize: '32px' }}>check_circle</span>
                  </div>
                  <h2 className="text-xl font-bold text-green-300">QR Code Válido</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Utilização registrada: <strong className="text-white">{result.useLabel}</strong>
                  </p>
                </div>

                <div className="rounded-2xl p-4 space-y-2.5 text-sm" style={{ background: '#0f172a' }}>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Paciente</span>
                    <span className="font-semibold text-white">{result.patient.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CPF</span>
                    <span className="font-mono text-white">{fmtCpf(result.patient.cpf)}</span>
                  </div>
                  <div className="border-t border-slate-700 my-1" />
                  {result.exams.map((exam, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-slate-400">{exam.exam_name}</span>
                      <span className="text-white">{fmt(exam.value)}</span>
                    </div>
                  ))}
                </div>

                {/* Usage status */}
                <div className="mt-5">
                  <p className="text-xs text-slate-500 mb-3 text-center uppercase tracking-wide">
                    Utilizações ({result.usesCount}/{result.maxUses})
                  </p>
                  <div className="flex justify-center gap-6">
                    {['transport', 'snack', 'exam'].map(type => {
                      const used = result.usageLog.find(u => u.use_type === type)
                      return (
                        <div key={type} className="flex flex-col items-center gap-1.5">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                            used ? 'bg-green-900/60' : 'bg-slate-700'
                          }`}>
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '20px', color: used ? '#4ade80' : '#64748b' }}
                            >
                              {USE_ICONS[type]}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">{USE_LABELS[type]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {result.isExhausted && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-yellow-400 text-sm font-medium">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
                    QR Code esgotado após esta utilização
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl p-6 text-center" style={{ background: '#1e293b', border: '1px solid #ef44441a' }}>
                <div className="w-16 h-16 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-error" style={{ fontSize: '32px' }}>cancel</span>
                </div>
                <h2 className="text-xl font-bold text-red-300 mb-2">Inválido</h2>
                <p className="text-slate-400 text-sm">{result.error}</p>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full py-3.5 rounded-2xl font-medium transition text-white flex items-center justify-center gap-2"
              style={{ background: '#1e293b', border: '1px solid #334155' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>qr_code_scanner</span>
              Escanear outro QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
