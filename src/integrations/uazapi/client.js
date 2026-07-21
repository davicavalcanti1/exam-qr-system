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

// Normaliza o número para dígitos com DDI 55 (Brasil) por padrão.
function normalizarNumero(n) {
  const d = String(n || '').replace(/\D/g, '')
  if (!d) return ''
  return d.startsWith('55') ? d : `55${d}`
}

export async function enviarTextoWhatsapp(numero, texto) {
  if (!uazapiConfigurado()) return { ok: false, skipped: true, motivo: 'uazapi não configurado (UAZAPI_URL/UAZAPI_TOKEN)' }
  const num = normalizarNumero(numero)
  if (!num) return { ok: false, motivo: 'número de WhatsApp ausente/inválido' }

  const base = String(process.env.UAZAPI_URL).trim().replace(/\/$/, '').replace(/^http:\/\//i, 'https://')
  try {
    const res = await fetch(`${base}/send/text`, {
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
