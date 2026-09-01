import { supabase } from '../lib/supabase'
import { API_BASE } from '../lib/apiBase'

/**
 * Entrada sem senha para a equipe da Imago, quando este app é exibido dentro do
 * Controle Operacional.
 *
 * Os dois sistemas têm projetos Supabase separados — de propósito: este produto
 * é white-label e é a autoridade de identidade dos parceiros das outras
 * clínicas. Fundir daria conta aqui a funcionário da Imago. A ponte é um ticket
 * assinado, não uma sessão compartilhada.
 *
 * ── Como o ticket é pedido ──────────────────────────────────────────────────
 * Exibido lá dentro, este app é servido pelo MESMO domínio do Controle
 * Operacional. Então uma chamada a `/api/sso/ticket/...` sai com o cookie de
 * sessão de lá, e o servidor de lá sabe quem está pedindo. Não passamos token
 * nenhum pela mão, e nada sensível trafega pelo cliente além do ticket — que
 * vive 60 segundos, serve uma vez só e não vale para outro destino.
 *
 * Falhar aqui é normal e silencioso: quem abre o app fora do sistema, ou quem
 * não tem tradução de papel, vê a tela de login de sempre.
 */

/** Nome do módulo no Controle Operacional. Vira o `aud` do ticket. */
const DESTINO = import.meta.env.VITE_SSO_DESTINO || 'scan-parceiros'

/** true = entrou. false = seguir para a tela de login normal. */
export async function tentarEntrarPeloSistema() {
  if (!supabase) return false

  // Só faz sentido embutido. Fora do iframe não há sessão do CO nesta origem, e
  // a chamada abaixo seria uma requisição desperdiçada a cada carregamento.
  let embutido = false
  try { embutido = window.self !== window.top } catch { embutido = true }
  if (!embutido) return false

  try {
    // 1) Pede o ticket ao Controle Operacional. `credentials: 'include'` é o
    //    que leva o cookie de sessão dele.
    // `/api` aqui é do CONTROLE OPERACIONAL, não nosso — e por isso não usa
    // API_BASE. Trocar faria o pedido chegar neste servidor, onde a rota não
    // existe, e o SSO pararia sem erro visível.
    const rTicket = await fetch(`/api/sso/ticket/${DESTINO}`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!rTicket.ok) return false
    const { ticket } = await rTicket.json()
    if (!ticket) return false

    // 2) Entrega o ticket ao NOSSO servidor, que verifica a assinatura com a
    //    chave pública do CO e decide empresa e papel pelas tabelas daqui.
    const rSessao = await fetch(`${API_BASE}/sso/entrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
    })
    if (!rSessao.ok) return false
    const { token_hash } = await rSessao.json()
    if (!token_hash) return false

    // 3) Troca o token de uso único por sessão.
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'email' })
    return !error
  } catch {
    return false
  }
}
