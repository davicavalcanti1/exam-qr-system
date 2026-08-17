# Integrações externas

Cada serviço externo tem sua **pasta dedicada** aqui, pra manter o código organizado
e óbvio. Nada de arquivo de integração solto em `lib/` ou `routes/`.

## Convenção
```
src/integrations/
  <provedor>/            ← ex.: netris, brasilapi, zapsign, asaas
    <recurso>/           ← (opcional) subpasta por recurso, ex.: brasilapi/cnpj
    client.js            ← cliente HTTP / SDK do provedor
    routes.js            ← rotas Express expostas ao app
    <outros>.js          ← helpers específicos do provedor
```
As rotas são montadas em `src/app.js` (`app.use('/api/...', <router>)`).

## Existentes (backend)
- **netris/** — agendamento/atendimentos NetRis (Netpacs). `client.js` (factory por
  empresa), `empresa.js` (monta o cliente da config salva), `agendamento.js`
  (resolve exame→plano/procedimento/paciente), `routes.js` (`/api/netris/*`).
- **feegow/** — mesma interface do NetRis para clínicas que usam Feegow Clinic.
  Esqueleto: o shape das respostas ainda não foi confirmado com token real.
- **zapsign/** — assinatura eletrônica do contrato de parceria e do DPA.
  `client.js` (API v1 + `testarToken`), `empresa.js` (config por empresa e
  resolução do webhook pelo segredo), `routes.js` (`/api/zapsign/*`). O PDF é
  montado no servidor com `src/utils/documentoPdf.js`. Ver `docs/ZAPSIGN.md`.
- **uazapi/** — envio por WhatsApp (link do lote de autorização e comprovantes em
  PDF). Só `client.js`: é chamado de dentro de outras rotas, não expõe router.
  **Atenção:** hoje é single-tenant (`UAZAPI_URL`/`UAZAPI_TOKEN` globais).

> Os dois eixos não se confundem: `netris`/`feegow` são **métodos de agendamento**
> (a empresa escolhe um, e ele aparece em `PROVIDERS`); `zapsign` é **assinatura**
> e roda em paralelo a qualquer um deles. Por isso `integracaoProviders.js` separa
> `PROVIDERS` de `CHAVES_NAO_AGENDA` — misturar os dois foi o que fazia salvar o
> agendamento apagar a credencial da outra integração.

## Integrações no frontend
Serviços públicos, sem chave e com CORS (não precisam do backend) vivem em
`frontend/src/integrations/<provedor>/`:
- **brasilapi/cnpj.js** — consulta de empresa por CNPJ direto do navegador
  (evita egress do servidor). Usada no cadastro de empresa/parceiro.

## Ao adicionar uma integração nova
1. Crie `src/integrations/<provedor>/`.
2. Coloque `client.js` + `routes.js` (e subpastas por recurso, se fizer sentido).
3. Monte o router em `src/app.js`.
4. Credenciais por empresa vão em `integracao_configs` (nunca no frontend); config
   genérica de provedores em `src/lib/integracaoProviders.js`.
