// Paleta ExameQR — bandeira de Campina Grande (verde + ouro), tons pastel/neon.
// Os tokens Material mantêm as MESMAS chaves de antes; só mudam os valores,
// então todos os componentes herdam a nova cara sem edição individual.

// Rampa verde usada também para sobrescrever indigo/blue/violet/purple,
// de modo que qualquer classe hardcoded (ex: text-indigo-700) vire verde.
const verde = {
  50: '#ECFDF3',
  100: '#D1F5E0',
  200: '#A7EBC5',
  300: '#6FDDA1',
  400: '#34CD7C',
  500: '#16B85E',
  600: '#0E9E4E',
  700: '#0C7E3E',
  800: '#0C5F30',
  900: '#0E4A28',
  950: '#123524',
}

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // escalas padrão remapeadas para verde (mata todo azul/roxo hardcoded)
        indigo: verde,
        blue: verde,
        violet: verde,
        purple: verde,

        // ── Tokens Material (mesmas chaves, valores Campina) ──
        "background": "#FBFCF8",
        "surface": "#FBFCF8",
        "surface-bright": "#FBFCF8",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#F1FAF4",
        "surface-container": "#EAF7EF",
        "surface-container-high": "#DFF3E7",
        "surface-container-highest": "#D3EEDD",
        "surface-dim": "#D3E4D8",
        "surface-variant": "#E3F0E7",
        "surface-tint": "#16B85E",

        "on-background": "#123524",
        "on-surface": "#123524",
        "on-surface-variant": "#4E6155",
        "outline": "#7E8F83",
        "outline-variant": "#C9DACE",

        "primary": "#0E9E4E",
        "on-primary": "#ffffff",
        "primary-container": "#16B85E",
        "on-primary-container": "#E9FCEF",
        "primary-fixed": "#CFF5DE",
        "primary-fixed-dim": "#A7EBC5",
        "on-primary-fixed": "#06371C",
        "on-primary-fixed-variant": "#0C7E3E",
        "inverse-primary": "#6FDDA1",

        // secundária = ouro da bandeira
        "secondary": "#B78A00",
        "on-secondary": "#2E2400",
        "secondary-container": "#FBF1B8",
        "on-secondary-container": "#5C4A00",
        "secondary-fixed": "#FBF1B8",
        "secondary-fixed-dim": "#F4E08A",
        "on-secondary-fixed": "#241C00",
        "on-secondary-fixed-variant": "#6B5300",

        // terciária = verde de apoio
        "tertiary": "#0C7E3E",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#CFF5DE",
        "on-tertiary-container": "#06371C",
        "tertiary-fixed": "#B7F2CF",
        "tertiary-fixed-dim": "#6FDDA1",
        "on-tertiary-fixed": "#052616",
        "on-tertiary-fixed-variant": "#0C5F30",

        // erro / bloqueio = coral
        "error": "#D93A2B",
        "on-error": "#ffffff",
        "error-container": "#FFDAD5",
        "on-error-container": "#B23124",

        "inverse-surface": "#0E2A1A",
        "inverse-on-surface": "#E9F7EE",
      },
      fontFamily: {
        headline: ['Fustat', 'Inter', 'sans-serif'],
        display: ['Fustat', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        sm: '4px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 20px 40px -10px rgba(18,53,36,0.08)',
      }
    },
  },
  plugins: [],
}
