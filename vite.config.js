import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'
import react from '@vitejs/plugin-react'

// The frontend calls /api/... and Vite forwards it to the backend (FastAPI or Flask, picked
// with BACKEND_URL in .env). Same-origin requests mean the auth cookie works from any device
// on the network, not just this machine.
const apiProxy = (backendUrl) => ({
  '/api': {
    target: backendUrl,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' loads every variable, not only VITE_*, so BACKEND_URL can live in .env
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = process.env.BACKEND_URL || env.BACKEND_URL || 'http://localhost:8000'

  return {
    plugins: [react()],
    server: {
      host: true, // listen on the LAN so phones/tablets can open the app
      port: 5173,
      proxy: apiProxy(backendUrl),
    },
    preview: {
      host: true,
      port: 5173,
      proxy: apiProxy(backendUrl),
    },
  }
})
