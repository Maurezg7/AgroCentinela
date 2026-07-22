import { z } from 'zod';

export const PushSubscriptionSchema = z.object({
  deviceId: z.string().uuid(),
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  createdAt: z.string().datetime(),
});

export type PushSubscriptionData = z.infer<typeof PushSubscriptionSchema>;
