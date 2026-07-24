import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useAiEngine } from './use-ai-engine';
import { getDB } from '@/services/idb-store';
import { useAppStore } from '@/stores/app-store';
import type { ClimateCache } from '@agrocentinela/shared';

// Mock fetch
global.fetch = vi.fn();

// Mock LanguageModel
const mockLanguageModel = {
  availability: vi.fn(),
  create: vi.fn(),
};
(globalThis as unknown as { LanguageModel: unknown }).LanguageModel = mockLanguageModel;

const frostClimate: ClimateCache = {
  parcelId: '00000000-0000-4000-8000-000000000001',
  fetchedAt: '2026-07-23T00:00:00.000Z',
  expiresAt: '2026-07-30T00:00:00.000Z',
  days: [
    { date: '2026-07-23', temperatureMax: 15, temperatureMin: -2, precipitationSum: 0, et0: 3 },
    { date: '2026-07-24', temperatureMax: 12, temperatureMin: -1, precipitationSum: 0, et0: 3 },
    { date: '2026-07-25', temperatureMax: 18, temperatureMin: 5, precipitationSum: 0, et0: 3 },
  ],
  hourly48h: Array.from({ length: 48 }, (_, i) => ({
    time: `2026-07-23T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
    temperature2m: i < 6 ? -1 : 10,
    relativeHumidity2m: 70,
    precipitation: 0,
    windSpeed10m: 5,
    soilMoisture0to10cm: 25,
  })),
};

beforeEach(async () => {
  vi.clearAllMocks();
  useAppStore.setState({ isOnline: false, deviceId: '00000000-0000-4000-8000-000000000001' });
  const db = await getDB();
  const tx = db.transaction(['alerts', 'config'], 'readwrite');
  await tx.objectStore('alerts').clear();
  await tx.objectStore('config').put({ key: 'deviceId', value: '00000000-0000-4000-8000-000000000001' });
  await tx.done;
});

describe('useAiEngine', () => {
  it('online → uses backend (bedrock)', async () => {
    useAppStore.setState({ isOnline: true });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        generated: true,
        alert: {
          id: 'a1', parcelId: 'p1', deviceId: 'd1', severity: 5,
          message: 'Helada', recommendedAction: 'Cubrir', engine: 'bedrock',
          condition: 'helada', createdAt: '2026-01-01T00:00:00.000Z',
          deliveredAt: null, expiresAt: '2026-02-01T00:00:00.000Z',
        },
      }),
    });

    const { result } = renderHook(() => useAiEngine());
    const res = await result.current.generateAlert('p1', 'soja', 'floracion', frostClimate);
    expect(res.engine).toBe('bedrock');
    expect(res.alert?.severity).toBe(5);
  });

  it('offline + Prompt API available → uses on-device', async () => {
    useAppStore.setState({ isOnline: false });
    mockLanguageModel.availability.mockResolvedValue('available');
    mockLanguageModel.create.mockResolvedValue({
      prompt: vi.fn().mockResolvedValue(JSON.stringify({
        message: 'Helada detectada',
        severity: 4,
        recommendedAction: 'Cubrir cultivo',
        condition: 'helada',
      })),
      destroy: vi.fn(),
    });

    const { result } = renderHook(() => useAiEngine());
    const res = await result.current.generateAlert('p1', 'soja', 'floracion', frostClimate);
    expect(res.engine).toBe('on-device');
    expect(res.alert?.condition).toBe('helada');
  });

  it('offline + Prompt API unavailable → falls back to rules', async () => {
    useAppStore.setState({ isOnline: false });
    mockLanguageModel.availability.mockResolvedValue('unavailable');

    const { result } = renderHook(() => useAiEngine());
    const res = await result.current.generateAlert('p1', 'soja', 'floracion', frostClimate);
    expect(res.engine).toBe('rules');
    expect(res.alert?.condition).toBe('helada');
    expect(res.alert?.severity).toBeGreaterThanOrEqual(4);
  });

  it('offline + Prompt API returns invalid JSON → falls back to rules', async () => {
    useAppStore.setState({ isOnline: false });
    mockLanguageModel.availability.mockResolvedValue('available');
    mockLanguageModel.create.mockResolvedValue({
      prompt: vi.fn().mockResolvedValue('not json at all'),
      destroy: vi.fn(),
    });

    const { result } = renderHook(() => useAiEngine());
    const res = await result.current.generateAlert('p1', 'soja', 'floracion', frostClimate);
    expect(res.engine).toBe('rules');
    expect(res.alert).not.toBeNull();
  });

  it('persists generated alert to IndexedDB', async () => {
    useAppStore.setState({ isOnline: false });
    mockLanguageModel.availability.mockResolvedValue('unavailable');

    const { result } = renderHook(() => useAiEngine());
    await result.current.generateAlert('p1', 'soja', 'floracion', frostClimate);

    const db = await getDB();
    const alerts = await db.getAll('alerts');
    expect(alerts.length).toBe(1);
    expect(alerts[0].engine).toBe('rules');
  });
});
