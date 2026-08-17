import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { subConfig } from '../../lib/integracaoProviders.js'
import { createFocusNfseClient } from './client.js'

const soDigitos = (v) => String(v || '').replace(/\D/g, '')

// Carrega a config fiscal de uma empresa + o token da Focy (integracao_configs,
// sob a chave 'focusnfe') e devolve { client, empresa } — ou { erro } explicando
// o que falta. Não acende nada se nfse_ativo estiver desligado.
export async function nfseParaEmpresa(empresaId) {
  if (!supabaseAdmin || !empresaId) return { erro: 'empresa inválida' }

  const { data: empresa } = await supabaseAdmin
    .from('empresas')
    .select('id, nome, cnpj, nfse_ativo, nfse_provedor, nfse_ambiente, nfse_inscricao_municipal, nfse_codigo_municipio, nfse_item_lista_servico, nfse_codigo_tributario, nfse_cnae, nfse_aliquota_iss, nfse_iss_retido')
    .eq('id', empresaId)
    .maybeSingle()

  if (!empresa) return { erro: 'empresa não encontrada' }
  if (!empresa.nfse_ativo) return { erro: 'Emissão de NFS-e não está ativa para esta empresa.' }

  const { data: cfg } = await supabaseAdmin
    .from('integracao_configs').select('config').eq('empresa_id', empresaId).maybeSingle()
  const token = subConfig(cfg?.config, 'focusnfe')?.token
  if (!token) return { erro: 'Token do provedor de NFS-e não configurado.' }

  // Campos mínimos do prestador pra sequer tentar emitir.
  const faltando = []
  if (!empresa.cnpj) faltando.push('CNPJ da empresa')
  if (!empresa.nfse_inscricao_municipal) faltando.push('inscrição municipal')
  if (!empresa.nfse_codigo_municipio) faltando.push('código do município (IBGE)')
  if (!empresa.nfse_item_lista_servico) faltando.push('código de serviço (LC 116/2003)')
  if (empresa.nfse_aliquota_iss == null) faltando.push('alíquota ISS')
  if (faltando.length) return { erro: 'Config fiscal incompleta: ' + faltando.join('; ') }

  try {
    const client = createFocusNfseClient({ token, ambiente: empresa.nfse_ambiente || 'homologacao' })
    return { client, empresa }
  } catch (e) {
    return { erro: e.message }
  }
}

// Monta o corpo de emissão da Focus a partir de empresa (prestador) + parceiro
// (tomador) + cobrança (valor/período). Endereço do tomador é best-effort: hoje
// `parceiros.endereco` é texto único e não estruturado — mandamos o que dá e o
// WebISS/Focy diz na resposta o que faltar (mesma estratégia de descoberta do NetRis).
export function montarPayloadNfse({ empresa, parceiro, cobranca }) {
  const docTomador = soDigitos(parceiro.documento)
  const ehCnpj = (parceiro.tipo_documento === 'cnpj') || docTomador.length === 14

  const periodo = [cobranca.periodo_inicio, cobranca.periodo_fim].filter(Boolean).join(' a ')
  const discriminacao =
    `Exames realizados por parceria — ${parceiro.nome}` +
    (periodo ? ` — período ${periodo}` : '') +
    (cobranca.qtd_exames ? ` — ${cobranca.qtd_exames} exame(s)` : '')

  const tomador = {
    razao_social: parceiro.nome,
    ...(ehCnpj ? { cnpj: docTomador } : { cpf: docTomador }),
    ...(parceiro.email ? { email: parceiro.email } : {}),
  }

  return {
    prestador: {
      cnpj: soDigitos(empresa.cnpj),
      inscricao_municipal: empresa.nfse_inscricao_municipal,
      codigo_municipio: empresa.nfse_codigo_municipio,
    },
    tomador,
    servico: {
      valor_servicos: Number(cobranca.valor_total || 0),
      aliquota: Number(empresa.nfse_aliquota_iss || 0),
      iss_retido: !!empresa.nfse_iss_retido,
      item_lista_servico: empresa.nfse_item_lista_servico,
      ...(empresa.nfse_codigo_tributario ? { codigo_tributario_municipio: empresa.nfse_codigo_tributario } : {}),
      ...(empresa.nfse_cnae ? { cnae: empresa.nfse_cnae } : {}),
      discriminacao,
    },
  }
}
