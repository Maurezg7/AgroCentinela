import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getDB, getDeviceId } from './idb-store';

// Reset IDB between tests
beforeEach(() => {
  // fake-indexeddb/auto provides a fresh IDB per test file import
  // but we need to reset the cached promise
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__idbPromise = null;
});

describe('idb-store', () => {
  it('opens the database with all expected stores', async () => {
    const db = await getDB();
    expect(db.objectStoreNames).toContain('parcels');
    expect(db.objectStoreNames).toContain('climate');
    expect(db.objectStoreNames).toContain('alerts');
    expect(db.objectStoreNames).toContain('sync-queue');
    expect(db.objectStoreNames).toContain('diagnosis');
    expect(db.objectStoreNames).toContain('config');
  });

  it('generates a deviceId on first call', async () => {
    const id = await getDeviceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('returns the same deviceId on subsequent calls', async () => {
    const id1 = await getDeviceId();
    const id2 = await getDeviceId();
    expect(id1).toBe(id2);
  });

  it('persists deviceId in config store', async () => {
    const id = await getDeviceId();
    const db = await getDB();
    const stored = await db.get('config', 'deviceId');
    expect(stored?.value).toBe(id);
  });
});
