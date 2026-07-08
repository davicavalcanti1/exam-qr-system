# Borborá — Escopo do MVP

> Documento vivo. v0.1 — 08/jul/2026. Deriva de [VISION.md](./VISION.md).

## Objetivo do MVP

Fechar o **núcleo financeiro** do controle de exames por parceria: o valor do exame só
entra na conta do parceiro **quando o QR é escaneado e o exame confirmado**, o teto trava
automaticamente quando estoura, e o gestor da clínica consegue **registrar pagamentos** que
liberam o teto de volta.

## Decisões travadas

- **Nome/marca:** Borborá (identidade em andamento).
- **Paleta:** cores da **bandeira de Campina Grande** (verde + amarelo/ouro), adaptadas
  para tons mais claros — mistura de **pastéis e neons**. Sem azul.
- **Modelo financeiro:** teto = limite de crédito rotativo; só reseta com pagamento.
- **Débito:** ocorre **no scan do uso `exam`** (exame confirmado), nunca na geração do QR.
- **Valor:** debita o **valor cheio** do(s) exame(s) do paciente. *(Desconto por parceiro
  fica para depois — o "instituto com desconto" será tratado em fase futura.)*
- **Bloqueio:** ao atingir/estourar o teto (por exames realizados) o parceiro fica bloqueado
  para emitir novos QRs e "pendente de pagamento".

## MoSCoW

### Must (entra no MVP)
- [ ] **Corrigir débito**: `committed` conta exames apenas quando o uso `exam` foi escaneado.
- [ ] **Registrar pagamento pela clínica**: gestor lança pagamento (abate a dívida, libera teto).
- [ ] **Bloqueio automático** ao estourar o teto (já derivado; validar ponta a ponta).
- [ ] **Tela Detalhe do Parceiro**: extrato de exames confirmados, dívida × teto, botão de pagamento.
- [ ] **Paleta nova** aplicada no frontend (amarelo/azul/verde).

### Should
- [ ] Nav "Financeiro" da clínica (hoje "em breve") ligada a uma visão consolidada de recebíveis.
- [ ] Indicador claro de "confirmado" vs "aguardando exame" na lista de pacientes.

### Could
- [ ] Gestão de Cotas (ajuste de teto em massa), Autorizações.

### Won't (agora)
- Multi-empresa (multi-tenant), cobrança/fatura em PDF, custo de transporte/lanche,
  desconto por parceiro, módulo de suporte.

## Paleta (tokens propostos) — bandeira de Campina Grande, tons claros

Base: verde + amarelo/ouro da bandeira, adaptados para pastel/neon. Branco como neutro.
Coral entra só como cor semântica de atenção/bloqueio.

| Papel | Cor | Hex |
|-------|-----|-----|
| Primária · ação / dinheiro / confirmado | Verde neon | `#22D66B` |
| Fundo suave / chips (verde) | Verde pastel | `#CFF5DE` |
| Destaque · energia / o teto | Amarelo neon | `#FFDD2D` |
| Fundo destaque (amarelo) | Amarelo pastel | `#FBF1B8` |
| Atenção / bloqueado (cor extra) | Coral | `#FF6B5C` |
| Tinta · textos | Verde-escuro | `#123524` |
| Fundo | Branco osso | `#FBFCF8` |

## Fora de escopo do MVP (backlog)
Autorizações (fluxo a definir), repensar os "3 usos" do QR, multi-tenant, cobrança formal.
