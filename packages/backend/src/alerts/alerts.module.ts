import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { BedrockService } from './bedrock.service';
import { ClimateModule } from '../climate/climate.module';
import { ParcelsModule } from '../parcels/parcels.module';

@Module({
  imports: [ClimateModule, ParcelsModule],
  controllers: [AlertsController],
  providers: [AlertsService, BedrockService],
  exports: [AlertsService],
})
export class AlertsModule {}
