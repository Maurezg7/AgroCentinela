import { v4 as uuidv4 } from 'uuid';
import { getDB } from './idb-store';
import type { ParcelCreate, SyncOperation } from '@agrocentinela/shared';

const MAX_RETRIES = 5;
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function enqueueCreateParcel(
  deviceId: string,
  payload: ParcelCreate,
  parcelId?: string,
): Promise<SyncOperation> {
  const op: SyncOperation = {
    id: uuidv4(),
    deviceId,
    type: 'create-parcel',
    payload: { ...payload, ...(parcelId && { id: parcelId }) } as ParcelCreate,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retries: 0,
  };
  const db = await getDB();
  await db.put('sync-queue', op);
  registerBackgroundSync(); // fire-and-forget, don't block enqueue
  return op;
}

export async function enqueueAlertDelivered(
  deviceId: string,
  alertId: string,
  deliveredAt: string,
): Promise<void> {
  const op: SyncOperation = {
    id: uuidv4(),
    deviceId,
    type: 'alert-delivered',
    payload: { alertId, deliveredAt },
    createdAt: new Date().toISOString(),
    status: 'pending',
    retries: 0,
  };
  const db = await getDB();
  await db.put('sync-queue', op);
  registerBackgroundSync(); // fire-and-forget
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  const all = await db.getAllFromIndex('sync-queue', 'by-status', 'pending');
  return all.length;
}

/** Flush all pending operations to the backend POST /sync endpoint. */
export async function flushSyncQueue(): Promise<void> {
  const db = await getDB();
  const pending = await db.getAllFromIndex('sync-queue', 'by-status', 'pending');
  if (pending.length === 0) return;

  // Send batch to backend
  try {
    const res = await fetch(`${BASE_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      // All failed — increment retries
      await markAllRetried(pending);
      return;
    }

    const results: Array<{ id: string; status: 'synced' | 'failed'; error?: string }> =
      await res.json();

    const tx = db.transaction('sync-queue', 'readwrite');
    for (const r of results) {
      const op = pending.find((o) => o.id === r.id);
      if (!op) continue;
      if (r.status === 'synced') {
        await tx.store.put({ ...op, status: 'synced' });
      } else {
        const retries = op.retries + 1;
        const status = retries >= MAX_RETRIES ? 'failed' : 'pending';
        await tx.store.put({ ...op, retries, status });
      }
    }
    await tx.done;
  } catch {
    // Network failure — increment retries
    await markAllRetried(pending);
  }
}

async function markAllRetried(ops: SyncOperation[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('sync-queue', 'readwrite');
  for (const op of ops) {
    const retries = op.retries + 1;
    const status = retries >= MAX_RETRIES ? 'failed' : 'pending';
    await tx.store.put({ ...op, retries, status });
  }
  await tx.done;
}

async function registerBackgroundSync(): Promise<void> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as unknown as { sync: { register: (t: string) => Promise<void> } })
        .sync.register('sync-queue');
    } catch { /* not supported */ }
  }
}

/** Setup listeners for connectivity recovery. Call once at app init. */
export function setupSyncListeners(): () => void {
  const handleOnline = () => { flushSyncQueue(); };
  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      flushSyncQueue();
    }
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
