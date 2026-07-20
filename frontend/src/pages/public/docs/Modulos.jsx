import DocsLayout, { H2, P } from '../DocsLayout'

const MODS = [
  ['dashboard', 'Visão geral', 'Painel inicial com atalhos, pendências acionáveis, indicadores e resumo financeiro (em aberto, a receber, recebido e barra de teto).'],
  ['handshake', 'Parceiros', 'Cadastro de parceiros, definição do teto de crédito, status e situação do contrato. (Empresa)'],
  ['groups', 'Pacientes / Agendamentos', 'Cadastro de pacientes com consentimento LGPD, exames solicitados, seletor de horário do NetRis e ferramentas de direitos do titular (exportar, anonimizar).'],
  ['fact_check', 'Autorizações', 'Fila de exames aguardando autorização, com a trava de teto e o envio do agendamento ao NetRis. (Coordenador)'],
  ['calendar_month', 'Agenda', 'Visão dos exames agendados no período.'],
  ['medical_services', 'Exames & preços', 'Catálogo de exames da clínica com valores e mapeamento para os procedimentos do NetRis. (Empresa)'],
  ['receipt_long', 'Cobranças', 'Fechamento de lotes por período, geração de recibo e baixa de pagamento (que libera o teto). Parceiro vê em modo leitura.'],
  ['description', 'Contratos', 'Modelo de contrato da empresa e assinatura eletrônica pelo parceiro, com registro em auditoria.'],
  ['history', 'Auditoria', 'Trilha de todas as ações sensíveis: quem fez, o quê e quando. (Empresa)'],
  ['monitoring', 'Consumo', 'Medição de uso por empresa (parceiros, usuários, exames, faturado, armazenamento). (Dono)'],
]

export default function Modulos() {
  return (
    <DocsLayout title="Módulos" subtitle="As partes do sistema e o que cada uma entrega.">
      <P>O menu se adapta ao papel do usuário. Abaixo, o que cada módulo faz. Entre parênteses, quando é exclusivo de um perfil.</P>
      <div className="not-prose mt-6 space-y-3">
        {MODS.map(([icon, t, d]) => (
          <div key={t} className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-lowest shadow-card">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-none"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span></span>
            <div>
              <p className="font-bold">{t}</p>
              <p className="text-sm text-on-surface-variant leading-relaxed">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </DocsLayout>
  )
}
