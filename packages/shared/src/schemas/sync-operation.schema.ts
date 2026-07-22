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
 * Transporta al backend la marca de entrega que el frontend escribe al
 * renderizar una alerta. El backend solo escribe deliveredAt si el valor
 * actual es null (primera entrega gana).
 */
export const SyncAlertDeliveredSchema = SyncBaseSchema.extend({
  type: z.literal('alert-delivered'),
  payload: z.object({
    alertId: z.string().uuid(),
    deliveredAt: z.string().datetime(),
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
  SyncAlertDeliveredSchema,
]);

export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type SyncCreateParcel = z.infer<typeof SyncCreateParcelSchema>;
export type SyncDiagnosisUpload = z.infer<typeof SyncDiagnosisUploadSchema>;
export type SyncAlertDelivered = z.infer<typeof SyncAlertDeliveredSchema>;
