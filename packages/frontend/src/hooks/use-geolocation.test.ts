import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from './use-geolocation';

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('handles permission denied', async () => {
    const mockGeo = {
      getCurrentPosition: (_s: unknown, fail: (err: GeolocationPositionError) => void) => {
        fail({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' } as GeolocationPositionError);
      },
    };
    Object.defineProperty(navigator, 'geolocation', { value: mockGeo, configurable: true });

    const { result } = renderHook(() => useGeolocation());
    act(() => { result.current.request(); });

    expect(result.current.status).toBe('denied');
    expect(result.current.error).toContain('denegado');
  });

  it('handles timeout', async () => {
    const mockGeo = {
      getCurrentPosition: (_s: unknown, fail: (err: GeolocationPositionError) => void) => {
        fail({ code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' } as GeolocationPositionError);
      },
    };
    Object.defineProperty(navigator, 'geolocation', { value: mockGeo, configurable: true });

    const { result } = renderHook(() => useGeolocation());
    act(() => { result.current.request(); });

    expect(result.current.status).toBe('timeout');
    expect(result.current.error).toContain('15 segundos');
  });

  it('returns coordinates on success', () => {
    const mockGeo = {
      getCurrentPosition: (success: (pos: GeolocationPosition) => void) => {
        success({ coords: { latitude: -24.78, longitude: -65.42, accuracy: 10 } } as GeolocationPosition);
      },
    };
    Object.defineProperty(navigator, 'geolocation', { value: mockGeo, configurable: true });

    const { result } = renderHook(() => useGeolocation());
    act(() => { result.current.request(); });

    expect(result.current.status).toBe('success');
    expect(result.current.result).toEqual({ lat: -24.78, lon: -65.42, accuracy: 10 });
  });
});
