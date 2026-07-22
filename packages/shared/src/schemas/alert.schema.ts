import { z } from 'zod';

export const AlertSeveritySchema = z.number().int().min(1).max(5);
export const AlertEngineSchema = z.enum(['bedrock', 'on-device', 'rules']);
export const AlertConditionSchema = z.enum(['helada', 'estres-hidrico']);

/**
 * `deliveredAt` se escribe en dos paths:
 * - Push exitoso: backend escribe tras confirmar sendNotification() status 201.
 * - Renderizado en app: frontend escribe en IDB cuando la alerta se muestra
 *   en pantalla; se sincroniza al backend en la próxima sync.
 */
export const AlertSchema = z.object({
  id: z.string().uuid(),
  parcelId: z.string().uuid(),
  deviceId: z.string().uuid(),
  severity: AlertSeveritySchema,
  message: z.string().min(1).max(500),
  recommendedAction: z.string().min(1).max(500),
  engine: AlertEngineSchema,
  condition: AlertConditionSchema,
  createdAt: z.string().datetime(),
  deliveredAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime(),
});

/**
 * Schema para validar la respuesta de Bedrock. El prompt incluye instrucción:
 * "condition" MUST be one of: "helada", "estres-hidrico". No other values.
 */
export const BedrockAlertResponseSchema = z.object({
  message: z.string().min(1).max(500),
  severity: AlertSeveritySchema,
  recommendedAction: z.string().min(1).max(500),
  condition: AlertConditionSchema,
});

export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;
export type AlertEngine = z.infer<typeof AlertEngineSchema>;
export type AlertCondition = z.infer<typeof AlertConditionSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type BedrockAlertResponse = z.infer<typeof BedrockAlertResponseSchema>;
