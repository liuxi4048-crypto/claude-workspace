import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/claude-workspace/kuji-tracker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'くじトラッカー',
        short_name: 'くじトラッカー',
        description: '電子くじの当選結果を管理するアプリ',
        theme_color: '#1a1a3e',
        background_color: '#0f0f2e',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 } }
          }
        ],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
      }
    })
  ]
})
