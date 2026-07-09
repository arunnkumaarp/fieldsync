import { synchronize } from '@nozbe/watermelondb/sync';
import type { Database } from '@nozbe/watermelondb';
import type { SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync';
import type { ApiClient } from '../api/client';
import { createSubmissionConflictResolver, ConflictReport } from './conflictResolver';
import { processUploadQueue } from './uploadQueue';

interface PullResponse {
  changes: SyncDatabaseChangeSet;
  timestamp: number;
}

interface PushResponse {
  rejected: { table: string; id: string }[];
}

function toRejectedIds(rejected: PushResponse['rejected']): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const record of rejected) {
    (result[record.table] ??= []).push(record.id);
  }
  return result;
}

export interface SyncOutcome {
  rejectedCount: number;
  uploadedAttachmentCount: number;
}

// One "sync now": pull, apply, push, report any client-detected conflicts,
// then flush the local photo/signature upload queue. Rejected records (jobs
// or attachments the backend's own staleness check turned down) are simply
// left dirty by WatermelonDB — they'll be retried, and reconciled against
// fresh server state, on the next call to runSync (e.g. next pull-to-refresh
// or app foreground), same as any ordinary WatermelonDB app.
export async function runSync(database: Database, api: ApiClient): Promise<SyncOutcome> {
  const conflictReports: ConflictReport[] = [];
  let rejectedCount = 0;

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const result = await api.get<PullResponse>(`/sync?last_pulled_at=${lastPulledAt ?? 0}`);
      return { changes: result.changes, timestamp: result.timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      const result = await api.post<PushResponse>(`/sync?last_pulled_at=${lastPulledAt}`, { changes });
      rejectedCount = result.rejected?.length ?? 0;
      return { experimentalRejectedIds: toRejectedIds(result.rejected ?? []) };
    },
    conflictResolver: createSubmissionConflictResolver(conflictReports),
  });

  await Promise.all(
    conflictReports.map((report) =>
      api.post(`/submissions/${report.submissionId}/report-conflict`, { localData: report.localData }).catch(() => {
        // Best-effort: if this fails (offline again mid-sync, server hiccup),
        // the record stays flagged locally-dropped but not server-flagged.
        // Nothing is lost — the next sync's conflictResolver run will simply
        // find no diff (already resolved to remote) and skip it, but a
        // *future* genuine conflict on the same submission will report fine.
      }),
    ),
  );

  const uploadedAttachmentCount = await processUploadQueue(database, api);

  return { rejectedCount, uploadedAttachmentCount };
}
