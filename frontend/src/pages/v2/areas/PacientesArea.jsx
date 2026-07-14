import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { adminApi } from '../../../lib/adminApi'
import QrModal from '../QrModal'
import AgendarModal from '../AgendarModal'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const diaCurto = (br) => String(br || '').slice(0, 5) // "15/07/2026" -> "15/07"
const diaLongo = (br) => {
  const [d, m, y] = String(br).split('/')
  if (!y) return br
  return new Date(`${y}-${m}-${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

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
  const [slotsPorItem, setSlotsPorItem] = useState({})
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
  const [cancelandoId, setCancelandoId] = useState(null)

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

  // Garante o paciente no NetRis (busca pelo CPF ou cria). Retorna o idPaciente.
  async function garantirPacienteNetris() {
    const cpfLimpo = cpf.replace(/\D/g, '')
    if (netrisId) return netrisId
    if (cpfLimpo.length === 11) {
      const busca = await adminApi.netrisPaciente(cpfLimpo).catch(() => null)
      if (busca?.encontrado && busca.paciente?.netrisId) {
        const id = busca.paciente.netrisId
        setNetrisId(id)
        if (busca.paciente.nome && !nome) setNome(busca.paciente.nome)
        return id
      }
    }
    if (!nome.trim()) throw new Error('Informe o nome do paciente.')
    if (!sexo || !nascimento) throw new Error('Para o NetRis, informe sexo e data de nascimento.')
    const criado = await adminApi.netrisCriarPaciente({ nome: nome.trim(), cpf: cpfLimpo, sexo, dataNascimento: nascimento, telefone })
    const id = criado?.paciente?.netrisId
    if (!id) throw new Error('NetRis não retornou o ID do paciente.')
    setNetrisId(id)
    return id
  }

  // Carrega os horários do NetRis para o exame do item i (só pra ESCOLHER;
  // o agendamento real só é enviado quando o coordenador autoriza).
  async function carregarHorarios(i) {
    const ex = exames[i]
    if (!ex.procId) { setErr('Selecione o exame primeiro.'); return }
    if (escolherParceiro && !pid) { setErr('Selecione o parceiro primeiro.'); return }
    setErr(''); setSlotsPorItem(s => ({ ...s, [i]: { loading: true } }))
    try {
      const idPac = await garantirPacienteNetris()
      const hoje = new Date().toISOString().slice(0, 10)
      const fim = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
      const r = await adminApi.netrisHorariosCatalogo({ procedimentoId: ex.procId, parceiroId: pid, idPaciente: idPac, dataInicial: hoje, dataFinal: fim })
      const map = {}
      for (const s of r.slots || []) (map[s.data] ||= []).push(s)
      const grupos = Object.entries(map).map(([data, slots]) => ({ data, slots }))
      setSlotsPorItem(s => ({ ...s, [i]: { grupos } }))
    } catch (e) { setSlotsPorItem(s => ({ ...s, [i]: { erro: e.message } })) }
  }

  function escolherSlot(i, s) {
    // guarda o slot num formato pronto pro agendar-exame
    const slot = { data: s.data, dataString: s.dataString, horarioString: s.horaInicial, idMedico: s.idMedico, idSala: s.idSala, nomeMedico: s.nomeMedico }
    setExames(x => x.map((y, idx) => idx === i ? { ...y, slot } : y))
  }

  async function cancelarAgendamento(ex) {
    if (!window.confirm(`Cancelar o agendamento de ${ex.nome} no NetRis?`)) return
    setCancelandoId(ex.id)
    try { await adminApi.netrisCancelarExame(ex.id); await load() }
    catch (e) { alert('Falha ao cancelar: ' + e.message) }
    finally { setCancelandoId(null) }
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
      if (netrisAtivo) idNetris = await garantirPacienteNetris()

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
        const slot = ex.slot
        return {
          empresa_id: empresaId, parceiro_id: pid, paciente_id: pac.id,
          procedimento_id: p.id, nome: p.nome, valor: p.valor,
          indicacao: ex.indicacao || null, status: 'aguardando_autorizacao', criado_por: user?.id,
          // horário escolhido fica PENDENTE em netris_slot; só vai ao NetRis na autorização
          netris_slot: slot || null,
          scheduled_at: slot ? `${slot.dataString}T${slot.horarioString}:00` : (ex.data ? `${ex.data}T${ex.hora || '08:00'}:00` : null),
        }
      })
      const { error: eErr } = await supabase.from('exames').insert(rows)
      if (eErr) throw eErr
      setNome(''); setCpf(''); setSexo(''); setNascimento(''); setTelefone(''); setNetrisId(null); setNetrisMsg('')
      setExames([{ procId: '', indicacao: '', data: '', hora: '' }]); setParceiroSel(''); setSlotsPorItem({}); await load()
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
                  {!netrisAtivo ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Data (opcional)</label><input type="date" className={input} value={ex.data} onChange={e => setExames(x => x.map((y, idx) => idx === i ? { ...y, data: e.target.value } : y))} /></div>
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Horário</label><input type="time" className={input} value={ex.hora} onChange={e => setExames(x => x.map((y, idx) => idx === i ? { ...y, hora: e.target.value } : y))} /></div>
                    </div>
                  ) : ex.procId && (
                    <div className="pt-1">
                      {ex.slot ? (
                        <div className="flex items-center justify-between gap-2 bg-primary/10 text-primary rounded-lg px-3 py-2">
                          <span className="text-sm font-bold flex items-center gap-1.5"><span className="material-symbols-outlined text-base">schedule</span>{diaCurto(ex.slot.data)} · {ex.slot.horarioString} · {ex.slot.nomeMedico}</span>
                          <button type="button" onClick={() => setExames(x => x.map((y, idx) => idx === i ? { ...y, slot: null } : y))} className="text-xs font-bold hover:underline">trocar</button>
                        </div>
                      ) : (() => {
                        const st = slotsPorItem[i]
                        if (!st) return <button type="button" onClick={() => carregarHorarios(i)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_month</span>Ver horários no NetRis</button>
                        if (st.loading) return <p className="text-xs text-on-surface-variant flex items-center gap-2"><span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />Buscando horários…</p>
                        if (st.erro) return <p className="text-xs text-on-error-container bg-error-container/40 rounded px-2 py-1">{st.erro} <button type="button" onClick={() => carregarHorarios(i)} className="font-bold underline ml-1">tentar de novo</button></p>
                        if (!st.grupos?.length) return <p className="text-xs text-on-surface-variant">Nenhum horário disponível nos próximos 30 dias.</p>
                        return (
                          <div className="space-y-2 max-h-56 overflow-y-auto">
                            {st.grupos.map(g => (
                              <div key={g.data}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 capitalize">{diaLongo(g.data)}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {g.slots.map((s, k) => (
                                    <button key={k} type="button" title={`${s.nomeMedico} · ${s.sala}`} onClick={() => escolherSlot(i, s)}
                                      className="px-2.5 py-1 rounded-md text-xs font-bold bg-surface-container-lowest ring-1 ring-outline-variant/30 hover:ring-2 hover:ring-primary hover:text-primary transition">
                                      {s.horaInicial}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              ))}
              {netrisAtivo && (
                <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">info</span>
                  O horário escolhido fica <b>pendente</b>; a marcação no NetRis é enviada quando o coordenador <b>autorizar</b>.
                </p>
              )}
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
                            <button onClick={() => setAgExame(ex)} title={agendado ? 'Ver / reagendar no NetRis' : 'Agendar no NetRis'} className="p-0.5 rounded hover:bg-black/10">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{agendado ? 'event_available' : 'calendar_add_on'}</span>
                            </button>
                          )}
                          {agendado && (
                            <button onClick={() => cancelarAgendamento(ex)} disabled={cancelandoId === ex.id} title="Cancelar agendamento no NetRis" className="p-0.5 rounded hover:bg-black/10 text-error disabled:opacity-40">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{cancelandoId === ex.id ? 'hourglass_empty' : 'event_busy'}</span>
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
