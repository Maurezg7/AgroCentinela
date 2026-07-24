import {
  Controller, Post, Delete, Get, Body, BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { PushSubscriptionSchema } from '@agrocentinela/shared';
import { PushService } from './push.service';

const UnsubscribeSchema = z.object({
  deviceId: z.string().uuid(),
  endpoint: z.string().url(),
});

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('public-key')
  async getPublicKey() {
    const key = await this.pushService.getPublicKey();
    return { publicKey: key };
  }

  @Post('subscribe')
  async subscribe(@Body() body: unknown) {
    const result = PushSubscriptionSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.issues);
    await this.pushService.subscribe(result.data);
    return { subscribed: true };
  }

  @Delete('unsubscribe')
  async unsubscribe(@Body() body: unknown) {
    const result = UnsubscribeSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.issues);
    await this.pushService.unsubscribe(result.data.deviceId, result.data.endpoint);
    return { unsubscribed: true };
  }
}
