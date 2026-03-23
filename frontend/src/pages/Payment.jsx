import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Payment() {
  const navigate = useNavigate()
  const [method, setMethod] = useState('card') // 'pix' | 'card'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getPartnerDashboard().then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const amount = data?.partner?.committed || 450
  const protocol = data?.partner?.id || '829102'

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center">
      <main className="flex-1 w-full max-w-4xl px-4 py-12 flex flex-col items-center">
        <div className="w-full bg-surface-container-lowest rounded-xl overflow-hidden" style={{ boxShadow: '0 20px 40px -10px rgba(18,28,42,0.06)' }}>
          {/* Summary Header */}
          <div className="p-8 text-center border-b border-outline-variant/15">
            <span className="text-on-surface-variant uppercase tracking-widest font-semibold block mb-2 text-sm">Total do Pagamento</span>
            <h1 className="text-primary font-extrabold text-5xl tracking-tight tabular-nums">{fmt(amount)}</h1>
            <p className="text-on-surface-variant mt-2">Referente a Exames Laboratoriais • Protocolo #{protocol}</p>
          </div>

          {/* Method Selection */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pix Card */}
            <button
              onClick={() => setMethod('pix')}
              className={`relative group p-6 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 text-left ${
                method === 'pix'
                  ? 'border-indigo-600 bg-white shadow-sm'
                  : 'border-transparent bg-surface-container-low hover:border-tertiary-fixed-dim'
              }`}
            >
              <div className="w-12 h-12 rounded-lg pix-gradient flex items-center justify-center text-white">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-on-surface">⚡ Pix</h3>
                <p className="text-sm text-on-surface-variant">Confirmação instantânea</p>
              </div>
              <div className={`ml-auto transition-opacity ${method === 'pix' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <span className="material-symbols-outlined text-tertiary">check_circle</span>
              </div>
            </button>

            {/* Card Payment */}
            <button
              onClick={() => setMethod('card')}
              className={`relative group p-6 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 text-left ${
                method === 'card'
                  ? 'border-indigo-600 bg-white shadow-sm'
                  : 'border-transparent bg-surface-container-low hover:border-tertiary-fixed-dim'
              }`}
            >
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>credit_card</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-on-surface">💳 Cartão</h3>
                <p className="text-sm text-on-surface-variant">Crédito ou Débito</p>
              </div>
              <div className={`ml-auto transition-opacity ${method === 'card' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <span className="material-symbols-outlined text-primary">check_circle</span>
              </div>
            </button>
          </div>

          {/* Payment Content */}
          <div className="px-8 pb-12 flex flex-col md:flex-row gap-12 items-center justify-center">
            {method === 'pix' && (
              <div className="w-full max-w-sm">
                <div className="bg-surface p-6 rounded-xl border border-outline-variant/30 flex flex-col items-center">
                  <div className="w-48 h-48 bg-white p-4 rounded-lg mb-6 border border-outline-variant/20 shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant">qr_code_2</span>
                  </div>
                  <div className="w-full bg-white rounded-lg p-3 border border-outline-variant/30 mb-6 flex items-center gap-3">
                    <span className="text-xs font-mono text-on-surface-variant truncate">00020126580014br.gov.bcb.pix0136e09e-7d6f-402a...</span>
                    <button className="flex items-center gap-1 text-primary font-semibold text-sm shrink-0">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      📋 Copiar
                    </button>
                  </div>
                  <button className="w-full py-4 rounded-lg bg-tertiary text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                    <span className="material-symbols-outlined">check_circle</span>
                    ✅ Confirmar Pagamento Pix
                  </button>
                </div>
              </div>
            )}

            {method === 'card' && (
              <div className="w-full flex flex-col md:flex-row gap-12 items-center justify-center">
                {/* Illustrated Card Machine */}
                <div
                  className="relative w-64 h-96 rounded-[2.5rem] p-4 shadow-2xl border-4 flex flex-col items-center"
                  style={{ background: 'linear-gradient(180deg, #27313f 0%, #121c2a 100%)', borderColor: '#3a4455' }}
                >
                  <div className="w-3/4 h-2 rounded-full mb-8" style={{ backgroundColor: '#0d141d' }} />
                  <div
                    className="w-full aspect-[4/3] rounded-xl border-4 p-4 flex flex-col items-center justify-center text-center overflow-hidden"
                    style={{ backgroundColor: '#1d3d33', borderColor: '#2c3748' }}
                  >
                    <span className="text-[0.6rem] text-tertiary-fixed-dim uppercase tracking-widest mb-1">Processando</span>
                    <div className="text-tertiary-fixed-dim font-bold text-2xl tabular-nums">{fmt(amount)}</div>
                    <div className="mt-4 flex gap-1">
                      <div className="w-2 h-2 bg-tertiary-fixed-dim rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-tertiary-fixed-dim/40 rounded-full" />
                      <div className="w-2 h-2 bg-tertiary-fixed-dim/40 rounded-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-8 w-full px-2">
                    {Array(9).fill(0).map((_, i) => (
                      <div key={i} className="h-6 rounded-md opacity-40" style={{ backgroundColor: '#2c3748' }} />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-6 w-full px-2">
                    <div className="flex-1 h-8 bg-error/30 rounded-md" />
                    <div className="flex-1 h-8 bg-yellow-500/30 rounded-md" />
                    <div className="flex-1 h-8 bg-tertiary/60 rounded-md" />
                  </div>
                  <div className="mt-auto mb-4 text-slate-600">
                    <span className="material-symbols-outlined text-3xl">contactless</span>
                  </div>
                </div>

                {/* Card Instructions */}
                <div className="max-w-xs text-center md:text-left">
                  <h2 className="font-bold text-2xl text-on-surface mb-4">Aguardando Cartão</h2>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary">check</span>
                      <span>Aproxime seu cartão ou celular</span>
                    </li>
                    <li className="flex items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary">check</span>
                      <span>Ou insira o cartão no topo da máquina</span>
                    </li>
                    <li className="flex items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary">check</span>
                      <span>Siga as instruções no visor verde</span>
                    </li>
                  </ul>
                  <button className="w-full bg-primary-container text-white py-4 px-8 rounded-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined">point_of_sale</span>
                    Inserir / Aproximar Cartão
                  </button>
                  <p className="mt-4 text-xs text-on-surface-variant text-center opacity-60">
                    O sistema aguardará a resposta da maquineta por até 2 minutos.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Assistance */}
          <div className="bg-surface-container-low p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">support_agent</span>
              <span className="text-sm text-on-surface-variant">Precisa de ajuda com o pagamento?</span>
            </div>
            <div className="flex gap-4">
              <button className="text-sm font-semibold text-indigo-700 hover:underline">Falar com suporte</button>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Cancelar operação
              </button>
            </div>
          </div>
        </div>

        {/* Card brands */}
        <div className="mt-12 flex items-center gap-8 opacity-40 grayscale">
          <span className="text-sm font-bold text-slate-800 px-2">VISA</span>
          <span className="text-sm font-bold text-slate-800 px-2">MASTERCARD</span>
          <span className="text-sm font-bold text-slate-800 px-2">ELO</span>
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span className="material-symbols-outlined text-lg">bolt</span>
            <span>PIX</span>
          </div>
        </div>
      </main>
    </div>
  )
}
