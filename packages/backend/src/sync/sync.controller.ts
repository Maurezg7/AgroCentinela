import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { SyncOperationSchema } from '@agrocentinela/shared';
import { SyncService } from './sync.service';

const SyncBodySchema = z.array(SyncOperationSchema).min(1).max(50);

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  async sync(@Body() body: unknown) {
    const result = SyncBodySchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.syncService.processAll(result.data);
  }
}
