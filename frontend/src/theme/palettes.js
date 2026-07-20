// Paletas de cor de destaque, calibradas por tema. Cada paleta define:
//  - a família --primary (botões/acento), ajustada à mão para claro e escuro;
//  - a rampa de SUPERFÍCIES (fundo, cards, texto, bordas) tingida com o MATIZ da
//    cor, gerada a partir de um hue (para o fundo "puxar" pro azul/vermelho/etc.).
// Injetamos regras :root[data-accent="k"] e :root[data-accent="k"].dark e só
// trocamos document.documentElement.dataset.accent — o CSS pega a variante do tema.
// 'verde' é o padrão (usa a folha base, já calibrada). Valores "R G B".

const PRIM = ['--primary', '--primary-container', '--on-primary', '--primary-fixed', '--primary-fixed-dim', '--on-primary-fixed', '--on-primary-fixed-variant']
const prim = (arr) => Object.fromEntries(PRIM.map((k, i) => [k, arr[i]]))

// hsl -> "R G B" (h em graus, s/l em %).
function hsl(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => { const k = (n + h / 30) % 12; const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * c) }
  return `${f(0)} ${f(8)} ${f(4)}`
}

// Rampa de superfícies (L, S por token). Reproduz o "peso" do tema base, mas no matiz da cor.
const LIGHT = [
  ['--background', 98.5, 22], ['--surface', 98.5, 22], ['--surface-bright', 98.5, 22],
  ['--surface-container-lowest', 100, 40], ['--surface-container-low', 97, 28],
  ['--surface-container', 95.5, 30], ['--surface-container-high', 93.5, 32],
  ['--surface-container-highest', 91, 34], ['--surface-dim', 88, 24], ['--surface-variant', 93, 22],
  ['--on-surface', 16, 40], ['--on-surface-variant', 36, 18], ['--outline', 56, 12], ['--outline-variant', 84, 20],
]
const DARK = [
  ['--background', 7.5, 20], ['--surface', 8, 20], ['--surface-bright', 14.5, 14],
  ['--surface-container-lowest', 10.5, 16], ['--surface-container-low', 9.5, 16],
  ['--surface-container', 12, 15], ['--surface-container-high', 14.5, 14],
  ['--surface-container-highest', 17.5, 13], ['--surface-dim', 6.5, 20], ['--surface-variant', 18.5, 13],
  ['--on-surface', 94, 14], ['--on-surface-variant', 70, 10], ['--outline', 47, 8], ['--outline-variant', 24, 11],
]
const ramp = (h, satK, ladder) => Object.fromEntries(ladder.map(([k, l, s]) => [k, hsl(h, s * satK, l)]))

// Cada paleta: hue (matiz das superfícies), satK (intensidade do tom), e a família primary por tema.
const DEFS = [
  { k: 'azul', label: 'Azul', cor: '#2563EB', hue: 217, satK: 1,
    light: ['37 99 235', '29 78 216', '255 255 255', '219 234 254', '147 197 253', '10 37 64', '29 78 216'],
    dark:  ['96 165 250', '59 130 246', '10 37 64', '30 58 138', '59 130 246', '219 234 254', '147 197 253'] },
  { k: 'vermelho', label: 'Vermelho', cor: '#DC2626', hue: 2, satK: 1,
    light: ['220 38 38', '185 28 28', '255 255 255', '254 226 226', '252 165 165', '92 10 10', '185 28 28'],
    dark:  ['248 113 113', '239 68 68', '74 4 4', '127 29 29', '239 68 68', '254 226 226', '252 165 165'] },
  { k: 'amarelo', label: 'Amarelo', cor: '#EAB308', hue: 45, satK: 0.9,
    light: ['234 179 8', '202 154 4', '58 46 0', '254 249 195', '253 224 71', '66 32 6', '133 77 14'],
    dark:  ['250 204 21', '234 179 8', '66 32 6', '113 63 18', '202 138 4', '254 249 195', '253 224 71'] },
  { k: 'laranja', label: 'Laranja', cor: '#EA580C', hue: 25, satK: 1,
    light: ['234 88 12', '194 65 12', '255 255 255', '255 237 213', '253 186 116', '74 29 5', '194 65 12'],
    dark:  ['251 146 60', '249 115 22', '67 20 7', '124 45 18', '249 115 22', '255 237 213', '253 186 116'] },
  { k: 'roxo', label: 'Roxo', cor: '#7C3AED', hue: 262, satK: 1,
    light: ['124 58 237', '109 40 217', '255 255 255', '237 233 254', '196 181 253', '46 16 101', '109 40 217'],
    dark:  ['167 139 250', '139 92 246', '46 16 101', '76 29 149', '139 92 246', '237 233 254', '196 181 253'] },
  { k: 'rosa', label: 'Rosa', cor: '#DB2777', hue: 330, satK: 1,
    light: ['219 39 119', '190 24 93', '255 255 255', '252 231 243', '249 168 212', '80 7 36', '190 24 93'],
    dark:  ['244 114 182', '236 72 153', '80 7 36', '131 24 67', '236 72 153', '252 231 243', '249 168 212'] },
  { k: 'preto', label: 'Preto', cor: '#1F2937', hue: 220, satK: 0.12,
    light: ['31 41 55', '17 24 39', '255 255 255', '229 231 235', '156 163 175', '17 24 39', '55 65 81'],
    dark:  ['229 231 235', '209 213 219', '17 24 39', '55 65 81', '107 114 128', '243 244 246', '209 213 219'] },
  { k: 'branco', label: 'Neutro', cor: '#9CA3AF', hue: 220, satK: 0.08,
    light: ['107 114 128', '75 85 99', '255 255 255', '243 244 246', '209 213 219', '31 41 55', '75 85 99'],
    dark:  ['209 213 219', '156 163 175', '31 41 55', '55 65 81', '107 114 128', '243 244 246', '209 213 219'] },
]

export const PALETAS = [
  { k: 'verde', label: 'Verde', cor: '#0E9E4E' }, // padrão: folha base
  ...DEFS.map(d => ({
    k: d.k, label: d.label, cor: d.cor,
    light: { ...prim(d.light), ...ramp(d.hue, d.satK, LIGHT) },
    dark: { ...prim(d.dark), ...ramp(d.hue, d.satK, DARK) },
  })),
]

const decl = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(';')

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
