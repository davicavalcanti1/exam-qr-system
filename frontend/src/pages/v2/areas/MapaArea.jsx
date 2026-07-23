import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../../lib/supabase'
import { geocodificar } from '../../../integrations/nominatim/geocode'
import { Card, Button, Loading, useToast } from '../../../components/ui'

const pin = (ativa) => L.divIcon({
  className: '',
  html: `<span style="display:block;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${ativa ? '#0E9E4E' : '#7E8F83'};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)"></span>`,
  iconSize: [18, 18], iconAnchor: [9, 18], popupAnchor: [0, -16],
})

export default function MapaArea() {
  const toast = useToast()
  const [empresas, setEmpresas] = useState(null)
  const [geo, setGeo] = useState(false)
  const [posicionando, setPosicionando] = useState(null) // empresa em modo "clique para posicionar"
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const posRef = useRef(null)
  useEffect(() => { posRef.current = posicionando }, [posicionando])

  async function load() {
    const { data } = await supabase.from('empresas').select('*').order('nome')
    setEmpresas(data || [])
  }
  useEffect(() => { load() }, [])

  async function salvarCoord(id, lat, lng) {
    const { error } = await supabase.from('empresas').update({ lat, lng }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setEmpresas(prev => prev ? prev.map(x => x.id === id ? { ...x, lat, lng } : x) : prev)
  }

  // inicializa o mapa uma vez
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView([-7.23, -35.88], 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    map.on('click', async (ev) => {
      const id = posRef.current
      if (!id) return
      await salvarCoord(id, ev.latlng.lat, ev.latlng.lng)
      setPosicionando(null)
      toast.success('Localização definida.')
    })
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
      const m = L.marker([e.lat, e.lng], { icon: pin(e.status === 'ativa'), draggable: true })
        .bindPopup(`<b>${e.nome_exibicao || e.nome}</b><br>${e.status}${e.endereco ? '<br>' + e.endereco : ''}<br><i style="opacity:.7">arraste para ajustar</i>`)
      m.on('dragend', async () => { const ll = m.getLatLng(); await salvarCoord(e.id, ll.lat, ll.lng); toast.success('Posição atualizada.') })
      m.addTo(layer)
      pts.push([e.lat, e.lng])
    }
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 13 })
    setTimeout(() => map.invalidateSize(), 100)
  }, [empresas])

  async function localizar() {
    const faltando = (empresas || []).filter(e => (e.lat == null || e.lng == null) && e.endereco)
    if (!faltando.length) return toast.error('Nenhuma empresa com endereço e sem localização. Use "posicionar no mapa".')
    setGeo(true)
    let ok = 0
    for (const e of faltando) {
      const c = await geocodificar(e.endereco)
      if (c) { await salvarCoord(e.id, c.lat, c.lng); ok++ }
      await new Promise(r => setTimeout(r, 1100))
    }
    setGeo(false)
    toast[ok ? 'success' : 'error'](`${ok} de ${faltando.length} localizada(s) pelo endereço.${ok < faltando.length ? ' As demais: posicione no mapa.' : ''}`)
  }

  const lista = empresas || []
  const semCoord = lista.filter(e => e.lat == null || e.lng == null)
  const carregando = empresas === null

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold">Mapa das empresas</h3>
          <p className="text-sm text-on-surface-variant">{carregando ? 'carregando…' : `${lista.length} empresa(s)${semCoord.length ? ` · ${semCoord.length} sem localização` : ''}`}</p>
        </div>
        {semCoord.length > 0 && <Button variant="secondary" icon="my_location" onClick={localizar} loading={geo}>Tentar pelo endereço</Button>}
      </Card>

      {semCoord.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold mb-2">Sem localização — clique em uma e depois clique no mapa para posicionar:</p>
          <div className="flex flex-wrap gap-2">
            {semCoord.map(e => (
              <button key={e.id} onClick={() => setPosicionando(posicionando === e.id ? null : e.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold ring-1 transition ${posicionando === e.id ? 'bg-primary text-on-primary ring-primary' : 'bg-surface ring-outline-variant/30 hover:ring-primary'}`}>
                <span className="material-symbols-outlined align-middle" style={{ fontSize: '15px' }}>location_on</span> {e.nome_exibicao || e.nome}
              </button>
            ))}
          </div>
          {posicionando && <p className="text-xs text-primary font-bold mt-2 animate-pulse">👆 Agora clique no mapa para posicionar.</p>}
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div ref={elRef} style={{ height: '64vh', width: '100%', cursor: posicionando ? 'crosshair' : '' }} />
      </Card>
    </div>
  )
}
