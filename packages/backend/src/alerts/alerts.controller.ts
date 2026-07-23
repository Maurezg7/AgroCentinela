import {
  Controller,
  Post,
  Body,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { z } from 'zod';
import { AlertsService } from './alerts.service';
import { NotFoundError } from '../common/errors/app-error';

const SimulateSchema = z.object({
  temperatureMin: z.number(),
}).strict();

const GenerateAlertSchema = z.object({
  parcelId: z.string().uuid(),
  deviceId: z.string().uuid(),
  simulate: SimulateSchema.optional(),
});

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('generate')
  async generate(@Body() body: unknown) {
    const result = GenerateAlertSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }

    const { parcelId, deviceId, simulate } = result.data;

    // Block simulate if not allowed
    if (simulate && process.env.ALLOW_SIMULATION !== 'true') {
      throw new ForbiddenException('Simulation not enabled in this environment');
    }

    try {
      return await this.alertsService.generate(parcelId, deviceId, simulate);
    } catch (err) {
      if (err instanceof NotFoundError) throw new NotFoundException(err.message);
      throw err;
    }
  }
}
