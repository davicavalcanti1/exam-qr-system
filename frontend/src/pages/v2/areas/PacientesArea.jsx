import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { adminApi } from '../../../lib/adminApi'
import QrModal from '../QrModal'
import AgendarModal from '../AgendarModal'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const STATUS = {
  rascunho: { label: 'Rascunho', cls: 'bg-surface-container text-on-surface-variant' },
  aguardando_autorizacao: { label: 'Aguardando autorização', cls: 'bg-yellow-50 text-yellow-700' },
  autorizado: { label: 'Autorizado', cls: 'bg-primary/10 text-primary' },
  realizado: { label: 'Realizado', cls: 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant' },
  cancelado: { label: 'Cancelado', cls: 'bg-error-container/40 text-on-error-container' },
}

export default function PacientesArea({ escolherParceiro = false }) {
  const { user, empresaId, parceiroId } = useAuth()
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [sexo, setSexo] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [telefone, setTelefone] = useState('')
  const [netrisAtivo, setNetrisAtivo] = useState(false)
  const [netrisId, setNetrisId] = useState(null)
  const [buscandoNetris, setBuscandoNetris] = useState(false)
  const [netrisMsg, setNetrisMsg] = useState('')
  const [exames, setExames] = useState([{ procId: '', indicacao: '', data: '', hora: '' }])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [catalogo, setCatalogo] = useState([])
  const [parceiros, setParceiros] = useState([])
  const [parceiroSel, setParceiroSel] = useState('')
  const [qrExame, setQrExame] = useState(null)
  const [agExame, setAgExame] = useState(null)

  useEffect(() => {
    adminApi.netrisStatus().then(s => setNetrisAtivo(!!s.ativo)).catch(() => setNetrisAtivo(false))
    supabase.from('procedimentos').select('id, nome, valor').eq('ativo', true).order('nome')
      .then(({ data }) => setCatalogo(data || []))
    if (escolherParceiro) {
      supabase.from('parceiros').select('id, nome').order('nome').then(({ data }) => setParceiros(data || []))
    }
  }, [escolherParceiro])

  const pid = escolherParceiro ? parceiroSel : parceiroId
  const procById = (id) => catalogo.find(c => c.id === id)
  const total = exames.reduce((s, e) => s + (procById(e.procId)?.valor || 0), 0)

  async function load() {
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome, cpf, created_at, exames(id, nome, valor, status, scheduled_at, netris_atendimento_id)')
      .order('created_at', { ascending: false })
    setLista(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  async function buscarNetris() {
    const cpfLimpo = cpf.replace(/\D/g, '')
    if (cpfLimpo.length !== 11) { setNetrisMsg('Informe um CPF com 11 dígitos.'); return }
    setBuscandoNetris(true); setNetrisMsg(''); setNetrisId(null)
    try {
      const r = await adminApi.netrisPaciente(cpfLimpo)
      if (r.encontrado && r.paciente) {
        const p = r.paciente
        setNetrisId(p.netrisId)
        if (p.nome) setNome(p.nome)
        if (p.sexo) setSexo(p.sexo)
        if (p.nascimento) setNascimento(p.nascimento)
        if (p.telefone) setTelefone(p.telefone)
        setNetrisMsg(`✓ Encontrado no NetRis (ID ${p.netrisId}). Dados preenchidos.`)
      } else {
        setNetrisMsg('Não encontrado no NetRis — preencha os dados abaixo para cadastrar ao salvar.')
      }
    } catch (e) { setNetrisMsg('Erro na busca: ' + e.message) } finally { setBuscandoNetris(false) }
  }

  async function submit(e) {
    e.preventDefault(); setErr('')
    if (escolherParceiro && !pid) { setErr('Selecione o parceiro.'); return }
    if (exames.some(x => !x.procId)) { setErr('Selecione o exame em cada item.'); return }
    const cpfLimpo = cpf.replace(/\D/g, '')
    setSaving(true)
    try {
      // Integração NetRis: garante o paciente lá (busca/cria) antes de salvar aqui.
      let idNetris = netrisId
      if (netrisAtivo) {
        if (!idNetris && cpfLimpo.length === 11) {
          const busca = await adminApi.netrisPaciente(cpfLimpo).catch(() => null)
          if (busca?.encontrado) idNetris = busca.paciente?.netrisId
        }
        if (!idNetris) {
          if (!sexo || !nascimento) throw new Error('Para cadastrar no NetRis, informe sexo e data de nascimento.')
          const criado = await adminApi.netrisCriarPaciente({ nome: nome.trim(), cpf: cpfLimpo, sexo, dataNascimento: nascimento, telefone })
          idNetris = criado?.paciente?.netrisId
          if (!idNetris) throw new Error('NetRis não retornou o ID do paciente criado.')
        }
      }
      const { data: pac, error: pErr } = await supabase
        .from('pacientes')
        .insert({
          empresa_id: empresaId, parceiro_id: pid, nome: nome.trim(), cpf: cpfLimpo,
          netris_id_paciente: idNetris || null, sexo: sexo || null,
          data_nascimento: nascimento || null, telefone: telefone || null,
        })
        .select('id').single()
      if (pErr) throw pErr
      const rows = exames.map(ex => {
        const p = procById(ex.procId)
        return {
          empresa_id: empresaId, parceiro_id: pid, paciente_id: pac.id,
          procedimento_id: p.id, nome: p.nome, valor: p.valor,
          indicacao: ex.indicacao || null, status: 'aguardando_autorizacao', criado_por: user?.id,
          scheduled_at: ex.data ? `${ex.data}T${ex.hora || '08:00'}:00` : null,
        }
      })
      const { error: eErr } = await supabase.from('exames').insert(rows)
      if (eErr) throw eErr
      setNome(''); setCpf(''); setSexo(''); setNascimento(''); setTelefone(''); setNetrisId(null); setNetrisMsg('')
      setExames([{ procId: '', indicacao: '', data: '', hora: '' }]); setParceiroSel(''); await load()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const input = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant'

  return (
    <div className="space-y-8">
      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
        <h3 className="text-lg font-semibold mb-4">Novo paciente</h3>
        {catalogo.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-4">Nenhum exame no catálogo. Peça ao administrador da empresa para cadastrar os exames em <b>Exames &amp; preços</b>.</p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {escolherParceiro && (
              <div>
                <label className={label}>Parceiro</label>
                <select className={input} value={parceiroSel} onChange={e => setParceiroSel(e.target.value)} required>
                  <option value="">Selecione o parceiro…</option>
                  {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={label}>Nome</label><input className={input} value={nome} onChange={e => setNome(e.target.value)} required /></div>
              <div>
                <label className={label}>CPF</label>
                <div className="flex gap-2">
                  <input className={input} value={cpf} onChange={e => { setCpf(e.target.value); setNetrisId(null) }} required />
                  {netrisAtivo && (
                    <button type="button" onClick={buscarNetris} disabled={buscandoNetris}
                      className="px-3 py-2.5 bg-surface-container text-on-surface font-bold text-sm rounded-lg hover:bg-surface-container-high transition disabled:opacity-50 flex-none whitespace-nowrap">
                      {buscandoNetris ? '…' : 'Buscar NetRis'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {netrisAtivo && (
              <>
                {netrisMsg && <p className={`text-sm ${netrisId ? 'text-primary' : 'text-on-surface-variant'}`}>{netrisMsg}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={label}>Sexo{!netrisId && <span className="text-error"> *</span>}</label>
                    <select className={input} value={sexo} onChange={e => setSexo(e.target.value)}>
                      <option value="">—</option><option value="F">Feminino</option><option value="M">Masculino</option>
                    </select>
                  </div>
                  <div><label className={label}>Nascimento{!netrisId && <span className="text-error"> *</span>}</label><input type="date" className={input} value={nascimento} onChange={e => setNascimento(e.target.value)} /></div>
                  <div><label className={label}>Telefone</label><input className={input} value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(83) 9…" /></div>
                </div>
                <p className="text-[11px] text-on-surface-variant">Com o NetRis ativo, o paciente é vinculado (ou criado) lá automaticamente ao salvar. Use “Buscar NetRis” para puxar quem já existe.</p>
              </>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={label}>Exames</span>
                <button type="button" onClick={() => setExames(x => [...x, { procId: '', indicacao: '', data: '', hora: '' }])} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-sm">add</span>Adicionar exame</button>
              </div>
              {exames.map((ex, i) => (
                <div key={i} className="bg-surface rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                    <select className={input} value={ex.procId} onChange={e => setExames(x => x.map((y, idx) => idx === i ? { ...y, procId: e.target.value } : y))} required>
                      <option value="">Selecione o exame…</option>
                      {catalogo.map(c => <option key={c.id} value={c.id}>{c.nome} ({fmt(c.valor)})</option>)}
                    </select>
                    <input className={input} placeholder="Indicação (opcional)" value={ex.indicacao} onChange={e => setExames(x => x.map((y, idx) => idx === i ? { ...y, indicacao: e.target.value } : y))} />
                    {exames.length > 1
                      ? <button type="button" onClick={() => setExames(x => x.filter((_, idx) => idx !== i))} className="p-2 text-on-surface-variant hover:text-error"><span className="material-symbols-outlined">delete</span></button>
                      : <span />}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Data (opcional)</label><input type="date" className={input} value={ex.data} onChange={e => setExames(x => x.map((y, idx) => idx === i ? { ...y, data: e.target.value } : y))} /></div>
                    <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Horário</label><input type="time" className={input} value={ex.hora} onChange={e => setExames(x => x.map((y, idx) => idx === i ? { ...y, hora: e.target.value } : y))} /></div>
                  </div>
                </div>
              ))}
            </div>
            {err && <div className="text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{err}</div>}
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Total: <b className="text-on-surface tabular-nums">{fmt(total)}</b></span>
              <button disabled={saving} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{saving ? 'Salvando…' : 'Registrar paciente'}</button>
            </div>
          </form>
        )}
      </section>

      <section className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10"><h3 className="text-lg font-semibold">Pacientes ({lista.length})</h3></div>
        {loading ? <p className="text-center py-10 text-on-surface-variant text-sm">Carregando…</p>
          : lista.length === 0 ? <p className="text-center py-10 text-on-surface-variant text-sm">Nenhum paciente ainda.</p>
          : <div className="divide-y divide-outline-variant/10">
              {lista.map(p => (
                <div key={p.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div><p className="font-semibold">{p.nome}</p><p className="text-[11px] text-on-surface-variant tabular-nums">{p.cpf}</p></div>
                    <span className="text-sm text-on-surface-variant tabular-nums">{fmt((p.exames || []).reduce((s, e) => s + Number(e.valor || 0), 0))}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(p.exames || []).map(ex => {
                      const st = STATUS[ex.status] || STATUS.rascunho
                      const temQr = ['autorizado', 'realizado'].includes(ex.status)
                      const podeAgendar = ex.status === 'autorizado'
                      const agendado = Boolean(ex.netris_atendimento_id)
                      return (
                        <span key={ex.id} className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>
                          {ex.nome} · {st.label}
                          {temQr && (
                            <button onClick={() => setQrExame(ex)} title="Ver QR" className="p-0.5 rounded hover:bg-black/10">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>qr_code_2</span>
                            </button>
                          )}
                          {podeAgendar && (
                            <button onClick={() => setAgExame(ex)} title={agendado ? 'Reagendar no NetRis' : 'Agendar no NetRis'} className="p-0.5 rounded hover:bg-black/10">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{agendado ? 'event_available' : 'calendar_add_on'}</span>
                            </button>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>}
      </section>

      <QrModal exame={qrExame} onClose={() => { setQrExame(null); load() }} />
      {agExame && <AgendarModal exame={agExame} onClose={() => setAgExame(null)} onDone={load} />}
    </div>
  )
}
