/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// Precache app shell (injected by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST);

// Empty JSON response for offline fallback (offline is the normal case)
const EMPTY_ARRAY_RESPONSE = () =>
  new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

// Runtime caching for API routes with graceful offline degradation
registerRoute(
  ({ url }) => url.pathname.startsWith('/climate'),
  async (params) => {
    const strategy = new StaleWhileRevalidate({
      cacheName: 'climate-cache',
      plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 86400 })],
    });
    try {
      return await strategy.handle(params);
    } catch {
      return EMPTY_ARRAY_RESPONSE();
    }
  },
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/alerts'),
  async (params) => {
    const strategy = new NetworkFirst({
      cacheName: 'alerts-cache',
      networkTimeoutSeconds: 5,
      plugins: [new ExpirationPlugin({ maxEntries: 50 })],
    });
    try {
      return await strategy.handle(params);
    } catch {
      return EMPTY_ARRAY_RESPONSE();
    }
  },
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/parcels'),
  async (params) => {
    const strategy = new NetworkFirst({
      cacheName: 'parcels-cache',
      networkTimeoutSeconds: 5,
      plugins: [new ExpirationPlugin({ maxEntries: 30 })],
    });
    try {
      return await strategy.handle(params);
    } catch {
      return EMPTY_ARRAY_RESPONSE();
    }
  },
);

// Background Sync handler
self.addEventListener('sync', ((event: SyncEvent) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(flushSyncFromSW());
  }
}) as EventListener);

async function flushSyncFromSW(): Promise<void> {
  const { openDB } = await import('idb');
  const db = await openDB('agrocentinela', 1);
  const pending = await db.getAllFromIndex('sync-queue', 'by-status', 'pending');
  if (pending.length === 0) return;

  const baseUrl = (self as unknown as { location: { origin: string } }).location.origin;
  try {
    const res = await fetch(`${baseUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
    });

    if (!res.ok) return;

    const results: Array<{ id: string; status: string }> = await res.json();
    const tx = db.transaction('sync-queue', 'readwrite');
    for (const r of results) {
      const op = pending.find((o: { id: string }) => o.id === r.id);
      if (!op) continue;
      if (r.status === 'synced') {
        await tx.store.put({ ...op, status: 'synced' });
      } else {
        const retries = (op.retries ?? 0) + 1;
        await tx.store.put({ ...op, retries, status: retries >= 5 ? 'failed' : 'pending' });
      }
    }
    await tx.done;
  } catch {
    // Will retry on next sync event
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json() as { title: string; body: string; parcelId: string; severity: number };
  const vibrate = payload.severity >= 5 ? [200, 100, 200, 100, 200] : [200, 100, 200];
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      vibrate,
      data: { parcelId: payload.parcelId },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const parcelId = event.notification.data?.parcelId;
  const url = parcelId ? `/parcelas/${parcelId}` : '/';
  event.waitUntil(self.clients.openWindow(url));
});
