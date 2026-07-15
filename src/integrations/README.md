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

## Existentes
- **netris/** — agendamento/atendimentos NetRis (Netpacs). `client.js` (factory por
  empresa), `empresa.js` (monta o cliente da config salva), `agendamento.js`
  (resolve exame→plano/procedimento/paciente), `routes.js` (`/api/netris/*`).
- **brasilapi/cnpj/** — consulta de empresa por CNPJ. `routes.js` (`/api/cnpj/:cnpj`).

## Ao adicionar uma integração nova
1. Crie `src/integrations/<provedor>/`.
2. Coloque `client.js` + `routes.js` (e subpastas por recurso, se fizer sentido).
3. Monte o router em `src/app.js`.
4. Credenciais por empresa vão em `integracao_configs` (nunca no frontend); config
   genérica de provedores em `src/lib/integracaoProviders.js`.
