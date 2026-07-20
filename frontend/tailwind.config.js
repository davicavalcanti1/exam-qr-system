// Paleta ExameQR — Campina Grande (verde + ouro).
// Os tokens Material agora são VARIÁVEIS CSS (definidas em index.css para claro/escuro),
// então todo o app adapta ao tema sem editar componente. Formato "R G B" p/ suportar
// modificadores de opacidade do Tailwind (ex.: bg-primary/10).

const verde = {
  50: '#ECFDF3', 100: '#D1F5E0', 200: '#A7EBC5', 300: '#6FDDA1', 400: '#34CD7C',
  500: '#16B85E', 600: '#0E9E4E', 700: '#0C7E3E', 800: '#0C5F30', 900: '#0E4A28', 950: '#123524',
}
const ouro = {
  50: '#FEF9E7', 100: '#FBF1B8', 200: '#F7E48A', 300: '#F2D24E', 400: '#FFCE1F',
  500: '#E8B90A', 600: '#C08A00', 700: '#9A6E00', 800: '#7A5700', 900: '#5F4400', 950: '#3D2C00',
}
const t = (name) => `rgb(var(${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        indigo: verde, blue: verde, violet: verde, purple: verde,
        yellow: ouro, amber: ouro,

        background: t('--background'),
        surface: t('--surface'),
        'surface-bright': t('--surface-bright'),
        'surface-container-lowest': t('--surface-container-lowest'),
        'surface-container-low': t('--surface-container-low'),
        'surface-container': t('--surface-container'),
        'surface-container-high': t('--surface-container-high'),
        'surface-container-highest': t('--surface-container-highest'),
        'surface-dim': t('--surface-dim'),
        'surface-variant': t('--surface-variant'),
        'surface-tint': t('--primary'),

        'on-background': t('--on-surface'),
        'on-surface': t('--on-surface'),
        'on-surface-variant': t('--on-surface-variant'),
        outline: t('--outline'),
        'outline-variant': t('--outline-variant'),

        primary: t('--primary'),
        'on-primary': t('--on-primary'),
        'primary-container': t('--primary-container'),
        'on-primary-container': t('--on-primary-container'),
        'primary-fixed': t('--primary-fixed'),
        'primary-fixed-dim': t('--primary-fixed-dim'),
        'on-primary-fixed': t('--on-primary-fixed'),
        'on-primary-fixed-variant': t('--on-primary-fixed-variant'),
        'inverse-primary': t('--inverse-primary'),

        secondary: t('--secondary'),
        'on-secondary': t('--on-secondary'),
        'secondary-container': t('--secondary-container'),
        'on-secondary-container': t('--on-secondary-container'),
        'secondary-fixed': t('--secondary-container'),
        'secondary-fixed-dim': t('--secondary-fixed-dim'),
        'on-secondary-fixed': t('--on-secondary-fixed'),
        'on-secondary-fixed-variant': t('--on-secondary-fixed-variant'),

        tertiary: t('--tertiary'),
        'on-tertiary': t('--on-primary'),
        'tertiary-container': t('--primary-fixed'),
        'on-tertiary-container': t('--on-primary-fixed'),
        'tertiary-fixed': t('--tertiary-fixed'),
        'tertiary-fixed-dim': t('--tertiary-fixed-dim'),
        'on-tertiary-fixed': t('--on-tertiary-fixed'),
        'on-tertiary-fixed-variant': t('--on-tertiary-fixed-variant'),

        error: t('--error'),
        'on-error': t('--on-error'),
        'error-container': t('--error-container'),
        'on-error-container': t('--on-error-container'),

        'inverse-surface': t('--inverse-surface'),
        'inverse-on-surface': t('--inverse-on-surface'),
      },
      fontFamily: {
        headline: ['Fustat', 'Inter', 'sans-serif'],
        display: ['Fustat', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '0.125rem', sm: '4px', lg: '8px', xl: '12px', '2xl': '16px', '3xl': '24px', full: '9999px' },
      boxShadow: { card: '0 20px 40px -10px rgba(18,53,36,0.08)' },
    },
  },
  plugins: [],
}
