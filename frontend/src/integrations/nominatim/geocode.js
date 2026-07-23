// Geocodificação via OpenStreetMap/Nominatim (grátis, sem key).
// Uso leve (cadastro/edição de empresa). Política do Nominatim: baixo volume.
// Retorna { lat, lng } ou null.
export async function geocodificar(endereco) {
  const q = String(endereco || '').trim()
  if (!q) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return null
    const arr = await res.json()
    const hit = Array.isArray(arr) ? arr[0] : null
    if (!hit) return null
    const lat = Number(hit.lat), lng = Number(hit.lon)
    return (isFinite(lat) && isFinite(lng)) ? { lat, lng } : null
  } catch {
    return null
  }
}
