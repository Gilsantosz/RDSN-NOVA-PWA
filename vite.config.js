import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './', // CRUCIAL CONFIGURATION: Makes file references relative for Electron build
  logLevel: 'error', // Suppress warnings, only show errors
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const arr = id.toString().split('node_modules/')[1].split('/');
            const name = arr[0] === '@' ? arr[0] + '/' + arr[1] : arr[0];
            return 'vendor_' + name.replace('@', '');
          }
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo_v2.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        short_name: "RDSN NOVA",
        name: "RDSN NOVA v2.0.3",
        description: "Sistema de Gestão Industrial RDSN NOVA",
        icons: [
          {
            src: "pwa-192x192.png",
            type: "image/png",
            sizes: "192x192",
            purpose: "any"
          },
          {
            src: "pwa-512x512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "any"
          },
          {
            src: "pwa-512x512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "maskable"
          }
        ],
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        categories: ["productivity", "business"]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});