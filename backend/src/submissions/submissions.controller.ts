import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';
import { ReportConflictDto } from './dto/report-conflict.dto';

@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('needsReview') needsReview?: string,
    @Query('jobId') jobId?: string,
    @Query('technicianId') technicianId?: string,
    @Query('jobStatus') jobStatus?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.submissionsService.findAllForOrg(user.orgId, {
      needsReview: needsReview === undefined ? undefined : needsReview === 'true',
      jobId,
      technicianId,
      jobStatus,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.submissionsService.findOne(user.orgId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSubmissionDto) {
    return this.submissionsService.create(user.orgId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSubmissionDto) {
    return this.submissionsService.update(user.orgId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.submissionsService.softDelete(user.orgId, id);
  }

  @Post(':id/resolve')
  resolve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ResolveConflictDto) {
    return this.submissionsService.resolveConflict(user.orgId, id, dto);
  }

  @Post(':id/report-conflict')
  reportConflict(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReportConflictDto) {
    return this.submissionsService.reportConflict(user.orgId, id, dto.localData);
  }
}
