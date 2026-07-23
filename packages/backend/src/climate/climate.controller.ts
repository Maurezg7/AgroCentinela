import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ClimateService } from './climate.service';

@Controller('climate')
export class ClimateController {
  constructor(private readonly climateService: ClimateService) {}

  @Get(':parcelId')
  async getClimate(@Param('parcelId') parcelId: string) {
    const cached = await this.climateService.getCached(parcelId);
    if (!cached) throw new NotFoundException('No climate data for this parcel');
    return cached;
  }
}
