// Prefixo de todas as chamadas ao servidor DESTE app.
//
// Por que não é `/api`: este app roda em dois lugares. No host próprio ele é a
// raiz do domínio e `/api` estaria livre. Mas ele também é servido sob
// `gestao.imagoradiologia.cloud/scan-parceiros-app`, por proxy do nginx do Controle
// Operacional — e lá `/api/` já é do Express do sistema. Uma chamada daqui para
// `/api/...` chegaria no backend errado, com sessão válida, e o erro seria
// difícil de ler.
//
// ── ATENÇÃO ao mexer ───────────────────────────────────────────────────────
// Nem todo `/api/` no código é nosso. O pedido do ticket de SSO
// (`/api/sso/ticket/...`, em auth/ssoDoSistema.js) é endereçado ao Controle
// Operacional, e tem que continuar `/api` — trocar por este prefixo faria o
// pedido chegar aqui, onde essa rota não existe, e o SSO pararia sem erro
// visível.
//
// Ver ADR 0003 em imago-platform/docs/adr.
export const API_BASE = '/scan-parceiros-api'
