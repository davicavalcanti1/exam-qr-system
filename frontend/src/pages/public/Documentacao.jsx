import { Link } from 'react-router-dom'
import DocsLayout, { H2, P, UL, Nota } from './DocsLayout'

const ATALHOS = [
  { to: '/docs/como-funciona', icon: 'account_tree', titulo: 'Como funciona', txt: 'O fluxo do teto ao recibo, ponta a ponta.' },
  { to: '/docs/modulos', icon: 'widgets', titulo: 'Módulos', txt: 'O que cada parte do sistema faz.' },
  { to: '/docs/netris', icon: 'sync_alt', titulo: 'Integração NetRis', txt: 'Agendamento real no sistema da clínica.' },
  { to: '/docs/arquitetura', icon: 'architecture', titulo: 'Arquitetura & stack', txt: 'Como o sistema é construído por dentro.' },
]

export default function Documentacao() {
  return (
    <DocsLayout title="Documentação" subtitle="Tudo sobre o ExameQR: o produto, os módulos, as integrações, a segurança e a engenharia por trás.">
      <P>O <b>ExameQR</b> é uma plataforma para <b>controle financeiro de exames realizados por parceria</b>. Um parceiro (clínica, consultório ou médico que encaminha) custeia exames de seus pacientes até um <b>teto de crédito</b>; o valor de cada exame só é <b>debitado quando o exame é confirmado pela leitura de um QR Code</b>; e a cobrança é fechada <b>por período</b>, com recibo.</P>

      <Nota>Esta é a documentação da <b>versão piloto</b>. O produto está em uso real e evolui a cada semana — as funcionalidades descritas aqui refletem o que já está no ar.</Nota>

      <H2>O problema que resolve</H2>
      <P>Clínicas que trabalham com encaminhamento por parceria perdem receita e controle: exames autorizados e não realizados, cobranças manuais em planilha, falta de rastreabilidade de quem autorizou o quê, e nenhum limite real de crédito por parceiro. O ExameQR fecha essas brechas com um fluxo digital, auditável e com débito só na confirmação.</P>

      <H2>Diferenciais</H2>
      <UL>
        <li><b>Débito no scan</b>: o exame só consome o teto quando o QR é lido — não se cobra o que não foi feito.</li>
        <li><b>Teto por parceiro</b>: crédito controlado, com trava ao atingir o limite.</li>
        <li><b>Cobrança por lote</b>: fecha o período, soma os exames confirmados e gera recibo.</li>
        <li><b>Agendamento real</b>: integração opcional com o NetRis/Netpacs da clínica.</li>
        <li><b>Multiempresa e white-label</b>: cada clínica isolada e com a própria marca.</li>
        <li><b>Seguro e conforme a LGPD</b>: isolamento por empresa, consentimento, auditoria e DPA.</li>
      </UL>

      <div className="grid sm:grid-cols-2 gap-4 mt-6 not-prose">
        {ATALHOS.map(c => (
          <Link key={c.to} to={c.to} className="group flex items-start gap-3 p-5 rounded-2xl bg-surface-container-lowest shadow-card ring-1 ring-transparent hover:ring-primary/30 transition">
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-none"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span></span>
            <span>
              <span className="font-bold block group-hover:text-primary transition">{c.titulo}</span>
              <span className="text-sm text-on-surface-variant">{c.txt}</span>
            </span>
          </Link>
        ))}
      </div>
    </DocsLayout>
  )
}
