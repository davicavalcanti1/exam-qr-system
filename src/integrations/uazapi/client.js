// ─────────────────────────────────────────────────────────────────────────────
// uazapi — envio de WhatsApp (server-side). Usado para mandar o link de
// confirmação de lote ao parceiro. Credenciais via env (nunca no frontend):
//   UAZAPI_URL     ex.: https://<sua-instancia>.uazapi.com   (ou o host do controleoperacional)
//   UAZAPI_TOKEN   token da instância
//
// OBS: o endpoint/payload abaixo segue o padrão uazapi (POST /send/text, header
// `token`, body {number, text}). Se o controleoperacional usa outro formato,
// ajustar aqui — é o único ponto que muda.
// ─────────────────────────────────────────────────────────────────────────────

export function uazapiConfigurado() {
  return Boolean(process.env.UAZAPI_URL && process.env.UAZAPI_TOKEN)
}

// Normaliza o número para o formato que ESTE uazapi espera: 55 + DDD + 8 dígitos,
// SEM o "nono dígito" de celular. Ex.: "83 98862-5776" (cadastrado normal) → "558388625776".
// Regra interna do mecanismo — invisível no sistema (o número fica salvo como o usuário digitou).
function normalizarNumero(n) {
  let d = String(n || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('55')) d = d.slice(2)              // trabalha com o número nacional
  if (d.length === 11 && d[2] === '9') d = d.slice(0, 2) + d.slice(3) // remove o 9 extra do celular
  return `55${d}`
}

export async function enviarTextoWhatsapp(numero, texto) {
  if (!uazapiConfigurado()) return { ok: false, skipped: true, motivo: 'uazapi não configurado (UAZAPI_URL/UAZAPI_TOKEN)' }
  const num = normalizarNumero(numero)
  if (!num) return { ok: false, motivo: 'número de WhatsApp ausente/inválido' }

  // UAZAPI_URL pode vir como host (…uazapi.com) OU já com o caminho (…/send/text).
  // Mesmo valor usado no controleoperacional funciona aqui.
  const raw = String(process.env.UAZAPI_URL).trim().replace(/^http:\/\//i, 'https://').replace(/\/$/, '')
  const endpoint = /\/send\/text$/i.test(raw) ? raw : `${raw}/send/text`
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: process.env.UAZAPI_TOKEN },
      body: JSON.stringify({ number: num, text: texto }),
    })
    const body = await res.text().catch(() => '')
    return { ok: res.ok, status: res.status, body }
  } catch (e) {
    return { ok: false, motivo: e.message }
  }
}
