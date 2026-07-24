import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { ParcelsModule } from '../parcels/parcels.module';

@Module({
  imports: [ParcelsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
