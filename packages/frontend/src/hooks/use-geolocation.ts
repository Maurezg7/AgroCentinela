import { useState, useCallback } from 'react';

export type GeoStatus = 'idle' | 'requesting' | 'success' | 'denied' | 'timeout' | 'error';

export interface GeoResult {
  lat: number;
  lon: number;
  accuracy: number;
}

export interface UseGeolocationReturn {
  status: GeoStatus;
  result: GeoResult | null;
  error: string | null;
  request: () => void;
}

const TIMEOUT_MS = 15_000;

export function useGeolocation(): UseGeolocationReturn {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [result, setResult] = useState<GeoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Geolocalización no soportada en este navegador');
      return;
    }

    setStatus('requesting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setResult({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setStatus('success');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError('Permiso de ubicación denegado');
        } else if (err.code === err.TIMEOUT) {
          setStatus('timeout');
          setError('No se pudo obtener la ubicación en 15 segundos');
        } else {
          setStatus('error');
          setError('Error al obtener la ubicación');
        }
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 },
    );
  }, []);

  return { status, result, error, request };
}
