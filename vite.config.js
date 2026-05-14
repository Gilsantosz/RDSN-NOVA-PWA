import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Detecta se estamos building para web (GitHub Pages / PWA) ou para Electron.
 * - WEB:      VITE_BUILD_TARGET=web  →  base absoluta '/RDSN-NOVA-PWA/'
 * - ELECTRON: (padrão)              →  base relativa './' (Electron precisa disso)
 */
const isWebBuild = process.env.VITE_BUILD_TARGET === 'web';

// Base path do repositório no GitHub Pages
const GITHUB_PAGES_BASE = '/RDSN-NOVA-PWA/';

// Credenciais Supabase — a publishable key é PÚBLICA (safe para frontend)
// Novo formato: sb_publishable_... (substitui o JWT legado eyJhbGci... revogado)
// Ordem de prioridade: env vars do CI > .env local > fallback hardcoded
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  'https://saczzyiofmlvygsopfws.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_vJ6z25g7TcVrhrsmHIESiA_EOr9lYVr';

// https://vite.dev/config/
export default defineConfig({
  // Garante que as variáveis sejam injetadas no bundle independente do .env
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_ANON_KEY),
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
  },
  base: isWebBuild ? GITHUB_PAGES_BASE : './',
  logLevel: 'error',
  optimizeDeps: {
    // fsevents é um módulo nativo macOS (.node) — não pode ser processado pelo esbuild
    exclude: ['fsevents'],
  },
  build: {
    rollupOptions: {
      maxParallelFileOps: 128,
      external: ['fsevents'],
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
      // Apenas ativa o PWA no build web, não no Electron
      disable: !isWebBuild,
      includeAssets: ['logo_v2.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        // Campo 'id' obrigatório para o Chrome gerar WebAPK moderno (Android 12+)
        // Sem este campo, o Play Protect bloqueia com aviso de "versão antiga"
        id: '/RDSN-NOVA-PWA/',
        short_name: 'RDSN',
        name: 'RDSN NOVA',
        description: 'RDSN NOVA - Sistema de Gestão Industrial de Produção e Reservas',
        icons: [
          // Android Chrome exige 192x192 PNG (mínimo obrigatório)
          {
            src: 'pwa-192x192.png',
            type: 'image/png',
            sizes: '192x192',
            purpose: 'any'
          },
          // 512x512 para splash screen no Android
          {
            src: 'pwa-512x512.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'any'
          },
          // Maskable obrigatório para Android (ícone adaptativo)
          {
            src: 'pwa-512x512.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'maskable'
          }
        ],
        // Paths absolutos são obrigatórios para Android Chrome aceitar a instalação
        start_url: isWebBuild ? GITHUB_PAGES_BASE : '/',
        scope: isWebBuild ? GITHUB_PAGES_BASE : '/',
        display: 'standalone',
        // display_override garante compatibilidade com Android mais recente
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'portrait',
        theme_color: '#0a1f6e',
        background_color: '#0a1f6e',
        lang: 'pt-BR',
        // Impede que o Chrome sugira um app da Play Store no lugar do PWA
        prefer_related_applications: false,
        categories: ['productivity', 'business'],
        // Shortcuts (atalhos que aparecem no long-press do ícone no Android)
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            url: isWebBuild ? `${GITHUB_PAGES_BASE}#/` : './#/',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'PCP',
            short_name: 'PCP',
            url: isWebBuild ? `${GITHUB_PAGES_BASE}#/pcp` : './#/pcp',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^(?!\/(api|_)).*$/],
        // Cache-first para assets estáticos (melhor performance no Android)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxAgeSeconds: 60 * 60 // 1 hora
              }
            }
          }
        ]
      },
      // Estratégia específica para Android: injectManifest é mais confiável
      strategies: 'generateSW',
      injectRegister: 'auto'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
});
