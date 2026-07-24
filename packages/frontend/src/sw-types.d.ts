// Background Sync API types (not yet in lib.webworker)
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

interface ServiceWorkerGlobalScopeEventMap {
  sync: SyncEvent;
}

// Extend NotificationOptions with vibrate (Chrome-only)
interface NotificationOptions {
  vibrate?: number[];
}
