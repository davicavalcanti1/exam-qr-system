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
}

export const MASK = '••••••••'

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
