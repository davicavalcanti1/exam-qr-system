// Paletas de cor de destaque (accent). Cada uma sobrescreve a família --primary
// via variáveis CSS inline no <html> (vale para claro e escuro). 'verde' é o padrão
// (usa o que está na folha de estilo). Formato "R G B" p/ casar com rgb(var/alpha).

const KEYS = ['--primary', '--primary-container', '--on-primary', '--primary-fixed', '--primary-fixed-dim', '--on-primary-fixed', '--on-primary-fixed-variant']

export const PALETAS = [
  { k: 'verde',    label: 'Verde',    cor: '#0E9E4E', vars: null },
  { k: 'azul',     label: 'Azul',     cor: '#2563EB', vars: v('37 99 235', '29 78 216', '255 255 255', '219 234 254', '147 197 253', '10 37 64', '29 78 216') },
  { k: 'vermelho', label: 'Vermelho', cor: '#DC2626', vars: v('220 38 38', '185 28 28', '255 255 255', '254 226 226', '252 165 165', '92 10 10', '185 28 28') },
  { k: 'amarelo',  label: 'Amarelo',  cor: '#EAB308', vars: v('234 179 8', '202 154 4', '58 46 0', '254 249 195', '253 224 71', '66 32 6', '133 77 14') },
  { k: 'laranja',  label: 'Laranja',  cor: '#EA580C', vars: v('234 88 12', '194 65 12', '255 255 255', '255 237 213', '253 186 116', '74 29 5', '194 65 12') },
  { k: 'roxo',     label: 'Roxo',     cor: '#7C3AED', vars: v('124 58 237', '109 40 217', '255 255 255', '237 233 254', '196 181 253', '46 16 101', '109 40 217') },
  { k: 'rosa',     label: 'Rosa',     cor: '#DB2777', vars: v('219 39 119', '190 24 93', '255 255 255', '252 231 243', '249 168 212', '80 7 36', '190 24 93') },
  { k: 'preto',    label: 'Preto',    cor: '#1F2937', vars: v('31 41 55', '17 24 39', '255 255 255', '229 231 235', '156 163 175', '17 24 39', '55 65 81') },
  { k: 'branco',   label: 'Neutro',   cor: '#E5E7EB', vars: v('229 231 235', '209 213 219', '31 41 55', '243 244 246', '229 231 235', '31 41 55', '55 65 81') },
]

function v(primary, container, onPrimary, fixed, fixedDim, onFixed, onFixedVar) {
  return {
    '--primary': primary, '--primary-container': container, '--on-primary': onPrimary,
    '--primary-fixed': fixed, '--primary-fixed-dim': fixedDim,
    '--on-primary-fixed': onFixed, '--on-primary-fixed-variant': onFixedVar,
  }
}

export function aplicarPaleta(k) {
  const p = PALETAS.find(x => x.k === k) || PALETAS[0]
  const s = document.documentElement.style
  if (!p.vars) KEYS.forEach(key => s.removeProperty(key))
  else KEYS.forEach(key => s.setProperty(key, p.vars[key]))
}
