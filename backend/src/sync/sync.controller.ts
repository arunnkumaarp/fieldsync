import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { SyncService } from './sync.service';
import { PushSyncDto } from './dto/push-sync.dto';

@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Get()
  pull(@CurrentUser() user: AuthenticatedUser, @Query('last_pulled_at') lastPulledAt?: string) {
    return this.syncService.pull(user.orgId, lastPulledAt ? Number(lastPulledAt) : undefined);
  }

  @Post()
  push(
    @CurrentUser() user: AuthenticatedUser,
    @Query('last_pulled_at') lastPulledAt: string,
    @Body() dto: PushSyncDto,
  ) {
    return this.syncService.push(user.orgId, Number(lastPulledAt), dto.changes);
  }
}
