import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';


// base './' — приложение работает из любой подпапки (GitHub Pages, Netlify, свой хостинг).
export default defineConfig(({ command, mode }) => ({
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0') },
  base: './',
  plugins: [
    react(),
    // режим preview — сборка для встроенного предпросмотра без service worker
    mode !== 'preview' && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'models/*.glb', 'media/**/*.webp'],
      manifest: {
        name: "Women's Fitness — персональный тренер",
        short_name: "Women's Fitness",
        description: 'Персональные тренировки, питание и прогресс',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F9F2FA',
        theme_color: '#F9F2FA',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,webp,glb,svg}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      // render.html — служебная страница для пререндера миниатюр, в прод-сборку не входит
      input: command === 'build' ? { main: new URL('./index.html', import.meta.url).pathname } : undefined,
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}));
