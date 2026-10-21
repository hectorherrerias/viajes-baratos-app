import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // En desarrollo la API la sirve `npm run dev:api` (server/index.js)
    proxy: { '/api': 'http://localhost:3000' },
  },
})
