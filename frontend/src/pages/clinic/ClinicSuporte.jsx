const FAQ = [
  { q: 'Quando o valor do exame entra na conta do parceiro?', a: 'Somente quando o QR do paciente é escaneado e o exame é confirmado como realizado. Gerar o QR não gasta o teto.' },
  { q: 'O que acontece quando o parceiro estoura o teto?', a: 'Ele é bloqueado para novas emissões e fica pendente de pagamento. Ao registrar um pagamento que quite a dívida, o teto é liberado novamente.' },
  { q: 'Como aumento o limite de um parceiro?', a: 'Em Gestão de Cotas, clique em "Ajustar teto" na linha do parceiro e informe o novo valor.' },
  { q: 'Como registro um pagamento recebido?', a: 'No módulo Financeiro, clique em "Registrar pagamento" na linha do parceiro e informe o valor recebido.' },
  { q: 'Por quanto tempo o QR é válido?', a: 'O QR expira em 72 horas após a geração. Depois disso é preciso gerar um novo.' },
]

export default function ClinicSuporte() {
  return (
    <>
      <header className="flex justify-between items-center w-full px-8 py-4 bg-white sticky top-0 z-40 border-b border-outline-variant/10">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold tracking-tighter text-indigo-700">Suporte</h2>
          <div className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-md tracking-tighter">CLÍNICA</div>
        </div>
      </header>

      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="mailto:suporte@exameqr.com.br" className="bg-surface-container-lowest p-6 rounded-xl shadow-card hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-11 h-11 bg-surface-container rounded-lg flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">mail</span>
            </div>
            <div>
              <p className="text-sm font-semibold">E-mail</p>
              <p className="text-xs text-on-surface-variant">suporte@exameqr.com.br</p>
            </div>
          </a>
          <a href="https://wa.me/5583999999999" target="_blank" rel="noreferrer" className="bg-surface-container-lowest p-6 rounded-xl shadow-card hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-11 h-11 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600">
              <span className="material-symbols-outlined">chat</span>
            </div>
            <div>
              <p className="text-sm font-semibold">WhatsApp</p>
              <p className="text-xs text-on-surface-variant">(83) 99999-9999 · seg–sex, 8h–18h</p>
            </div>
          </a>
        </section>

        <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-card">
          <div className="p-6 border-b border-outline-variant/10">
            <h3 className="text-lg font-semibold tracking-tight">Perguntas frequentes</h3>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {FAQ.map((item, i) => (
              <details key={i} className="group px-6 py-4">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-sm font-semibold pr-4">{item.q}</span>
                  <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <p className="text-sm text-on-surface-variant mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-on-surface-variant">ExameQR · versão 1.0 · controle financeiro de exames por parceria</p>
      </div>
    </>
  )
}
