import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    // env loaded for potential future server-side use; API keys must NOT be injected into the client bundle.
    loadEnv(mode, '.');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true,
      },
      plugins: [
        tailwindcss(),
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon-32.png', 'apple-touch-icon.png', 'icons/*.png'],
          manifest: false,
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
            // Exclude large images from precache, they'll be cached at runtime
            globIgnores: ['**/images/guelaguetza-*.png'],
            // Allow larger files if needed (default is 2MB)
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
            runtimeCaching: [
              {
                // Cache large hero images at runtime
                urlPattern: /\/images\/guelaguetza-.*\.png$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'hero-images-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                  },
                },
              },
              {
                urlPattern: /^https?:\/\/localhost:3001\/api\/stories/,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'stories-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24,
                  },
                  networkTimeoutSeconds: 5,
                },
              },
              {
                urlPattern: /^https:\/\/picsum\.photos\/.*/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'images-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 7,
                  },
                },
              },
              {
                urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'map-tiles-cache',
                  expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 60 * 60 * 24 * 30,
                  },
                },
              },
              {
                // AR catalog endpoints — stale-while-revalidate for fast loads
                urlPattern: /\/api\/ar\/(points|vestimentas|regions)/,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'ar-catalog',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24, // 24h
                  },
                },
              },
              {
                // 3D model files — cache-first, long TTL
                urlPattern: /\.glb$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'ar-models',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                  },
                },
              },
            ],
          },
          devOptions: {
            enabled: true,
          },
        }),
      ],
      // API keys must never be injected into the client bundle via `define`.
      // The Gemini service should proxy through the backend instead.
      // Use VITE_GEMINI_API_KEY in .env only for local dev if absolutely required.
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
