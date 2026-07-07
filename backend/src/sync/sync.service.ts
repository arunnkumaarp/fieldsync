import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { attachmentToWire, jobToWire, splitChangeSet, submissionToWire } from './sync.mappers';
import { PullSyncResult, PushChangesBody, PushSyncResult, RejectedRecord, TableChangeSet } from './sync.types';

type Tx = Prisma.TransactionClient;

const EPOCH = new Date(0);

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  /**
   * Pull: everything the org changed since `lastPulledAtMs`, captured
   * consistently. `SELECT now()` is issued inside the same transaction as
   * the three table queries and used as both the upper bound for those
   * queries and the `timestamp` handed back to the client. That guarantees
   * the next pull's `last_pulled_at` picks up exactly where this one left
   * off — no row can be missed (it would have last_modified > now) and no
   * row can be double-counted (a row modified after `now` is excluded here
   * and will show up on the next pull instead).
   */
  async pull(orgId: string, lastPulledAtMs?: number): Promise<PullSyncResult> {
    const lastPulledAt = lastPulledAtMs ? new Date(lastPulledAtMs) : EPOCH;

    return this.prisma.$transaction(async (tx) => {
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT now() as now`;

      const jobs = await tx.job.findMany({
        where: { orgId, lastModified: { gt: lastPulledAt, lte: now } },
      });
      const submissions = await tx.submission.findMany({
        where: { job: { orgId }, lastModified: { gt: lastPulledAt, lte: now } },
      });
      const attachments = await tx.attachment.findMany({
        where: { submission: { job: { orgId } }, lastModified: { gt: lastPulledAt, lte: now } },
      });

      return {
        changes: {
          jobs: splitChangeSet(jobs, jobToWire) as TableChangeSet,
          submissions: splitChangeSet(submissions, submissionToWire) as TableChangeSet,
          attachments: splitChangeSet(attachments, attachmentToWire) as TableChangeSet,
        },
        timestamp: now.getTime(),
      };
    });
  }

  /**
   * Push: applies the client's local changes inside one transaction. Every
   * record is checked against `lastPulledAtMs` (the client's own bookkeeping
   * of when it last synced) — if the server's copy was modified after that
   * moment, someone else's write is about to be clobbered, so this record is
   * rejected rather than applied.
   *
   * "Transactional, all-or-nothing" describes the *batch of decisions*, not
   * an insistence that a single stale record must fail the whole push: all
   * applied writes, all conflict_logs rows, and all needs_review flips commit
   * together or not at all, so a crash mid-push can never leave the database
   * with an attachment pointing at a submission that was never created, or a
   * conflict flagged without its log entry. Individual stale records are
   * reported back in `rejected`; the caller (mobile app) re-pulls to get the
   * authoritative state and reconciles before retrying.
   */
  async push(orgId: string, lastPulledAtMs: number, changes: PushChangesBody): Promise<PushSyncResult> {
    const lastPulledAt = new Date(lastPulledAtMs || 0);
    const rejected: RejectedRecord[] = [];
    const touchedSubmissionIds = new Set<string>();
    const conflictedSubmissionIds = new Set<string>();
    const touchedJobIds = new Set<string>();

    await this.prisma.$transaction(async (tx) => {
      await this.applyJobChanges(tx, orgId, changes.jobs, lastPulledAt, rejected, touchedJobIds);
      await this.applySubmissionChanges(
        tx,
        orgId,
        changes.submissions,
        lastPulledAt,
        rejected,
        touchedSubmissionIds,
        conflictedSubmissionIds,
      );
      await this.applyAttachmentChanges(tx, orgId, changes.attachments, lastPulledAt, rejected);
    });

    if (rejected.length > 0) {
      this.logger.warn(`push for org ${orgId} rejected ${rejected.length} record(s)`);
    }

    // The realtime channel's only consumer is the web dashboard, which reads
    // the REST endpoints via TanStack Query — so broadcasts here intentionally
    // mirror the REST (camelCase) shape, not the sync wire (snake_case) shape
    // used between mobile and this endpoint. Mixing the two on one channel
    // would force the dashboard to normalize two different key casings for
    // the same event type.
    for (const jobId of touchedJobIds) {
      const job = await this.prisma.job.findUnique({ where: { id: jobId } });
      if (job) this.realtime.emitJobUpsert(orgId, job);
    }
    for (const id of touchedSubmissionIds) {
      const submission = await this.prisma.submission.findUnique({
        where: { id },
        include: { attachments: true, conflictLogs: { where: { resolved: false } } },
      });
      if (submission) this.realtime.emitSubmissionUpsert(orgId, submission);
    }
    for (const id of conflictedSubmissionIds) {
      const submission = await this.prisma.submission.findUnique({
        where: { id },
        include: { attachments: true, conflictLogs: { where: { resolved: false } } },
      });
      if (submission) this.realtime.emitSubmissionConflict(orgId, submission);
    }

    return { rejected, serverTimestamp: Date.now() };
  }

  private async applyJobChanges(
    tx: Tx,
    orgId: string,
    changes: TableChangeSet | undefined,
    lastPulledAt: Date,
    rejected: RejectedRecord[],
    touched: Set<string>,
  ) {
    if (!changes) return;

    for (const raw of [...changes.created, ...changes.updated]) {
      const id = raw.id as string;
      const existing = await tx.job.findUnique({ where: { id } });

      if (existing && existing.orgId !== orgId) {
        rejected.push({ table: 'jobs', id, reason: 'forbidden' });
        continue;
      }

      if (!existing) {
        await tx.job.create({
          data: {
            id,
            orgId,
            title: raw.title ?? '',
            description: raw.description ?? null,
            status: raw.status ?? undefined,
            assignedTo: raw.assigned_to ?? null,
            locationLat: raw.location_lat ?? null,
            locationLng: raw.location_lng ?? null,
          },
        });
        touched.add(id);
        continue;
      }

      if (existing.lastModified > lastPulledAt) {
        rejected.push({ table: 'jobs', id, reason: 'conflict', serverLastModified: existing.lastModified.getTime() });
        continue;
      }

      await tx.job.update({
        where: { id },
        data: {
          title: raw.title ?? existing.title,
          description: raw.description ?? existing.description,
          status: raw.status ?? existing.status,
          assignedTo: raw.assigned_to ?? existing.assignedTo,
          locationLat: raw.location_lat ?? existing.locationLat,
          locationLng: raw.location_lng ?? existing.locationLng,
          lastModified: new Date(),
        },
      });
      touched.add(id);
    }

    for (const id of changes.deleted ?? []) {
      const existing = await tx.job.findUnique({ where: { id } });
      if (!existing || existing.orgId !== orgId) continue;

      if (existing.lastModified > lastPulledAt) {
        rejected.push({ table: 'jobs', id, reason: 'stale-delete' });
        continue;
      }

      await tx.job.update({ where: { id }, data: { deletedAt: new Date(), lastModified: new Date() } });
      touched.add(id);
    }
  }

  private async applySubmissionChanges(
    tx: Tx,
    orgId: string,
    changes: TableChangeSet | undefined,
    lastPulledAt: Date,
    rejected: RejectedRecord[],
    touched: Set<string>,
    conflicted: Set<string>,
  ) {
    if (!changes) return;

    for (const raw of [...changes.created, ...changes.updated]) {
      const id = raw.id as string;
      const existing = await tx.submission.findUnique({ where: { id }, include: { job: true } });

      if (existing && existing.job.orgId !== orgId) {
        rejected.push({ table: 'submissions', id, reason: 'forbidden' });
        continue;
      }

      if (!existing) {
        const job = await tx.job.findFirst({ where: { id: raw.job_id, orgId, deletedAt: null } });
        if (!job) {
          rejected.push({ table: 'submissions', id, reason: 'missing-job' });
          continue;
        }
        await tx.submission.create({ data: { id, jobId: raw.job_id, data: raw.data ?? {} } });
        touched.add(id);
        continue;
      }

      if (existing.lastModified > lastPulledAt) {
        // The submission changed on the server since the client last pulled.
        // Diff the two JSON blobs field by field, log every field that
        // actually differs, and flag the submission for human review instead
        // of silently picking a winner or applying the client's stale data.
        const localData = (raw.data ?? {}) as Record<string, unknown>;
        const remoteData = (existing.data ?? {}) as Record<string, unknown>;
        const fieldNames = new Set([...Object.keys(localData), ...Object.keys(remoteData)]);
        const conflictLogIds: string[] = [];

        for (const field of fieldNames) {
          const localValue = localData[field] ?? null;
          const remoteValue = remoteData[field] ?? null;
          if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
            const log = await tx.conflictLog.create({
              data: { submissionId: id, fieldName: field, localValue: localValue as any, remoteValue: remoteValue as any },
            });
            conflictLogIds.push(log.id);
          }
        }

        if (conflictLogIds.length > 0) {
          await tx.submission.update({ where: { id }, data: { needsReview: true, lastModified: new Date() } });
          conflicted.add(id);
        }

        rejected.push({ table: 'submissions', id, reason: 'conflict', conflictLogIds });
        continue;
      }

      await tx.submission.update({
        where: { id },
        data: { data: (raw.data ?? existing.data) as any, lastModified: new Date() },
      });
      touched.add(id);
    }

    for (const id of changes.deleted ?? []) {
      const existing = await tx.submission.findUnique({ where: { id }, include: { job: true } });
      if (!existing || existing.job.orgId !== orgId) continue;

      if (existing.lastModified > lastPulledAt) {
        rejected.push({ table: 'submissions', id, reason: 'stale-delete' });
        continue;
      }

      await tx.submission.update({ where: { id }, data: { deletedAt: new Date(), lastModified: new Date() } });
      touched.add(id);
    }
  }

  private async applyAttachmentChanges(
    tx: Tx,
    orgId: string,
    changes: TableChangeSet | undefined,
    lastPulledAt: Date,
    rejected: RejectedRecord[],
  ) {
    if (!changes) return;

    for (const raw of [...changes.created, ...changes.updated]) {
      const id = raw.id as string;
      const existing = await tx.attachment.findUnique({ where: { id }, include: { submission: { include: { job: true } } } });

      if (existing && existing.submission.job.orgId !== orgId) {
        rejected.push({ table: 'attachments', id, reason: 'forbidden' });
        continue;
      }

      if (!existing) {
        const submission = await tx.submission.findFirst({
          where: { id: raw.submission_id, job: { orgId }, deletedAt: null },
        });
        if (!submission) {
          rejected.push({ table: 'attachments', id, reason: 'missing-submission' });
          continue;
        }
        await tx.attachment.create({
          data: {
            id,
            submissionId: raw.submission_id,
            type: raw.type,
            localUri: raw.local_uri ?? null,
            remoteUrl: raw.remote_url ?? null,
          },
        });
        continue;
      }

      if (existing.lastModified > lastPulledAt) {
        rejected.push({ table: 'attachments', id, reason: 'conflict', serverLastModified: existing.lastModified.getTime() });
        continue;
      }

      await tx.attachment.update({
        where: { id },
        data: {
          localUri: raw.local_uri ?? existing.localUri,
          remoteUrl: raw.remote_url ?? existing.remoteUrl,
          lastModified: new Date(),
        },
      });
    }

    for (const id of changes.deleted ?? []) {
      const existing = await tx.attachment.findUnique({ where: { id }, include: { submission: { include: { job: true } } } });
      if (!existing || existing.submission.job.orgId !== orgId) continue;

      if (existing.lastModified > lastPulledAt) {
        rejected.push({ table: 'attachments', id, reason: 'stale-delete' });
        continue;
      }

      await tx.attachment.update({ where: { id }, data: { deletedAt: new Date(), lastModified: new Date() } });
    }
  }
}
