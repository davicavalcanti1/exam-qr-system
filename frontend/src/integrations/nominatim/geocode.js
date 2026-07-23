// Geocodificação via OpenStreetMap/Nominatim (grátis, sem key).
// Uso leve (cadastro/edição de empresa). Política do Nominatim: baixo volume.
// Retorna { lat, lng } ou null.

async function consulta(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&countrycodes=br&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const arr = await res.json().catch(() => null)
  const hit = Array.isArray(arr) ? arr[0] : null
  if (!hit) return null
  const lat = Number(hit.lat), lng = Number(hit.lon)
  return (isFinite(lat) && isFinite(lng)) ? { lat, lng } : null
}

export async function geocodificar(endereco) {
  const bruto = String(endereco || '').trim()
  if (!bruto) return null
  // normaliza separadores do nosso formato (· e /) para vírgulas — o Nominatim parseia melhor
  const limpo = bruto.replace(/[·|;]/g, ',').replace(/\//g, ', ').replace(/\s*,\s*/g, ', ').replace(/,\s*,/g, ',').trim()
  const partes = limpo.split(',').map(s => s.trim()).filter(Boolean)
  try {
    // 1) endereço completo (mais preciso)
    let r = await consulta(`${limpo}, Brasil`)
    if (r) return r
    // 2) fallback: só bairro + cidade + UF (últimas partes), ignorando rua/número que às vezes o OSM não tem
    if (partes.length >= 2) {
      const cidade = partes.slice(-3).join(', ')
      await new Promise(res => setTimeout(res, 1100)) // respeita rate-limit do Nominatim
      r = await consulta(`${cidade}, Brasil`)
      if (r) return r
    }
    return null
  } catch {
    return null
  }
}
