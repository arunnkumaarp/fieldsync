import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';
import { diffSubmissionFields } from './conflict-diff.util';

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

  // Called by the mobile app when its OWN client-side conflict detection
  // (WatermelonDB's `conflictResolver`, invoked while pulling) finds that a
  // pending local edit collides with a newer server version. This exists
  // because of a timing gap in WatermelonDB's sync protocol: `synchronize()`
  // always pulls immediately before it pushes, so by the time our push
  // endpoint's own staleness check runs, `last_pulled_at` has already been
  // refreshed by that same pull — the offline-edit-vs-newer-server-edit
  // conflict the push check is meant to catch has, by then, already been
  // silently merged away on the client. The mobile app's conflictResolver
  // catches it earlier (while it still has both versions in hand) and
  // reports it here instead of trusting the client to resolve it silently.
  // The diff is re-computed against whatever is *currently* in the database
  // (not a value the client sent) — if nothing actually differs anymore
  // (e.g. a duplicate report from a retried request), this is a no-op.
  async reportConflict(orgId: string, submissionId: string, localData: Record<string, unknown>) {
    const submission = await this.findOne(orgId, submissionId);
    const diffs = diffSubmissionFields(localData, (submission.data as Record<string, unknown>) ?? {});
    if (diffs.length === 0) return submission;

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const diff of diffs) {
        await tx.conflictLog.create({
          data: {
            submissionId,
            fieldName: diff.fieldName,
            localValue: diff.localValue as any,
            remoteValue: diff.remoteValue as any,
          },
        });
      }
      return tx.submission.update({
        where: { id: submissionId },
        data: { needsReview: true, lastModified: new Date() },
        include: { conflictLogs: true, attachments: true },
      });
    });

    this.realtime.emitSubmissionConflict(orgId, updated);
    return updated;
  }
}
