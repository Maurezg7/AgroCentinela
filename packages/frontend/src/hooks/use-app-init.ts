import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { getDeviceId } from '@/services/idb-store';
import { getPendingCount, setupSyncListeners } from '@/services/sync-queue';

export function useAppInit() {
  const { setDeviceId, setOnline, setPendingSyncCount } = useAppStore();

  useEffect(() => {
    getDeviceId().then(setDeviceId);
    getPendingCount().then(setPendingSyncCount);

    const handleOnline = () => {
      setOnline(true);
      getPendingCount().then(setPendingSyncCount);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Setup sync flush listeners (online, visibilitychange)
    const teardownSync = setupSyncListeners();

    // Poll sync count every 5s (for changes from SW)
    const interval = setInterval(() => {
      getPendingCount().then(setPendingSyncCount);
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      teardownSync();
      clearInterval(interval);
    };
  }, [setDeviceId, setOnline, setPendingSyncCount]);
}
