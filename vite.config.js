import { defineConfig } from 'vite'
import process from 'node:process'
import react from '@vitejs/plugin-react'

// The frontend calls /api/... and Vite forwards it to FastAPI. Same-origin requests mean
// the auth cookie works from any device on the network, not just this machine.
const apiProxy = {
  '/api': {
    target: process.env.BACKEND_URL || 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on the LAN so phones/tablets can open the app
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    host: true,
    port: 5173,
    proxy: apiProxy,
  },
})
