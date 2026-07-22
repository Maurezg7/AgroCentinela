import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'AgroCentinela',
        short_name: 'AgroCentinela',
        description: 'Alertas agroclimáticas offline-first para el NOA',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
    },
      workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /\/api\/climate\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'climate-cache',
            expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
          },
        },
        {
          urlPattern: /\/api\/alerts\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'alerts-cache',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 50 },
          },
        },
        {
          urlPattern: /\/api\/parcels\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'parcels-cache',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 30 },
          },
        },
      ],
    },
    }),
  ],
});
