// Paletas de cor de destaque (accent), calibradas por tema.
// Cada paleta define a família --primary para CLARO e ESCURO. Injetamos regras
//   :root[data-accent="k"]        { ...claro... }
//   :root[data-accent="k"].dark   { ...escuro... }
// e só trocamos document.documentElement.dataset.accent — o CSS escolhe a
// variante conforme o tema (a classe .dark). 'verde' é o padrão (folha base).
// Valores "R G B" p/ casar com rgb(var(--x) / <alpha-value>).

const F = ['--primary', '--primary-container', '--on-primary', '--primary-fixed', '--primary-fixed-dim', '--on-primary-fixed', '--on-primary-fixed-variant']
const set = (arr) => Object.fromEntries(F.map((k, i) => [k, arr[i]]))

export const PALETAS = [
  { k: 'verde', label: 'Verde', cor: '#0E9E4E' }, // padrão: usa a folha base (claro/escuro já calibrados)
  {
    k: 'azul', label: 'Azul', cor: '#2563EB',
    light: set(['37 99 235', '29 78 216', '255 255 255', '219 234 254', '147 197 253', '10 37 64', '29 78 216']),
    dark:  set(['96 165 250', '59 130 246', '10 37 64', '30 58 138', '59 130 246', '219 234 254', '147 197 253']),
  },
  {
    k: 'vermelho', label: 'Vermelho', cor: '#DC2626',
    light: set(['220 38 38', '185 28 28', '255 255 255', '254 226 226', '252 165 165', '92 10 10', '185 28 28']),
    dark:  set(['248 113 113', '239 68 68', '74 4 4', '127 29 29', '239 68 68', '254 226 226', '252 165 165']),
  },
  {
    k: 'amarelo', label: 'Amarelo', cor: '#EAB308',
    light: set(['234 179 8', '202 154 4', '58 46 0', '254 249 195', '253 224 71', '66 32 6', '133 77 14']),
    dark:  set(['250 204 21', '234 179 8', '66 32 6', '113 63 18', '202 138 4', '254 249 195', '253 224 71']),
  },
  {
    k: 'laranja', label: 'Laranja', cor: '#EA580C',
    light: set(['234 88 12', '194 65 12', '255 255 255', '255 237 213', '253 186 116', '74 29 5', '194 65 12']),
    dark:  set(['251 146 60', '249 115 22', '67 20 7', '124 45 18', '249 115 22', '255 237 213', '253 186 116']),
  },
  {
    k: 'roxo', label: 'Roxo', cor: '#7C3AED',
    light: set(['124 58 237', '109 40 217', '255 255 255', '237 233 254', '196 181 253', '46 16 101', '109 40 217']),
    dark:  set(['167 139 250', '139 92 246', '46 16 101', '76 29 149', '139 92 246', '237 233 254', '196 181 253']),
  },
  {
    k: 'rosa', label: 'Rosa', cor: '#DB2777',
    light: set(['219 39 119', '190 24 93', '255 255 255', '252 231 243', '249 168 212', '80 7 36', '190 24 93']),
    dark:  set(['244 114 182', '236 72 153', '80 7 36', '131 24 67', '236 72 153', '252 231 243', '249 168 212']),
  },
  {
    k: 'preto', label: 'Preto', cor: '#1F2937',
    light: set(['31 41 55', '17 24 39', '255 255 255', '229 231 235', '156 163 175', '17 24 39', '55 65 81']),
    dark:  set(['229 231 235', '209 213 219', '17 24 39', '55 65 81', '107 114 128', '243 244 246', '209 213 219']),
  },
  {
    k: 'branco', label: 'Neutro', cor: '#9CA3AF',
    light: set(['107 114 128', '75 85 99', '255 255 255', '243 244 246', '209 213 219', '31 41 55', '75 85 99']),
    dark:  set(['209 213 219', '156 163 175', '31 41 55', '55 65 81', '107 114 128', '243 244 246', '209 213 219']),
  },
]

const decl = (o) => F.map(k => `${k}:${o[k]}`).join(';')

let injetado = false
function garantirEstilo() {
  if (injetado || typeof document === 'undefined') return
  const css = PALETAS.filter(p => p.light).map(p =>
    `:root[data-accent="${p.k}"]{${decl(p.light)}}\n:root[data-accent="${p.k}"].dark{${decl(p.dark)}}`
  ).join('\n')
  const el = document.createElement('style')
  el.id = 'accent-palettes'
  el.textContent = css
  document.head.appendChild(el)
  injetado = true
}

export function aplicarPaleta(k) {
  garantirEstilo()
  if (typeof document === 'undefined') return
  if (!k || k === 'verde') delete document.documentElement.dataset.accent
  else document.documentElement.dataset.accent = k
}
