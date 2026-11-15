import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Izinkan akses lewat tunnel (cloudflared / ngrok) saat uji coba di HP
  server: { allowedHosts: true },
})
