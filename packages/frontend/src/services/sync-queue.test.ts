import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { enqueueCreateParcel, flushSyncQueue, getPendingCount } from './sync-queue';
import { getDB } from './idb-store';

global.fetch = vi.fn();

beforeEach(async () => {
  vi.clearAllMocks();
  const db = await getDB();
  const tx = db.transaction(['sync-queue', 'config'], 'readwrite');
  await tx.objectStore('sync-queue').clear();
  await tx.objectStore('config').put({ key: 'deviceId', value: '00000000-0000-4000-8000-000000000001' });
  await tx.done;
});

describe('sync-queue', () => {
  const payload = {
    name: 'Test', crop: 'soja' as const, stage: 'floracion' as const,
    hectares: 10, coordinates: { lat: -24, lon: -65 },
    deviceId: '00000000-0000-4000-8000-000000000001',
  };

  it('enqueues and reports pending count', async () => {
    await enqueueCreateParcel('00000000-0000-4000-8000-000000000001', payload);
    expect(await getPendingCount()).toBe(1);
  });

  it('flushSyncQueue marks ops as synced on success', async () => {
    const op = await enqueueCreateParcel('00000000-0000-4000-8000-000000000001', payload);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: op.id, status: 'synced' }],
    });

    await flushSyncQueue();
    expect(await getPendingCount()).toBe(0);
    const db = await getDB();
    const stored = await db.get('sync-queue', op.id);
    expect(stored?.status).toBe('synced');
  });

  it('increments retries on failure', async () => {
    const op = await enqueueCreateParcel('00000000-0000-4000-8000-000000000001', payload);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: op.id, status: 'failed', error: 'err' }],
    });

    await flushSyncQueue();
    const db = await getDB();
    const stored = await db.get('sync-queue', op.id);
    expect(stored?.retries).toBe(1);
    expect(stored?.status).toBe('pending'); // still retryable
  });

  it('marks as failed after MAX_RETRIES (5)', async () => {
    const db = await getDB();
    const op = await enqueueCreateParcel('00000000-0000-4000-8000-000000000001', payload);
    // Simulate 4 prior retries
    await db.put('sync-queue', { ...op, retries: 4 });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: op.id, status: 'failed', error: 'err' }],
    });

    await flushSyncQueue();
    const stored = await db.get('sync-queue', op.id);
    expect(stored?.retries).toBe(5);
    expect(stored?.status).toBe('failed');
  });

  it('increments retries on network failure', async () => {
    const op = await enqueueCreateParcel('00000000-0000-4000-8000-000000000001', payload);
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('net'));

    await flushSyncQueue();
    const db = await getDB();
    const stored = await db.get('sync-queue', op.id);
    expect(stored?.retries).toBe(1);
    expect(stored?.status).toBe('pending');
  });

  it('does nothing when queue is empty', async () => {
    await flushSyncQueue();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
