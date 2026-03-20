import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function PixView({ data, onConfirm, loading }) {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(data.pixCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="space-y-5">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <div className="text-4xl mb-2">⚡</div>
        <p className="text-green-800 font-semibold text-lg">{fmt(data.amount)}</p>
        <p className="text-green-600 text-sm">Pix — Pagamento instantâneo</p>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2 font-medium">Chave Pix:</p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 font-mono text-sm text-gray-800">
          {data.pixKey}
        </div>
        <p className="text-xs text-gray-400 mt-1">Favorecido: {data.beneficiary}</p>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2 font-medium">Código Pix (Copia e Cola):</p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-mono text-xs text-gray-700 break-all leading-relaxed max-h-28 overflow-y-auto">
          {data.pixCode}
        </div>
        <button
          onClick={copyCode}
          className={`mt-2 w-full py-2.5 rounded-xl text-sm font-medium transition ${copied ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
        >
          {copied ? '✓ Código copiado!' : '📋 Copiar código'}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">{data.instructions}</p>

      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
      >
        {loading ? 'Confirmando...' : '✅ Confirmar Pagamento Pix'}
      </button>
    </div>
  )
}

function CardMachine({ amount, onConfirm }) {
  const [step, setStep] = useState('idle') // idle | processing | approved

  function handleInsertCard() {
    setStep('processing')
    setTimeout(() => setStep('approved'), 2500)
  }

  return (
    <div className="space-y-5">
      {/* Card machine illustration */}
      <div className="flex justify-center">
        <div className="bg-gray-800 rounded-2xl p-5 w-52 text-center shadow-xl">
          <div className="bg-gray-700 rounded-xl p-3 mb-4">
            <div className="text-gray-300 text-xs mb-1">VALOR A PAGAR</div>
            <div className="text-white font-bold text-2xl">{fmt(amount)}</div>
          </div>

          {/* Display */}
          <div className="bg-green-900 rounded-lg px-3 py-2 mb-4 min-h-10 flex items-center justify-center">
            {step === 'idle' && (
              <span className="text-green-300 text-xs">INSIRA OU APROXIME O CARTÃO</span>
            )}
            {step === 'processing' && (
              <span className="text-yellow-300 text-xs animate-pulse">PROCESSANDO...</span>
            )}
            {step === 'approved' && (
              <span className="text-green-300 text-sm font-bold">APROVADO ✓</span>
            )}
          </div>

          {/* Card slot */}
          <div className="bg-gray-600 h-2 rounded-full mx-4 mb-3" />

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {['1','2','3','4','5','6','7','8','9','*','0','#'].map(k => (
              <div key={k} className="bg-gray-600 rounded text-gray-400 text-xs py-1 text-center">{k}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-red-700 rounded text-white text-xs py-1 text-center">C</div>
            <div className="flex-1 bg-yellow-600 rounded text-white text-xs py-1 text-center">⌫</div>
            <div className="flex-1 bg-green-700 rounded text-white text-xs py-1 text-center">OK</div>
          </div>
        </div>
      </div>

      {step === 'idle' && (
        <button
          onClick={handleInsertCard}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
        >
          💳 Inserir / Aproximar Cartão
        </button>
      )}

      {step === 'processing' && (
        <div className="text-center py-2">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-gray-600 text-sm">Aguardando autorização...</p>
        </div>
      )}

      {step === 'approved' && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-center">
            <div className="text-3xl mb-1">✅</div>
            <p className="text-green-700 font-bold">Pagamento Aprovado!</p>
            <p className="text-green-600 text-sm">{fmt(amount)} debitado com sucesso</p>
          </div>
          <button
            onClick={onConfirm}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition"
          >
            Concluir e liberar emissão
          </button>
        </div>
      )}
    </div>
  )
}

export default function Payment() {
  const navigate = useNavigate()
  const [budget, setBudget] = useState(null)
  const [method, setMethod] = useState(null)
  const [paymentData, setPaymentData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getBudget().then(b => {
      setBudget(b)
      if (!b.blocked) navigate('/')
    }).catch(() => navigate('/'))
  }, [])

  async function handleSelectMethod(m) {
    setMethod(m)
    setError('')
    setLoading(true)
    try {
      const data = await api.initiatePayment(m)
      setPaymentData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setConfirming(true)
    try {
      await api.confirmPayment(method)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  if (!budget) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-700 text-white px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-blue-200 hover:text-white">←</button>
          <span className="font-bold">Pagamento de Saldo</span>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm mb-1">Saldo devedor total</p>
            <p className="text-3xl font-bold text-gray-800">{fmt(budget.amountDue)}</p>
            {budget.amountDue > budget.limit && (
              <p className="text-xs text-gray-400 mt-1">
                (Limite {fmt(budget.limit)} + excedente {fmt(budget.amountDue - budget.limit)})
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Method selector */}
          {!method && (
            <div>
              <p className="text-sm text-gray-600 text-center mb-4 font-medium">Selecione a forma de pagamento:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSelectMethod('pix')}
                  className="flex flex-col items-center gap-2 border-2 border-gray-200 hover:border-green-400 rounded-2xl p-5 transition"
                >
                  <span className="text-4xl">⚡</span>
                  <span className="font-bold text-gray-700">Pix</span>
                  <span className="text-xs text-gray-400">Instantâneo</span>
                </button>
                <button
                  onClick={() => handleSelectMethod('card')}
                  className="flex flex-col items-center gap-2 border-2 border-gray-200 hover:border-blue-400 rounded-2xl p-5 transition"
                >
                  <span className="text-4xl">💳</span>
                  <span className="font-bold text-gray-700">Cartão</span>
                  <span className="text-xs text-gray-400">Débito / Crédito</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {method && loading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-500 text-sm">Gerando dados de pagamento...</p>
            </div>
          )}

          {/* Pix */}
          {method === 'pix' && paymentData && !loading && (
            <PixView data={paymentData} onConfirm={handleConfirm} loading={confirming} />
          )}

          {/* Cartão */}
          {method === 'card' && paymentData && !loading && (
            <CardMachine amount={budget.amountDue} onConfirm={handleConfirm} />
          )}

          {/* Trocar método */}
          {method && !loading && (
            <button
              onClick={() => { setMethod(null); setPaymentData(null) }}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Trocar forma de pagamento
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
