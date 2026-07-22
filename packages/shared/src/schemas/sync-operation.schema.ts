import { z } from 'zod';
import { ParcelCreateSchema } from './parcel.schema';

const SyncBaseSchema = z.object({
  id: z.string().uuid(),
  deviceId: z.string().uuid(),
  createdAt: z.string().datetime(),
  status: z.enum(['pending', 'synced', 'failed']),
  retries: z.number().int().min(0),
});

export const SyncCreateParcelSchema = SyncBaseSchema.extend({
  type: z.literal('create-parcel'),
  payload: ParcelCreateSchema,
});

export const SyncDiagnosisUploadSchema = SyncBaseSchema.extend({
  type: z.literal('diagnosis-upload'),
  payload: z.object({
    parcelId: z.string().uuid(),
    imageKey: z.string().min(1),
  }),
});

/**
 * La cola de sync vive exclusivamente en IndexedDB. No existe entidad
 * SyncQueue en DynamoDB. La idempotencia se garantiza por el upsert
 * condicionado en el backend.
 */
export const SyncOperationSchema = z.discriminatedUnion('type', [
  SyncCreateParcelSchema,
  SyncDiagnosisUploadSchema,
]);

export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type SyncCreateParcel = z.infer<typeof SyncCreateParcelSchema>;
export type SyncDiagnosisUpload = z.infer<typeof SyncDiagnosisUploadSchema>;
