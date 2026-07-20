import { Link } from 'react-router-dom'

const PASSOS = [
  { icon: 'tune', titulo: 'Configurar e mapear', txt: 'Na aba Desenvolvedor, a empresa ativa o NetRis (URL + token, guardados só no servidor) e mapeia cada parceiro a um plano-convênio e cada exame a um idProcedimento.' },
  { icon: 'person_search', titulo: 'Buscar / cadastrar paciente', txt: 'No cadastro, o CPF é buscado no NetRis. Se existe, os dados são puxados; se não, o paciente é criado lá — e o idPaciente fica vinculado ao ExameQR.' },
  { icon: 'verified', titulo: 'Autorizar o exame', txt: 'O coordenador do parceiro autoriza o exame. Só depois disso o agendamento e o QR ficam liberados.' },
  { icon: 'event_available', titulo: 'Agendar no NetRis', txt: 'O sistema busca horários reais (médico, sala, escala) e cria o agendamento (encaixe) direto na agenda do NetRis, gravando o protocolo no exame.' },
  { icon: 'qr_code_2', titulo: 'Confirmar por QR', txt: 'Na recepção, o QR do paciente é lido em /scan. O exame vira "realizado" e a situação EXAME_REALIZADO é refletida no NetRis.' },
  { icon: 'receipt_long', titulo: 'Faturar por lote', txt: 'Os exames realizados entram na cobrança por lote do parceiro, dentro do teto — fechando o ciclo financeiro.' },
]

const ENDPOINTS = [
  ['GET', '/api/netris/status', 'Se a integração está ativa para a empresa'],
  ['GET', '/api/netris/pacientes/cpf/:cpf', 'Busca paciente (normalizado)'],
  ['POST', '/api/netris/pacientes', 'Cria paciente no NetRis'],
  ['GET', '/api/netris/planos · /procedimentos', 'Listas para o mapeamento'],
  ['GET', '/api/netris/horarios-exame', 'Horários reais para um exame'],
  ['POST', '/api/netris/agendar-exame', 'Cria o agendamento (encaixe)'],
  ['POST', '/api/qr/validar', 'Confirma o exame → reflete no NetRis'],
]

export default function IntegracaoNetris() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-outline-variant/10 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/brotopay.png" alt="ExameQR" className="w-8 h-8 object-contain" />
          <span className="font-display text-xl font-extrabold tracking-tight text-primary">ExameQR</span>
          <span className="ml-2 text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">Integração NetRis</span>
        </div>
        <Link to="/painel" className="text-sm font-bold text-on-surface-variant hover:text-primary flex items-center gap-1"><span className="material-symbols-outlined text-base">arrow_back</span>Painel</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        <section className="text-center">
          <img src="/netris-logo.png" alt="NetRis" className="h-6 object-contain mx-auto mb-4" style={{ filter: 'brightness(0) opacity(0.85)' }} />
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Como funciona a integração NetRis</h1>
          <p className="text-on-surface-variant mt-3 max-w-xl mx-auto">O ExameQR conversa com o NetRis (Netpacs) da clínica de ponta a ponta: cadastra o paciente, agenda o exame na agenda real e confirma a realização — tudo pelo próprio site.</p>
        </section>

        {/* Fluxo */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-5">O fluxo, passo a passo</h2>
          <div className="relative">
            <div className="absolute left-5 top-2 bottom-2 w-px bg-outline-variant/25" aria-hidden="true" />
            <ol className="space-y-4">
              {PASSOS.map((p, i) => (
                <li key={i} className="relative flex gap-4">
                  <div className="relative z-10 flex-none w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
                  </div>
                  <div className="bg-surface-container-lowest rounded-2xl shadow-card p-4 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-bold text-primary tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <h3 className="font-bold">{p.titulo}</h3>
                    </div>
                    <p className="text-sm text-on-surface-variant mt-1">{p.txt}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Segurança */}
        <section className="bg-primary/5 ring-1 ring-primary/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
            <h2 className="font-bold">Arquitetura & segurança</h2>
          </div>
          <ul className="space-y-2 text-sm text-on-surface-variant">
            <li className="flex gap-2"><span className="text-primary font-bold">•</span> O frontend <b className="text-on-surface">nunca</b> fala com o NetRis nem enxerga o token — tudo passa pelo backend.</li>
            <li className="flex gap-2"><span className="text-primary font-bold">•</span> As credenciais vivem em <code className="text-xs bg-surface-container px-1 rounded">integracao_configs</code>, com acesso só via service role (RLS sem policy).</li>
            <li className="flex gap-2"><span className="text-primary font-bold">•</span> Cada empresa tem a sua config — sem nada global. Uma empresa pode usar NetRis; outra, outro método.</li>
            <li className="flex gap-2"><span className="text-primary font-bold">•</span> Escrita no NetRis é <b className="text-on-surface">best-effort</b> no caminho crítico: um scan nunca falha porque o NetRis caiu.</li>
          </ul>
        </section>

        {/* Endpoints */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Endpoints do backend</h2>
          <div className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-outline-variant/10">
                  {ENDPOINTS.map(([m, path, desc]) => (
                    <tr key={path}>
                      <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m === 'GET' ? 'bg-primary/10 text-primary' : 'bg-yellow-50 text-yellow-700'}`}>{m}</span></td>
                      <td className="px-2 py-2.5 font-mono text-[12px] text-on-surface whitespace-nowrap">{path}</td>
                      <td className="px-4 py-2.5 text-on-surface-variant">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-3">Provado em produção: mamografia agendada de verdade (procedimento 1397 “MAMOGRAFIA MARCADA ONLINE”) e cancelada em seguida.</p>
        </section>
      </main>
    </div>
  )
}
