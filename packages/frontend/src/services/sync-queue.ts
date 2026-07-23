import { v4 as uuidv4 } from 'uuid';
import { getDB } from './idb-store';
import type { ParcelCreate, SyncOperation } from '@agrocentinela/shared';

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

  // Register Background Sync if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    try {
      await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } })
        .sync.register('sync-queue');
    } catch {
      // Background Sync not supported or permission denied — will sync on reconnect
    }
  }

  return op;
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  const all = await db.getAllFromIndex('sync-queue', 'by-status', 'pending');
  return all.length;
}
