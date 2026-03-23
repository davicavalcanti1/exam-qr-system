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
    <div className="space-y-4">
      {/* Amount */}
      <div className="pix-gradient rounded-2xl p-5 text-center">
        <span className="material-symbols-outlined text-white mb-2" style={{ fontSize: '28px' }}>bolt</span>
        <p className="text-white font-bold text-2xl">{fmt(data.amount)}</p>
        <p className="text-white/80 text-sm mt-0.5">Pix — Pagamento instantâneo</p>
      </div>

      {/* Pix key */}
      <div>
        <p className="text-sm font-medium text-on-surface mb-1.5 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>key</span>
          Chave Pix
        </p>
        <div className="bg-surface-container-low border border-surface-container-high rounded-xl px-4 py-3 font-mono text-sm text-on-surface">
          {data.pixKey}
        </div>
        <p className="text-xs text-on-surface-variant mt-1">Favorecido: {data.beneficiary}</p>
      </div>

      {/* Pix code */}
      <div>
        <p className="text-sm font-medium text-on-surface mb-1.5 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>content_copy</span>
          Código Pix (Copia e Cola)
        </p>
        <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-3 font-mono text-xs text-on-surface break-all leading-relaxed max-h-28 overflow-y-auto">
          {data.pixCode}
        </div>
        <button
          onClick={copyCode}
          className={`mt-2 w-full py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
            copied
              ? 'bg-[#e8f5e9] text-green-700 border border-green-200'
              : 'bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {copied ? 'check_circle' : 'content_copy'}
          </span>
          {copied ? 'Código copiado!' : 'Copiar código'}
        </button>
      </div>

      <p className="text-xs text-on-surface-variant text-center">{data.instructions}</p>

      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full bg-[#00875a] hover:bg-[#006644] text-white font-bold py-4 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Confirmando...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
            Confirmar Pagamento Pix
          </>
        )}
      </button>
    </div>
  )
}

function CardMachine({ amount, onConfirm }) {
  const [step, setStep] = useState('idle')

  function handleInsertCard() {
    setStep('processing')
    setTimeout(() => setStep('approved'), 2500)
  }

  return (
    <div className="space-y-5">
      {/* Card machine illustration */}
      <div className="flex justify-center">
        <div className="card-machine-gradient rounded-3xl p-5 w-52 text-center shadow-xl border border-slate-700">
          <div className="bg-slate-700 rounded-2xl p-4 mb-4">
            <div className="text-slate-400 text-xs mb-1 uppercase tracking-wide">Valor a pagar</div>
            <div className="text-white font-bold text-2xl">{fmt(amount)}</div>
          </div>

          {/* Display */}
          <div className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 mb-4 min-h-10 flex items-center justify-center">
            {step === 'idle' && (
              <span className="text-slate-300 text-xs">INSIRA OU APROXIME O CARTÃO</span>
            )}
            {step === 'processing' && (
              <span className="text-yellow-300 text-xs animate-pulse">PROCESSANDO...</span>
            )}
            {step === 'approved' && (
              <span className="text-green-300 text-sm font-bold">APROVADO ✓</span>
            )}
          </div>

          {/* Card slot */}
          <div className="bg-slate-600 h-2 rounded-full mx-6 mb-4" />

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {['1','2','3','4','5','6','7','8','9','*','0','#'].map(k => (
              <div key={k} className="bg-slate-700 rounded-lg text-slate-300 text-xs py-1.5 text-center">{k}</div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1 bg-red-800 rounded-lg text-white text-xs py-1.5 text-center">C</div>
            <div className="flex-1 bg-yellow-700 rounded-lg text-white text-xs py-1.5 text-center">⌫</div>
            <div className="flex-1 bg-green-800 rounded-lg text-white text-xs py-1.5 text-center">OK</div>
          </div>
        </div>
      </div>

      {step === 'idle' && (
        <button
          onClick={handleInsertCard}
          className="w-full glass-gradient text-white font-bold py-4 rounded-2xl transition hover:opacity-90 flex items-center justify-center gap-2 shadow"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>credit_card</span>
          Inserir / Aproximar Cartão
        </button>
      )}

      {step === 'processing' && (
        <div className="text-center py-4">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-on-surface-variant text-sm">Aguardando autorização...</p>
        </div>
      )}

      {step === 'approved' && (
        <div className="space-y-3">
          <div className="bg-[#e8f5e9] border border-green-200 rounded-2xl px-5 py-4 text-center">
            <span className="material-symbols-outlined text-green-600 mb-2" style={{ fontSize: '32px' }}>check_circle</span>
            <p className="text-green-800 font-bold text-base">Pagamento Aprovado!</p>
            <p className="text-green-600 text-sm mt-0.5">{fmt(amount)} debitado com sucesso</p>
          </div>
          <button
            onClick={onConfirm}
            className="w-full bg-[#00875a] hover:bg-[#006644] text-white font-bold py-4 rounded-2xl transition flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>done_all</span>
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
      if (!b.blocked) navigate('/dashboard')
    }).catch(() => navigate('/dashboard'))
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
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  if (!budget) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="glass-gradient px-4 py-0 shadow">
        <div className="max-w-lg mx-auto flex items-center gap-3 h-14">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>credit_card</span>
            <span className="font-bold text-white">Pagamento de Saldo</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-surface rounded-2xl border border-surface-container-high shadow-card p-6">
          {/* Amount due */}
          <div className="text-center mb-6 pb-6 border-b border-surface-container-high">
            <p className="text-on-surface-variant text-sm mb-1">Saldo devedor total</p>
            <p className="text-4xl font-bold text-on-surface">{fmt(budget.amountDue)}</p>
            {budget.amountDue > budget.limit && (
              <p className="text-xs text-on-surface-variant mt-2">
                <span className="bg-surface-container px-2 py-1 rounded-full">
                  Limite {fmt(budget.limit)} + excedente {fmt(budget.amountDue - budget.limit)}
                </span>
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error-container border border-error/20 rounded-xl px-4 py-3 mb-4">
              <span className="material-symbols-outlined text-error" style={{ fontSize: '18px' }}>error</span>
              <p className="text-on-error-container text-sm">{error}</p>
            </div>
          )}

          {/* Method selector */}
          {!method && (
            <div>
              <p className="text-sm text-on-surface-variant text-center mb-4 font-medium">Selecione a forma de pagamento</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSelectMethod('pix')}
                  className="flex flex-col items-center gap-3 border-2 border-outline-variant hover:border-primary rounded-2xl p-5 transition hover:bg-surface-container-low group"
                >
                  <div className="w-12 h-12 pix-gradient rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '24px' }}>bolt</span>
                  </div>
                  <div>
                    <span className="block font-bold text-on-surface">Pix</span>
                    <span className="text-xs text-on-surface-variant">Instantâneo</span>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectMethod('card')}
                  className="flex flex-col items-center gap-3 border-2 border-outline-variant hover:border-primary rounded-2xl p-5 transition hover:bg-surface-container-low group"
                >
                  <div className="w-12 h-12 glass-gradient rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '24px' }}>credit_card</span>
                  </div>
                  <div>
                    <span className="block font-bold text-on-surface">Cartão</span>
                    <span className="text-xs text-on-surface-variant">Débito / Crédito</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {method && loading && (
            <div className="text-center py-10">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-on-surface-variant text-sm">Gerando dados de pagamento...</p>
            </div>
          )}

          {/* Pix */}
          {method === 'pix' && paymentData && !loading && (
            <PixView data={paymentData} onConfirm={handleConfirm} loading={confirming} />
          )}

          {/* Card */}
          {method === 'card' && paymentData && !loading && (
            <CardMachine amount={budget.amountDue} onConfirm={handleConfirm} />
          )}

          {/* Change method */}
          {method && !loading && (
            <button
              onClick={() => { setMethod(null); setPaymentData(null) }}
              className="w-full mt-4 text-sm text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1.5 py-2 transition"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>swap_horiz</span>
              Trocar forma de pagamento
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
