import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Body,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ParcelsService } from './parcels.service';
import { ParcelCreateSchema } from '@agrocentinela/shared';
import { NotFoundError, ConflictError } from '../common/errors/app-error';
import { z } from 'zod';

const PatchParcelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  stage: z.enum([
    'siembra', 'emergencia', 'vegetativo', 'floracion', 'llenado', 'madurez',
  ]).optional(),
  deviceId: z.string().uuid(),
}).refine((d) => d.name || d.stage, { message: 'At least one field required' });

@Controller('parcels')
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  async create(@Body() body: unknown) {
    const result = ParcelCreateSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    try {
      return await this.parcelsService.create(result.data);
    } catch (err) {
      if (err instanceof ConflictError) throw new ConflictException(err.message);
      throw err;
    }
  }

  @Get()
  async findByDevice(@Query('deviceId') deviceId?: string) {
    if (!deviceId) throw new BadRequestException('deviceId query param required');
    return this.parcelsService.findByDevice(deviceId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    try {
      return await this.parcelsService.findById(id);
    } catch (err) {
      if (err instanceof NotFoundError) throw new NotFoundException(err.message);
      throw err;
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const result = PatchParcelSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    const { deviceId, ...fields } = result.data;
    try {
      return await this.parcelsService.update(id, deviceId, fields);
    } catch (err) {
      if (err instanceof NotFoundError) throw new NotFoundException(err.message);
      if (err instanceof ConflictError) throw new ConflictException(err.message);
      throw err;
    }
  }
}
