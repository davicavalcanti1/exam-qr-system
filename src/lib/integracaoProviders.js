// Registro central de provedores de agendamento. Para adicionar um novo método,
// basta acrescentar uma entrada aqui (label + campos). O frontend consome a
// versão pública deste registro (sem lógica), o backend usa os campos `secret`
// para mascarar credenciais.

export const PROVIDERS = {
  manual: {
    label: 'Manual (interno)',
    descricao: 'Agendamento só dentro do ExameQR (data e horário digitados). Sem integração externa.',
    fields: [],
  },
  netris: {
    label: 'NetRis (Netpacs)',
    descricao: 'Marca o exame direto no NetRis/Netpacs da clínica.',
    fields: [
      { key: 'baseUrl', label: 'URL base da API', type: 'text', placeholder: 'https://.../netris/api' },
      { key: 'token', label: 'Token de acesso', type: 'password', secret: true },
      { key: 'idPlanoConvenio', label: 'ID do plano/convênio', type: 'text' },
      { key: 'idUnidade', label: 'ID da unidade', type: 'text' },
    ],
  },
  feegow: {
    label: 'Feegow Clinic',
    descricao: 'Integra com o Feegow Clinic da clínica (API pública, token x-access-token).',
    fields: [
      { key: 'baseUrl', label: 'URL base da API', type: 'text', placeholder: 'https://api.feegow.com/v1' },
      { key: 'token', label: 'x-access-token', type: 'password', secret: true },
      { key: 'localId', label: 'ID da unidade (local_id)', type: 'text' },
      { key: 'motivoCancelamentoId', label: 'ID do motivo de cancelamento padrão (motivo_id)', type: 'text' },
    ],
  },
}

export const MASK = '••••••••'

// Integrações que também moram no mapa `config` mas NÃO são métodos de
// agendamento — vivem em eixo próprio (a empresa pode usar NetRis para agenda e
// ZapSign para assinatura ao mesmo tempo). Elas não entram em PROVIDERS porque
// não devem aparecer como opção de "como esta clínica marca exame", mas precisam
// ser conhecidas aqui para que ninguém as trate como config solta.
export const CHAVES_NAO_AGENDA = ['zapsign', 'asaas']

export const CHAVES_CONHECIDAS = [...Object.keys(PROVIDERS), ...CHAVES_NAO_AGENDA]

// config é um mapa { netris: {...}, feegow: {...}, zapsign: {...} }. Devolve a
// sub-config do provedor pedido; tolera o formato antigo (plano) de linhas ainda
// não migradas.
export function subConfig(config, provider) {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    if (config[provider] && typeof config[provider] === 'object') return config[provider]
    // Formato antigo plano: nenhuma chave de provedor conhecida → o objeto todo
    // É a config do provedor ativo.
    //
    // A checagem precisa cobrir TODAS as chaves conhecidas, não só as de agenda:
    // com um mapa `{ zapsign: {...} }`, testar apenas netris/feegow/manual dava
    // "formato antigo" e devolvia a config do ZapSign como se fosse a do NetRis
    // — foi assim que a emissão de NFS-e saía autenticada com o token do NetRis.
    if (!CHAVES_CONHECIDAS.some(k => k in config)) return config
  }
  return {}
}

// Registro seguro para o frontend (sem nada sensível — só rótulos/campos).
export function providersPublicos() {
  return Object.fromEntries(
    Object.entries(PROVIDERS).map(([k, v]) => [k, {
      label: v.label,
      descricao: v.descricao,
      fields: v.fields.map(f => ({ key: f.key, label: f.label, type: f.type, placeholder: f.placeholder || '', secret: !!f.secret })),
    }])
  )
}

// Mascara campos secretos de um config antes de devolver ao frontend.
export function mascarar(provider, config = {}) {
  const def = PROVIDERS[provider]
  if (!def) return {}
  const out = {}
  for (const f of def.fields) {
    const v = config[f.key]
    out[f.key] = f.secret ? (v ? MASK : '') : (v ?? '')
  }
  return out
}

// Mescla o config recebido com o salvo: se um campo secreto vier como MASK,
// mantém o valor antigo (o usuário não reescreveu a credencial).
export function mesclar(provider, salvo = {}, recebido = {}) {
  const def = PROVIDERS[provider]
  if (!def) return {}
  const out = {}
  for (const f of def.fields) {
    const novo = recebido[f.key]
    if (f.secret && (novo === MASK || novo === undefined)) out[f.key] = salvo[f.key] ?? ''
    else out[f.key] = novo ?? ''
  }
  return out
}
