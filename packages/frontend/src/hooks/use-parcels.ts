import { useState, useEffect, useCallback } from 'react';
import type { Parcel } from '@agrocentinela/shared';
import { getDB, getDeviceId } from '@/services/idb-store';
import { apiClient } from '@/services/api-client';
import { useAppStore } from '@/stores/app-store';

export function useParcels() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useAppStore((s) => s.isOnline);

  const refresh = useCallback(async () => {
    const db = await getDB();
    // Always start from IDB (offline-first)
    const local = await db.getAll('parcels');
    setParcels(local);
    setLoading(false);

    // If online, refresh from backend
    if (isOnline) {
      try {
        const deviceId = await getDeviceId();
        const remote = await apiClient.getParcelsByDevice(deviceId);
        // Merge: replace IDB with server data
        const tx = db.transaction('parcels', 'readwrite');
        for (const p of remote) {
          await tx.store.put(p);
        }
        await tx.done;
        setParcels(remote);
      } catch {
        // Keep local data on failure
      }
    }
  }, [isOnline]);

  useEffect(() => { refresh(); }, [refresh]);

  return { parcels, loading, refresh };
}
