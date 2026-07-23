import { useState, useEffect } from 'react';
import type { Alert } from '@agrocentinela/shared';
import { getDB } from '@/services/idb-store';

export function useAlerts(parcelId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const db = await getDB();
      let all: Alert[];
      if (parcelId) {
        all = await db.getAllFromIndex('alerts', 'by-parcelId', parcelId);
      } else {
        all = await db.getAll('alerts');
      }
      // Sort by createdAt descending
      all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setAlerts(all);
      setLoading(false);
    }
    load();
  }, [parcelId]);

  return { alerts, loading };
}
