import { useEffect, useState } from 'react'
import { api } from '../api'

const USE_ICONS = {
  transport: '🚌',
  snack: '🍱',
  exam: '🏥'
}

const USE_COLORS = {
  transport: 'bg-blue-50 text-blue-700',
  snack: 'bg-amber-50 text-amber-700',
  exam: 'bg-green-50 text-green-700'
}

export default function ScannerHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  const LIMIT = 50

  async function loadHistory() {
    setLoading(true)
    try {
      const result = await api.getScannerHistory(LIMIT, skip)
      setHistory(result.history)
      setTotal(result.total)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHistory() }, [skip])

  const filtered = history.filter(h => {
    const matchSearch = !search ||
      h.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      h.cpf.includes(search)

    const matchType = filterType === 'all' || h.use_type === filterType

    return matchSearch && matchType
  })

  return (
    <div style={{ backgroundColor: '#111827' }} className="text-slate-100 min-h-screen flex flex-col font-inter">
      {/* Header */}
      <header className="p-6 md:p-10 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-indigo-400 uppercase">ExameQR</h1>
          <p className="text-sm text-slate-400 mt-1">Histórico de Leituras</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Total registrado</p>
          <p className="text-3xl font-black text-emerald-400 tabular-nums">{total}</p>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {/* Filtros */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Buscar Paciente
              </label>
              <input
                type="text"
                placeholder="Nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Filtro por tipo */}
            <div className="md:w-48">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Tipo de Uso
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
              >
                <option value="all">Todos</option>
                <option value="transport">🚌 Transporte</option>
                <option value="snack">🍱 Lanche</option>
                <option value="exam">🏥 Exame</option>
              </select>
            </div>

            {/* Refresh */}
            <div className="flex items-end">
              <button
                onClick={loadHistory}
                disabled={loading}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">refresh</span>
                Atualizar
              </button>
            </div>
          </div>
        </section>

        {/* Tabela de Leituras */}
        <section className="space-y-4">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 mt-4">Carregando histórico...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-lg">Nenhuma leitura encontrada</p>
              <p className="text-slate-500 text-sm mt-2">Comece scaneando QR codes para ver o histórico aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 hover:bg-slate-800/60 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Tipo de Uso */}
                    <div className={`px-4 py-2 rounded-lg font-bold text-sm ${USE_COLORS[item.use_type]}`}>
                      <span>{USE_ICONS[item.use_type]} {item.use_type === 'transport' ? 'Transporte' : item.use_type === 'snack' ? 'Lanche' : 'Exame'}</span>
                    </div>

                    {/* Paciente */}
                    <div className="flex-1">
                      <p className="text-white font-semibold">{item.patient_name}</p>
                      <p className="text-slate-400 text-sm font-mono">{item.cpf}</p>
                    </div>

                    {/* Data/Hora */}
                    <div className="text-right">
                      <p className="text-slate-300 font-mono text-sm">{item.used_at_formatted}</p>
                      <p className={`text-xs font-bold mt-1 ${
                        item.qr_status === 'active' ? 'text-emerald-400' :
                        item.qr_status === 'exhausted' ? 'text-yellow-400' :
                        'text-slate-500'
                      }`}>
                        {item.qr_status === 'active' ? '✓ Ativo' : item.qr_status === 'exhausted' ? '⊘ Esgotado' : '✗ Revogado'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Paginação */}
        {!loading && history.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Mostrando {filtered.length} de {total} leituras
            </p>
            <div className="flex gap-3">
              <button
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - LIMIT))}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <button
                disabled={skip + LIMIT >= total}
                onClick={() => setSkip(skip + LIMIT)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-slate-700 text-center text-slate-500 text-xs">
        <p>ExameQR © 2026 — Sistema de Autorização Digital de Exames</p>
        <p className="mt-1">Histórico atualizado em tempo real</p>
      </footer>
    </div>
  )
}
