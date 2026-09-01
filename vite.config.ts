import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // GitHub Pages repository path is injected by the deploy workflow via
  // VITE_BASE_PATH (e.g. /REPOSITORY_NAME/). Local builds default to '/'.
  // Based on the InversifyJS contract:
  //   final URL  https://<USER>.github.io/<REPO>/
  //   VITE_BASE_PATH  /<REPO>/
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
        manifest: {
          name: 'MAC SUPERMARKET - Product Registration',
          short_name: 'MAC Market',
          description: 'Offline product registration for MAC Supermarket',
          theme_color: '#2c7a4b',
          background_color: '#f4f6f5',
          display: 'standalone',
          // Relative to the manifest URL so the PWA keeps working under any
          // GitHub Pages subpath (https://<USER>.github.io/<REPO>/).
          start_url: '.',
          scope: '.',
          orientation: 'portrait',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: 'index.html',
          clientsClaim: true,
          skipWaiting: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  };
});