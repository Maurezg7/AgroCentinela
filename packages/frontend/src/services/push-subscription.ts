import { getDeviceId } from './idb-store';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function getVapidPublicKey(): Promise<string> {
  const res = await fetch(`${BASE_URL}/push/public-key`);
  if (!res.ok) throw new Error(`Failed to get VAPID key: ${res.status}`);
  const data = await res.json();
  return data.publicKey;
}

export type PushStatus =
  | 'unavailable'    // Browser doesn't support push
  | 'denied'         // User denied notification permission
  | 'unsubscribed'   // Permission granted but no active subscription
  | 'subscribed'     // Active subscription registered in backend
  | 'loading'
  | 'error';

/**
 * Check current push status by inspecting both permission and subscription.
 */
export async function checkPushStatus(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unavailable';
  }
  if (Notification.permission === 'denied') return 'denied';

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) return 'subscribed';
  if (Notification.permission === 'granted') return 'unsubscribed';
  return 'unsubscribed';
}

/**
 * Subscribe to push notifications:
 * 1. Request permission if not yet granted
 * 2. Subscribe via PushManager
 * 3. Register subscription in backend
 * Throws on failure so the UI can show the error.
 */
export async function subscribeToPush(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unavailable';
  }

  // Request permission if needed
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission === 'denied') return 'denied';
  } else if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Get SW registration and subscribe
  const reg = await navigator.serviceWorker.ready;
  const publicKey = await getVapidPublicKey();

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Register in backend
  const json = subscription.toJSON();
  const deviceId = await getDeviceId();

  const res = await fetch(`${BASE_URL}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      createdAt: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Backend rejected subscription: ${res.status} ${body}`);
  }

  return 'subscribed';
}
