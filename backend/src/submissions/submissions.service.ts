import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  // Submissions are scoped to an org through their parent job, so listing
  // requires a join rather than a direct org_id column on the table.
  findAllForOrg(orgId: string, filters: { needsReview?: boolean; jobId?: string }) {
    return this.prisma.submission.findMany({
      where: {
        deletedAt: null,
        needsReview: filters.needsReview,
        jobId: filters.jobId,
        job: { orgId },
      },
      include: { attachments: true, conflictLogs: { where: { resolved: false } } },
      orderBy: { lastModified: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { id, deletedAt: null, job: { orgId } },
      include: { attachments: true, conflictLogs: true, job: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async create(orgId: string, dto: CreateSubmissionDto) {
    const job = await this.prisma.job.findFirst({ where: { id: dto.jobId, orgId, deletedAt: null } });
    if (!job) throw new NotFoundException('Job not found');

    const submission = await this.prisma.submission.create({
      data: { jobId: dto.jobId, data: dto.data as any },
    });
    this.realtime.emitSubmissionUpsert(orgId, submission);
    return submission;
  }

  async update(orgId: string, id: string, dto: UpdateSubmissionDto) {
    await this.findOne(orgId, id);
    const submission = await this.prisma.submission.update({
      where: { id },
      data: { data: dto.data as any, lastModified: new Date() },
    });
    this.realtime.emitSubmissionUpsert(orgId, submission);
    return submission;
  }

  async softDelete(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.submission.update({
      where: { id },
      data: { deletedAt: new Date(), lastModified: new Date() },
    });
  }

  // Applies an admin's choice for a single logged field conflict: writes the
  // chosen value onto submission.data, marks the conflict_logs row resolved,
  // and clears needs_review once every conflict on the submission is
  // resolved. Runs in a transaction so the submission and its conflict log
  // never disagree about resolution state.
  async resolveConflict(orgId: string, submissionId: string, dto: ResolveConflictDto) {
    const submission = await this.findOne(orgId, submissionId);
    const log = submission.conflictLogs.find((l) => l.id === dto.conflictLogId);
    if (!log) throw new NotFoundException('Conflict log not found for this submission');
    if (log.resolved) throw new BadRequestException('Conflict already resolved');

    const resolvedValue =
      dto.choice === 'local' ? log.localValue : dto.choice === 'remote' ? log.remoteValue : dto.customValue;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.conflictLog.update({
        where: { id: log.id },
        data: { resolved: true, resolvedValue: resolvedValue as any },
      });

      const currentData = (submission.data as Record<string, unknown>) ?? {};
      const nextData = { ...currentData, [log.fieldName]: resolvedValue };

      const remainingUnresolved = await tx.conflictLog.count({
        where: { submissionId, resolved: false, id: { not: log.id } },
      });

      return tx.submission.update({
        where: { id: submissionId },
        data: {
          data: nextData as any,
          needsReview: remainingUnresolved > 0,
          lastModified: new Date(),
        },
        include: { conflictLogs: true, attachments: true },
      });
    });

    this.realtime.emitSubmissionUpsert(orgId, updated);
    return updated;
  }
}
