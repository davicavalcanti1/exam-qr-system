import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api } from '../api'

const USE_TYPES = [
  { value: 'transport', label: 'Transporte', icon: '🚌' },
  { value: 'snack', label: 'Lanche', icon: '🍱' },
  { value: 'exam', label: 'Exame', icon: '🏥' }
]

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtCpf = (c) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
const USE_LABELS = { transport: 'Transporte', snack: 'Lanche', exam: 'Exame' }

export default function Scanner() {
  const [useType, setUseType] = useState('transport')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const scannerRef = useRef(null)
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
        { fps: 10, qrbox: { width: 280, height: 280 } },
        async (decodedText) => {
          // Only process if not already validating
          if (validating) return

          // Immediately check prefix before sending to backend
          if (!decodedText.startsWith('EXAMSYS_V1:')) {
            await stopScanner()
            setError('QR Code inválido — este código não pertence ao sistema ExameQR.')
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
        () => {} // ignore frame errors
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between shadow">
        <span className="font-bold text-blue-400 text-lg">ExameQR — Leitor</span>
        <a href="/" className="text-sm text-gray-400 hover:text-white">Painel Admin</a>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-md mx-auto w-full">

        {/* Use type selector */}
        <div className="w-full mb-5">
          <p className="text-sm text-gray-400 mb-2 text-center">Tipo de utilização</p>
          <div className="grid grid-cols-3 gap-2">
            {USE_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setUseType(t.value)}
                disabled={scanning}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-sm font-medium transition ${
                  useType === t.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scanner area */}
        {!result && !error && (
          <div className="w-full">
            <div
              id="qr-reader"
              className={`w-full rounded-2xl overflow-hidden bg-black ${scanning ? 'min-h-64' : ''}`}
            />
            {!scanning && (
              <div className="text-center mt-4">
                <p className="text-gray-400 text-sm mb-4">
                  Selecione o tipo de uso e pressione o botão para abrir a câmera
                </p>
                <button
                  onClick={startScanner}
                  disabled={validating}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-2xl text-base transition disabled:opacity-50"
                >
                  {validating ? 'Validando...' : '📷 Iniciar Câmera'}
                </button>
              </div>
            )}
            {scanning && (
              <div className="text-center mt-4">
                <p className="text-blue-300 text-sm animate-pulse mb-3">
                  Aponte para o QR Code do paciente...
                </p>
                <button
                  onClick={stopScanner}
                  className="text-gray-400 hover:text-white text-sm underline"
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
            <div className="bg-red-900 border border-red-700 rounded-2xl p-6 text-center">
              <div className="text-5xl mb-3">❌</div>
              <h2 className="text-xl font-bold text-red-300 mb-2">Inválido</h2>
              <p className="text-red-200 text-sm">{error}</p>
            </div>
            <button
              onClick={reset}
              className="w-full mt-4 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-medium transition"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Success result */}
        {result && (
          <div className="w-full space-y-4">
            {result.valid ? (
              <div className="bg-green-900 border border-green-700 rounded-2xl p-5">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">✅</div>
                  <h2 className="text-xl font-bold text-green-300">QR Code Válido</h2>
                  <p className="text-green-200 text-sm mt-1">
                    Utilização registrada: <strong>{result.useLabel}</strong>
                  </p>
                </div>

                <div className="bg-green-950 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Paciente</span>
                    <span className="font-medium">{result.patient.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">CPF</span>
                    <span className="font-mono">{fmtCpf(result.patient.cpf)}</span>
                  </div>
                  <div className="border-t border-green-800 my-2" />
                  {result.exams.map((exam, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-400">{exam.exam_name}</span>
                      <span>{fmt(exam.value)}</span>
                    </div>
                  ))}
                </div>

                {/* Usage status */}
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2 text-center">
                    Utilizações ({result.usesCount}/{result.maxUses})
                  </p>
                  <div className="flex justify-center gap-4">
                    {['transport', 'snack', 'exam'].map(type => {
                      const used = result.usageLog.find(u => u.use_type === type)
                      return (
                        <div key={type} className="flex flex-col items-center gap-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${used ? 'bg-green-500' : 'bg-gray-700'}`}>
                            {type === 'transport' ? '🚌' : type === 'snack' ? '🍱' : '🏥'}
                          </div>
                          <span className="text-xs text-gray-400">{USE_LABELS[type]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {result.isExhausted && (
                  <p className="text-center text-yellow-400 text-sm mt-3 font-medium">
                    ⚠️ QR Code esgotado após esta utilização
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-red-900 border border-red-700 rounded-2xl p-6 text-center">
                <div className="text-5xl mb-3">❌</div>
                <h2 className="text-xl font-bold text-red-300 mb-2">Inválido</h2>
                <p className="text-red-200 text-sm">{result.error}</p>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-medium transition"
            >
              Escanear outro QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
