# Redesign ExameQR — plano por etapas

Identidade base (mantida): **verde + ouro de Campina Grande**, display **Fustat**,
corpo **Inter**, tokens Material em `tailwind.config.js`, sombra `shadow-card`.
Objetivo: elevar layout, padronizar componentes e dar personalidade — sem trocar a marca.

Fazemos **página a página**, uma etapa por vez. Cada etapa só fecha quando validada.

## Inventário de telas
- Entrada: Landing · Entrar (login) · TrocarSenha · /redefinir-senha
- Shell: header + navegação (tabs) do Painel
- Dashboards: Visão Geral (coordenador/empresa)
- Clínico: Pacientes (cadastro + lista) · Agenda · Autorizações
- Financeiro: Cobranças · Recibo
- Gestão: Parceiros · Funcionários · Owner (empresas + admins) · Exames & preços
- Contratos: ContratosArea · ContratoArea · ContratoModal
- Auditoria
- Desenvolvedor: DesenvolvedorArea · NetrisConsole · NetrisMapeamento · /integracao-netris
- Modais: QrModal · AgendarModal · ReciboModal · CreateUserModal
- Público: ScanPage (já redesenhada)

## Etapas

### Etapa 0 — Fundação & kit de componentes  ⏳
Refinar tokens (espaçamento, tipografia, estados) e criar componentes reutilizáveis:
Button, Input, Select, Field, Card, Badge/Chip, Tabs, Table, Modal, EmptyState,
Spinner, PageHeader, Toast (substitui `alert`). Base pra todas as telas ficarem coerentes.

### Etapa 1 — Entrada & shell
Entrar, TrocarSenha, /redefinir-senha e o shell do Painel (header, navegação por tabs
responsiva, menu do usuário, comportamento mobile).

### Etapa 2 — Visão Geral (dashboards)
Cards de métricas, barra de teto, "a receber" — por papel. Hierarquia e leitura rápida.

### Etapa 3 — Pacientes & fluxo clínico
Cadastro (busca NetRis, exames, horários, LGPD), lista de pacientes, Agenda, Autorizações.

### Etapa 4 — Financeiro
Cobranças (fechar lote + lista) e Recibo (impressão).

### Etapa 5 — Gestão
Parceiros, Funcionários, Owner (empresas/admins), Exames & preços.

### Etapa 6 — Contratos & Auditoria
ContratosArea, ContratoArea, ContratoModal, AuditoriaArea.

### Etapa 7 — Desenvolvedor / NetRis
DesenvolvedorArea, NetrisConsole, NetrisMapeamento (+ revisão da /integracao-netris).

### Etapa 8 — Modais & microinterações
QrModal, AgendarModal, CreateUserModal, ReciboModal; toasts, estados de loading/erro/
vazio, transições, foco/acessibilidade.

### Etapa 9 — Polimento & responsividade
Passada mobile, revisão de consistência, dark mode (opcional), favicon/título.

## Regras do redesign
1. Nada de quebrar funcionalidade — só a camada visual/UX.
2. Todo componente novo vive em `src/components/ui/` e é reusado.
3. Mantém os tokens do tailwind; se faltar token, adiciona lá (não hardcode cor solta).
4. Uma etapa por vez, com build verde e commit ao fim de cada.
