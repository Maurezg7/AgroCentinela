import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { createParcel } from './parcels.service';
import { getDB } from './idb-store';

// Mock navigator.onLine
let mockOnline = true;
Object.defineProperty(navigator, 'onLine', { get: () => mockOnline, configurable: true });

// Mock fetch for api-client
global.fetch = vi.fn();

beforeEach(async () => {
  vi.clearAllMocks();
  mockOnline = true;
  // Clear IDB stores
  const db = await getDB();
  const tx = db.transaction(['parcels', 'sync-queue', 'config'], 'readwrite');
  await tx.objectStore('parcels').clear();
  await tx.objectStore('sync-queue').clear();
  await tx.objectStore('config').put({ key: 'deviceId', value: '00000000-0000-4000-8000-000000000001' });
  await tx.done;
});

describe('createParcel', () => {
  const validInput = {
    name: 'Lote Norte',
    crop: 'soja',
    stage: 'floracion',
    hectares: 42,
    coordinates: { lat: -24.78, lon: -65.42 },
  };

  it('returns field errors for invalid input', async () => {
    const result = await createParcel({ name: '', crop: 'invalid', hectares: -1, coordinates: {} });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toBeDefined();
      expect(Object.keys(result.fieldErrors).length).toBeGreaterThan(0);
    }
  });

  it('persists to IndexedDB before network call and keeps same ID after sync', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async (_url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string);
      return {
        ok: true,
        json: async () => ({
          ...body,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          syncedAt: null,
        }),
      };
    });

    const result = await createParcel(validInput);
    expect(result.success).toBe(true);

    const db = await getDB();
    const parcels = await db.getAll('parcels');
    expect(parcels.length).toBe(1);

    // The ID sent to backend matches the single local entry
    if (result.success) {
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const sentBody = JSON.parse(fetchCall[1].body);
      expect(sentBody.id).toBe(parcels[0].id);
    }
  });

  it('enqueues to sync-queue when offline', async () => {
    mockOnline = false;

    const result = await createParcel(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.synced).toBe(false);
    }

    const db = await getDB();
    const queue = await db.getAll('sync-queue');
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe('create-parcel');
    expect(queue[0].status).toBe('pending');
  });

  it('enqueues when network request fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const result = await createParcel(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.synced).toBe(false);
    }

    const db = await getDB();
    const queue = await db.getAll('sync-queue');
    expect(queue.length).toBe(1);
  });

  it('validates specific fields with descriptive errors', async () => {
    const result = await createParcel({
      name: 'A',
      crop: 'soja',
      stage: 'floracion',
      hectares: 0,
      coordinates: { lat: 999, lon: -65 },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // hectares must be positive, lat must be <= 90
      expect(result.fieldErrors['hectares'] || result.fieldErrors['coordinates.lat']).toBeDefined();
    }
  });
});
