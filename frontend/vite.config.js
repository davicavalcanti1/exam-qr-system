import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Assets sob /scan-parceiros-app para não disputarem /assets com o Controle
  // Operacional quando este app é exibido embutido nele. Ver ADR 0003 em
  // imago-platform/docs/adr.
  base: '/scan-parceiros-app/',
  plugins: [react()],
  server: {
    proxy: {
      '/scan-parceiros-api': 'http://localhost:3000',
      // Mantido: o pedido do ticket de SSO vai para o Controle Operacional, e
      // em dev não há nginx encaminhando.
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
