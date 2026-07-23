import type { Parcel, ParcelCreate } from '@agrocentinela/shared';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TIMEOUT_MS = 10_000;

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, `HTTP ${res.status}`, body);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const apiClient = {
  createParcel(data: ParcelCreate & { id?: string }): Promise<Parcel> {
    return request<Parcel>('/parcels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getParcelsByDevice(deviceId: string): Promise<Parcel[]> {
    return request<Parcel[]>(`/parcels?deviceId=${deviceId}`);
  },
};
