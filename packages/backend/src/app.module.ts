import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DynamoModule } from './dynamo/dynamo.module';
import { ParcelsModule } from './parcels/parcels.module';
import { ClimateModule } from './climate/climate.module';
import { AlertsModule } from './alerts/alerts.module';
import { SyncModule } from './sync/sync.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DynamoModule,
    ParcelsModule,
    ClimateModule,
    AlertsModule,
    SyncModule,
    PushModule,
  ],
})
export class AppModule {}
