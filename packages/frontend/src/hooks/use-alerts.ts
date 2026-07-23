import { useState, useEffect, useCallback } from 'react';
import type { Alert } from '@agrocentinela/shared';
import { getDB, getDeviceId } from '@/services/idb-store';
import { apiClient } from '@/services/api-client';
import { useAppStore } from '@/stores/app-store';

export function useAlerts(parcelId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useAppStore((s) => s.isOnline);

  const refresh = useCallback(async () => {
    const db = await getDB();

    // Read from IDB first (offline-first)
    let local: Alert[];
    if (parcelId) {
      local = await db.getAllFromIndex('alerts', 'by-parcelId', parcelId);
    } else {
      local = await db.getAll('alerts');
    }
    local.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setAlerts(local);
    setLoading(false);

    // Refresh from network if online
    if (isOnline) {
      try {
        let remote: Alert[];
        if (parcelId) {
          remote = await apiClient.getAlertsByParcel(parcelId);
        } else {
          const deviceId = await getDeviceId();
          remote = await apiClient.getAlertsByDevice(deviceId);
        }
        // Persist to IDB
        const tx = db.transaction('alerts', 'readwrite');
        for (const a of remote) {
          await tx.store.put(a);
        }
        await tx.done;
        remote.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setAlerts(remote);
      } catch {
        // Keep local data on network failure
      }
    }
  }, [parcelId, isOnline]);

  useEffect(() => { refresh(); }, [refresh]);

  return { alerts, loading, refresh };
}
