import { z } from 'zod';

export const CropTypeSchema = z.enum(['soja', 'maiz', 'poroto']);

export const PhenologicalStageSchema = z.enum([
  'siembra',
  'emergencia',
  'vegetativo',
  'floracion',
  'llenado',
  'madurez',
]);

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const ParcelCreateSchema = z.object({
  name: z.string().min(1).max(100),
  crop: CropTypeSchema,
  stage: PhenologicalStageSchema,
  hectares: z.number().positive().max(50000),
  coordinates: CoordinatesSchema,
  deviceId: z.string().uuid(),
});

/**
 * `updatedAt` se escribe en toda edición (cambio de etapa, nombre, etc.)
 * y es el campo de resolución de conflictos en la estrategia last-write-wins.
 */
export const ParcelSchema = ParcelCreateSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  syncedAt: z.string().datetime().nullable(),
});

export type CropType = z.infer<typeof CropTypeSchema>;
export type PhenologicalStage = z.infer<typeof PhenologicalStageSchema>;
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type Parcel = z.infer<typeof ParcelSchema>;
export type ParcelCreate = z.infer<typeof ParcelCreateSchema>;
