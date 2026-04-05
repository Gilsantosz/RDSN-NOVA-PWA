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
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        short_name: "RDSN NOVA",
        name: "RDSN NOVA v2.0.3",
        icons: [
          {
            src: "https://base44.com/logo_v2.svg",
            type: "image/svg+xml",
            sizes: "192x192",
            purpose: "any maskable"
          },
          {
            src: "https://base44.com/logo_v2.svg",
            type: "image/svg+xml",
            sizes: "512x512",
            purpose: "any maskable"
          },
          {
            src: "https://base44.com/logo_v2.svg",
            type: "image/svg+xml",
            sizes: "any"
          }
        ],
        start_url: "/",
        display: "standalone",
        theme_color: "#000000",
        background_color: "#ffffff"
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});