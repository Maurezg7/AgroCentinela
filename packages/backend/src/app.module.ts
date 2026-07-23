import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DynamoModule } from './dynamo/dynamo.module';
import { ParcelsModule } from './parcels/parcels.module';
import { ClimateModule } from './climate/climate.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DynamoModule,
    ParcelsModule,
    ClimateModule,
    AlertsModule,
  ],
})
export class AppModule {}
