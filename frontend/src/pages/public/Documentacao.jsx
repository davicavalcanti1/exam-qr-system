import { Link } from 'react-router-dom'
import DocsLayout, { H2, P } from './DocsLayout'

const CARDS = [
  { to: '/privacidade', icon: 'shield_lock', titulo: 'Política de Privacidade (LGPD)', txt: 'Quais dados tratamos, para quê, base legal e seus direitos.' },
  { to: '/seguranca', icon: 'security', titulo: 'Segurança & armazenamento', txt: 'Onde os dados ficam, isolamento por empresa, credenciais e auditoria.' },
  { to: '/termos', icon: 'gavel', titulo: 'Termos de Uso', txt: 'Condições e responsabilidades no uso da plataforma.' },
  { to: '/integracao-netris', icon: 'sync_alt', titulo: 'Integração NetRis', txt: 'Como o agendamento conversa com o sistema da clínica.' },
]

export default function Documentacao() {
  return (
    <DocsLayout title="Documentação" subtitle="Transparência sobre como o ExameQR funciona e trata seus dados.">
      <P>O ExameQR controla exames realizados por parceria: um parceiro custeia exames de pacientes até um teto, o valor só é debitado quando o exame é confirmado por QR, e as cobranças são fechadas por período. Abaixo, a documentação pública.</P>

      <div className="grid sm:grid-cols-2 gap-4 mt-6 not-prose">
        {CARDS.map(c => (
          <Link key={c.to} to={c.to} className="group flex items-start gap-3 p-5 rounded-2xl bg-surface-container-lowest shadow-card ring-1 ring-transparent hover:ring-primary/30 transition">
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-none"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span></span>
            <span>
              <span className="font-bold block group-hover:text-primary transition">{c.titulo}</span>
              <span className="text-sm text-on-surface-variant">{c.txt}</span>
            </span>
          </Link>
        ))}
      </div>

      <H2>Compromisso com a LGPD</H2>
      <P>Levamos a proteção de dados a sério — especialmente por lidarmos com dados sensíveis de saúde. Isolamos os dados por empresa, coletamos consentimento do paciente, registramos auditoria das ações e mantemos as credenciais fora do navegador. Veja os detalhes em Privacidade e em Segurança &amp; dados.</P>
    </DocsLayout>
  )
}
