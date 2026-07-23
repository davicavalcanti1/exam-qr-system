import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../../lib/supabase'
import { geocodificar } from '../../../integrations/nominatim/geocode'
import { Card, Button, Loading, useToast } from '../../../components/ui'

// Marcador em CSS (evita o problema dos ícones-imagem do Leaflet no bundle).
const pin = (ativa) => L.divIcon({
  className: '',
  html: `<span style="display:block;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${ativa ? '#0E9E4E' : '#7E8F83'};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)"></span>`,
  iconSize: [18, 18], iconAnchor: [9, 18], popupAnchor: [0, -16],
})

export default function MapaArea() {
  const toast = useToast()
  const [empresas, setEmpresas] = useState(null)
  const [geo, setGeo] = useState(false)
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  async function load() {
    // select('*') p/ não quebrar se a migration lat/lng ainda não foi aplicada
    const { data } = await supabase.from('empresas').select('*').order('nome')
    setEmpresas(data || [])
  }
  useEffect(() => { load() }, [])

  // inicializa o mapa uma vez
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView([-7.23, -35.88], 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 150)
    return () => { map.remove(); mapRef.current = null; layerRef.current = null }
  }, [])

  // (re)desenha os marcadores quando as empresas mudam
  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current
    if (!map || !layer || !empresas) return
    layer.clearLayers()
    const pts = []
    for (const e of empresas) {
      if (e.lat == null || e.lng == null) continue
      L.marker([e.lat, e.lng], { icon: pin(e.status === 'ativa') })
        .bindPopup(`<b>${e.nome_exibicao || e.nome}</b><br>${e.status}${e.endereco ? '<br>' + e.endereco : ''}`)
        .addTo(layer)
      pts.push([e.lat, e.lng])
    }
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 13 })
    setTimeout(() => map.invalidateSize(), 100)
  }, [empresas])

  async function localizar() {
    const faltando = (empresas || []).filter(e => (e.lat == null || e.lng == null) && e.endereco)
    if (!faltando.length) return toast.error('Nenhuma empresa com endereço e sem localização.')
    setGeo(true)
    let ok = 0
    for (const e of faltando) {
      const c = await geocodificar(e.endereco)
      if (c) { await supabase.from('empresas').update({ lat: c.lat, lng: c.lng }).eq('id', e.id); ok++ }
      await new Promise(r => setTimeout(r, 1100)) // ~1 req/s (política do Nominatim)
    }
    setGeo(false)
    toast.success(`${ok} de ${faltando.length} localizada(s).`)
    load()
  }

  if (empresas === null) return <Loading />
  const semCoord = empresas.filter(e => e.lat == null || e.lng == null).length

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold">Mapa das empresas</h3>
          <p className="text-sm text-on-surface-variant">{empresas.length} empresa(s){semCoord ? ` · ${semCoord} sem localização` : ''}</p>
        </div>
        {semCoord > 0 && <Button icon="my_location" onClick={localizar} loading={geo}>Localizar pelo endereço</Button>}
      </Card>
      <Card className="p-0 overflow-hidden">
        <div ref={elRef} style={{ height: '68vh', width: '100%' }} />
      </Card>
    </div>
  )
}
