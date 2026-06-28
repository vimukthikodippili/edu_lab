import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist, NetworkFirst, StaleWhileRevalidate, CacheFirst, BackgroundSyncPlugin } from 'serwist'
import { defaultCache } from '@serwist/next/worker'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const backgroundSyncPlugin = new BackgroundSyncPlugin('sims-offline-queue', {
  maxRetentionTime: 24 * 60,
})

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Navigation — NetworkFirst with 24h cache fallback for offline shell
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'sims-pages',
        networkTimeoutSeconds: 3,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response && response.status === 200 ? response : null,
          },
        ],
      }),
    },

    // API GETs — StaleWhileRevalidate with 24h TTL for offline reads
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/v1') && !url.pathname.includes('/auth/'),
      handler: new StaleWhileRevalidate({
        cacheName: 'sims-api-reads',
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response && response.status === 200 ? response : null,
          },
        ],
      }),
    },

    // API writes (POST/PUT/PATCH/DELETE) — BackgroundSync for offline queuing
    {
      matcher: ({ request, url }) =>
        url.pathname.startsWith('/api/v1') && request.method !== 'GET',
      handler: new NetworkFirst({
        cacheName: 'sims-api-writes',
        plugins: [backgroundSyncPlugin],
      }),
    },

    // Fonts (Noto Sans Sinhala/Tamil) — CacheFirst indefinite
    {
      matcher: ({ request }) => request.destination === 'font',
      handler: new CacheFirst({
        cacheName: 'sims-fonts',
      }),
    },

    // Static assets — CacheFirst 30 days
    {
      matcher: ({ request }) =>
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'image',
      handler: new CacheFirst({
        cacheName: 'sims-static',
      }),
    },

    ...defaultCache,
  ],
})

serwist.addEventListeners()
