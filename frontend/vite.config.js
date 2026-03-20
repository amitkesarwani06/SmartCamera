import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/vms-proxy': {
        target: 'https://vms.cotcorpcontrol.in',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/vms-proxy/, '')
      },
      '/api/go2rtc': {
        target: 'https://vms.cotcorpcontrol.in',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
