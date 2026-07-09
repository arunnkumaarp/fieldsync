import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [RealtimeModule],
  providers: [SyncService],
  controllers: [SyncController],
})
export class SyncModule {}
