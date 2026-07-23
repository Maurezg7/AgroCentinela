import { v4 as uuidv4 } from 'uuid';
import { ParcelCreateSchema, type Parcel } from '@agrocentinela/shared';
import { getDB, getDeviceId } from './idb-store';
import { apiClient } from './api-client';
import { enqueueCreateParcel } from './sync-queue';
import type { ZodIssue } from 'zod';

export interface CreateParcelResult {
  success: true;
  parcel: Parcel;
  synced: boolean;
}

export interface CreateParcelError {
  success: false;
  fieldErrors: Record<string, string>;
}

export async function createParcel(
  input: Record<string, unknown>,
): Promise<CreateParcelResult | CreateParcelError> {
  const deviceId = await getDeviceId();
  const data = { ...input, deviceId };

  // Validate with Zod
  const result = ParcelCreateSchema.safeParse(data);
  if (!result.success) {
    return { success: false, fieldErrors: mapZodErrors(result.error.issues) };
  }

  const payload = result.data;

  // Client generates canonical ID (Property 5: idempotency)
  const id = uuidv4();
  const now = new Date().toISOString();
  const localParcel: Parcel = {
    ...payload,
    id,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
  };

  const db = await getDB();
  await db.put('parcels', localParcel);

  // Try to sync to backend (send ID so backend uses it)
  if (navigator.onLine) {
    try {
      const synced = await apiClient.createParcel({ ...payload, id });
      const serverParcel: Parcel = { ...synced, syncedAt: synced.createdAt };
      await db.put('parcels', serverParcel);
      return { success: true, parcel: serverParcel, synced: true };
    } catch {
      await enqueueCreateParcel(deviceId, payload, id);
      return { success: true, parcel: localParcel, synced: false };
    }
  }

  // Offline — queue for sync
  await enqueueCreateParcel(deviceId, payload, id);
  return { success: true, parcel: localParcel, synced: false };
}

function mapZodErrors(issues: ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}
