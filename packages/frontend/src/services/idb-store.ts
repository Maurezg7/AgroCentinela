import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type {
  Parcel,
  ClimateCache,
  Alert,
  SyncOperation,
  DiagnosisResult,
} from '@agrocentinela/shared';

export interface AgroCentinelaDB extends DBSchema {
  parcels: {
    key: string;
    value: Parcel;
    indexes: { 'by-deviceId': string; 'by-crop': string };
  };
  climate: {
    key: string;
    value: ClimateCache;
    indexes: { 'by-fetchedAt': string };
  };
  alerts: {
    key: string;
    value: Alert;
    indexes: {
      'by-parcelId': string;
      'by-createdAt': string;
      'by-deliveredAt': string;
    };
  };
  'sync-queue': {
    key: string;
    value: SyncOperation;
    indexes: { 'by-status': string; 'by-createdAt': string };
  };
  diagnosis: {
    key: string;
    value: DiagnosisResult;
    indexes: { 'by-parcelId': string; 'by-status': string };
  };
  config: {
    key: string;
    value: { key: string; value: string };
  };
}

const DB_NAME = 'agrocentinela';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AgroCentinelaDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AgroCentinelaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AgroCentinelaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Parcels store
        const parcelsStore = db.createObjectStore('parcels', { keyPath: 'id' });
        parcelsStore.createIndex('by-deviceId', 'deviceId');
        parcelsStore.createIndex('by-crop', 'crop');

        // Climate store (one item per parcel)
        const climateStore = db.createObjectStore('climate', {
          keyPath: 'parcelId',
        });
        climateStore.createIndex('by-fetchedAt', 'fetchedAt');

        // Alerts store
        const alertsStore = db.createObjectStore('alerts', { keyPath: 'id' });
        alertsStore.createIndex('by-parcelId', 'parcelId');
        alertsStore.createIndex('by-createdAt', 'createdAt');
        alertsStore.createIndex('by-deliveredAt', 'deliveredAt');

        // Sync queue (local only, never in DynamoDB)
        const syncStore = db.createObjectStore('sync-queue', {
          keyPath: 'id',
        });
        syncStore.createIndex('by-status', 'status');
        syncStore.createIndex('by-createdAt', 'createdAt');

        // Diagnosis store
        const diagStore = db.createObjectStore('diagnosis', { keyPath: 'id' });
        diagStore.createIndex('by-parcelId', 'parcelId');
        diagStore.createIndex('by-status', 'status');

        // Config store (key-value)
        db.createObjectStore('config', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

/**
 * Returns the device UUID. Generates and persists one on first call.
 */
export async function getDeviceId(): Promise<string> {
  const db = await getDB();
  const existing = await db.get('config', 'deviceId');
  if (existing) {
    return existing.value;
  }
  const deviceId = uuidv4();
  await db.put('config', { key: 'deviceId', value: deviceId });
  return deviceId;
}
