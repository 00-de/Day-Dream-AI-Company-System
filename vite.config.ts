import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel へのデプロイをそのまま行える標準構成
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
  },
})
