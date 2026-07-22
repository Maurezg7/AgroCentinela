import { z } from 'zod';

export const TriageResultSchema = z.object({
  greenRatio: z.number().min(0).max(1),
  yellowBrownRatio: z.number().min(0).max(1),
  preliminarySeverity: z.number().int().min(1).max(3),
  analysisMethod: z.literal('color-histogram'),
});

const DiagnosisBaseSchema = z.object({
  id: z.string().uuid(),
  parcelId: z.string().uuid(),
  imageKey: z.string(),
  triage: TriageResultSchema.nullable(),
  createdAt: z.string().datetime(),
});

export const DiagnosisPendingSchema = DiagnosisBaseSchema.extend({
  status: z.literal('pending'),
});

export const DiagnosisCompletedSchema = DiagnosisBaseSchema.extend({
  status: z.literal('completed'),
  diagnosis: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(1),
  possibleCauses: z.array(z.string().max(200)).max(5),
});

export const DiagnosisFailedSchema = DiagnosisBaseSchema.extend({
  status: z.literal('failed'),
  errorCode: z.string().min(1),
});

export const DiagnosisResultSchema = z.discriminatedUnion('status', [
  DiagnosisPendingSchema,
  DiagnosisCompletedSchema,
  DiagnosisFailedSchema,
]);

export type TriageResult = z.infer<typeof TriageResultSchema>;
export type DiagnosisResult = z.infer<typeof DiagnosisResultSchema>;
export type DiagnosisPending = z.infer<typeof DiagnosisPendingSchema>;
export type DiagnosisCompleted = z.infer<typeof DiagnosisCompletedSchema>;
export type DiagnosisFailed = z.infer<typeof DiagnosisFailedSchema>;
