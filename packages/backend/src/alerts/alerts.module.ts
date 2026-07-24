import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { BedrockService } from './bedrock.service';
import { ClimateModule } from '../climate/climate.module';
import { ParcelsModule } from '../parcels/parcels.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [ClimateModule, ParcelsModule, PushModule],
  controllers: [AlertsController],
  providers: [AlertsService, BedrockService],
  exports: [AlertsService],
})
export class AlertsModule {}
