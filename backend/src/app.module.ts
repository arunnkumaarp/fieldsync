import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { SyncModule } from './sync/sync.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    JobsModule,
    SubmissionsModule,
    AttachmentsModule,
    SyncModule,
    RealtimeModule,
  ],
})
export class AppModule {}
