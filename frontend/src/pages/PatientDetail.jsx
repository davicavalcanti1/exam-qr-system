import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const examIcons = ['biotech', 'radiology', 'ecg', 'science', 'medication', 'vaccines']

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const qrRef = useRef(null)

  async function load() {
    try {
      const p = await api.getPatient(id)
      setPatient(p)
    } catch {
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleRevoke() {
    if (!confirm('Revogar o QR Code deste paciente?')) return
    setRevoking(true)
    try {
      await api.revokeQr(id)
      load()
    } finally {
      setRevoking(false)
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await api.regenerateQr(id)
      load()
    } finally {
      setRegenerating(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!patient) return null

  const exams = patient.exams || []
  const total = exams.reduce((s, e) => s + (e.value || 0), 0)
  const qrCode = patient.qrCode
  const hasQr = !!qrCode
  const isUsed = qrCode?.status === 'exhausted'
  const isRevoked = qrCode?.status === 'revoked'
  const isActive = hasQr && !isUsed && !isRevoked
  const qrImageUrl = hasQr ? api.getQRImageUrl(patient.id) : null

  // Usage quota dots (exams used)
  const usedCount = isUsed ? exams.length : (patient.usageLog?.length || 0)
  const totalDots = exams.length

  return (
    <div className="bg-surface font-body text-on-surface antialiased">
      <main className="max-w-7xl mx-auto px-8 py-10">
        {/* Back Button & Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-all group mb-4"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span className="text-sm font-medium">Voltar para listagem</span>
            </button>
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface">Detalhes do Paciente</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 rounded-lg border border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>print</span>
              Imprimir
            </button>
            <button
              onClick={handleRevoke}
              disabled={revoking || !hasQr}
              className="px-6 py-2.5 rounded-lg border border-error/20 text-error font-semibold text-sm hover:bg-error-container/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>block</span>
              {revoking ? 'Revogando...' : 'Revogar QR'}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="px-6 py-2.5 rounded-lg qr-gradient text-white font-semibold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>qr_code_2</span>
              {regenerating ? 'Gerando...' : 'Gerar Novo QR Code'}
            </button>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {/* Patient Info Card */}
            <section className="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/10">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-on-surface tracking-tight">{patient.name}</h2>
                    <p className="text-on-surface-variant text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">id_card</span>
                      CPF: <span className="font-mono tabular-nums">{patient.cpf}</span>
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isActive ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant' :
                  isRevoked ? 'bg-error-container text-on-error-container' :
                  isUsed ? 'bg-secondary-fixed text-on-secondary-fixed' :
                  'bg-surface-container text-on-surface-variant'
                }`}>
                  {isActive ? 'Paciente Ativo' : isRevoked ? 'QR Revogado' : isUsed ? 'QR Usado' : 'Sem QR'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-outline-variant/10">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Registrado em</span>
                  <p className="text-on-surface font-medium tabular-nums">
                    {new Date(patient.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Última Atualização</span>
                  <p className="text-on-surface font-medium tabular-nums">
                    {new Date(patient.updatedAt || patient.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </section>

            {/* Exams List */}
            <section className="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-on-surface">Exames Autorizados</h3>
                <span className="text-xs font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded uppercase tracking-tighter">
                  Protocolo #{patient.id}
                </span>
              </div>
              <div className="space-y-4 mb-8">
                {exams.map((exam, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant">{examIcons[i % examIcons.length]}</span>
                      <div>
                        <p className="font-semibold text-on-surface">{exam.exam_name}</p>
                        {exam.exam_type && exam.exam_type !== exam.exam_name && (
                          <p className="text-xs text-on-surface-variant">{exam.exam_type}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-on-surface tabular-nums">{fmt(exam.value)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-6 bg-primary-container/5 rounded-xl border border-primary-container/10">
                <span className="text-on-surface-variant font-medium">Valor Total dos Procedimentos</span>
                <span className="text-2xl font-black text-primary tabular-nums tracking-tighter">{fmt(total)}</span>
              </div>
            </section>
          </div>

          {/* Right Column: QR Code */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <section className="bg-surface-container-lowest p-10 rounded-xl ring-1 ring-outline-variant/10 flex flex-col items-center text-center">
              <div className="mb-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mb-2 block">
                  Identificador Digital Único
                </span>
                <h3 className="text-xl font-bold text-on-surface">QR Code de Autorização</h3>
              </div>

              <div className="relative p-6 bg-white rounded-2xl border-4 border-surface-container-high mb-8 shadow-2xl shadow-indigo-100" ref={qrRef}>
                <div className="w-64 h-64 bg-slate-100 flex items-center justify-center overflow-hidden rounded-lg">
                  {qrImageUrl ? (
                    <img src={qrImageUrl} alt="QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl">qr_code_2</span>
                      <span className="text-xs">QR Code não gerado</span>
                    </div>
                  )}
                </div>
                {isActive && (
                  <div className="absolute -top-3 -right-3 bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  </div>
                )}
              </div>

              <div className="w-full space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm mb-1 px-1">
                    <span className="font-semibold text-on-surface-variant">Uso de Cotas</span>
                    <span className="font-bold text-primary tabular-nums">{usedCount}/{totalDots}</span>
                  </div>
                  <div className="flex gap-2 w-full">
                    {exams.map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full ${i < usedCount ? 'bg-tertiary-fixed-dim' : 'bg-surface-container-high'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-tertiary/5 border border-tertiary/10">
                    <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>directions_bus</span>
                    <span className="text-[10px] font-bold text-tertiary uppercase">Transporte</span>
                    <span className="material-symbols-outlined text-tertiary text-xs">check_circle</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-tertiary/5 border border-tertiary/10">
                    <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>bakery_dining</span>
                    <span className="text-[10px] font-bold text-tertiary uppercase">Lanche</span>
                    <span className="material-symbols-outlined text-tertiary text-xs">check_circle</span>
                  </div>
                  <div className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${isActive ? 'bg-tertiary/5 border-tertiary/10' : 'bg-surface-container-high/30 border-outline-variant/20 opacity-60'}`}>
                    <span className={`material-symbols-outlined ${isActive ? 'text-tertiary' : 'text-on-surface-variant'}`}>medical_services</span>
                    <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-tertiary' : 'text-on-surface-variant'}`}>Exame</span>
                    <span className={`material-symbols-outlined text-xs ${isActive ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                      {isActive ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Security Info Card */}
            <section className="bg-indigo-900 text-white p-6 rounded-xl overflow-hidden relative">
              <div className="relative z-10">
                <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-200 mb-4">Informações de Segurança</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-indigo-300">lock</span>
                    <p className="text-xs leading-relaxed">
                      Este QR Code é criptografado e contém apenas o token de autorização. Os dados sensíveis são processados apenas em terminais autenticados.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-indigo-300">timer</span>
                    <p className="text-xs leading-relaxed">
                      Válido por 72 horas a partir da data de emissão ou até o consumo total das cotas.
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
