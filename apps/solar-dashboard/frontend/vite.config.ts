import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function normalizeBasePath(input?: string): string {
  if (!input || input === '/') return '/'
  const trimmed = input.replace(/^\/+|\/+$/g, '')
  return `/${trimmed}/`
}

export default defineConfig(() => {
  const base = normalizeBasePath(process.env.VITE_BASE_PATH)

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'Solar Portfolio Dashboard',
          short_name: 'SolarDash',
          description: 'Real-time solar generation monitoring for 44+ sites',
          theme_color: '#F59E0B',
          background_color: '#0A0E1A',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ]
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https?:.*\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 300 },
                networkTimeoutSeconds: 10
              }
            },
            {
              urlPattern: /^https?:.*\.(js|css|png|ico|svg)$/,
              handler: 'CacheFirst',
              options: { cacheName: 'static-cache', expiration: { maxAgeSeconds: 86400 } }
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-charts': ['recharts'],
            'vendor-icons': ['lucide-react'],
          }
        }
      }
    },
    server: {
      proxy: {
        '/api': { target: 'http://localhost:8000', changeOrigin: true }
      }
    }
  }
})
