// Integração BrasilAPI — consulta de empresa por CNPJ, direto do navegador.
// A BrasilAPI é pública, sem chave e com CORS liberado, então não precisa passar
// pelo backend (evita problema de egress do servidor). Retorna shape normalizado.

export async function buscarCnpj(cnpj) {
  const c = String(cnpj).replace(/\D/g, '')
  if (c.length !== 14) throw new Error('CNPJ deve ter 14 dígitos.')

  let r
  try {
    r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`, { headers: { Accept: 'application/json' } })
  } catch {
    throw new Error('Sem conexão com a BrasilAPI. Verifique a internet.')
  }
  if (r.status === 404) throw new Error('CNPJ não encontrado.')
  if (!r.ok) throw new Error(`BrasilAPI indisponível (HTTP ${r.status}).`)

  const d = await r.json()
  const logr = [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' ')
  const linha = [logr, d.numero, d.complemento].filter(Boolean).join(', ')
  const endereco = [linha, d.bairro, [d.municipio, d.uf].filter(Boolean).join('/'), d.cep].filter(Boolean).join(' · ')
  return {
    cnpj: d.cnpj,
    razaoSocial: d.razao_social || '',
    nomeFantasia: d.nome_fantasia || '',
    endereco,
    telefone: d.ddd_telefone_1 || '',
    email: d.email || '',
    situacao: d.descricao_situacao_cadastral || '',
  }
}
