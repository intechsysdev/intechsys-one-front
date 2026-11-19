import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // La versión que se muestra en el portal es la del package.json: se sube ahí y nada más.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // El portal habla siempre con rutas relativas: en desarrollo se redirigen al API local.
      '/api': {
        target: 'http://localhost:5180',
        changeOrigin: true,
      },
    },
  },
})
