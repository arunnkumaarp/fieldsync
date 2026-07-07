// Wire shapes follow the @nozbe/watermelondb/sync `SyncDatabaseChangeSet` format:
// one `{ created, updated, deleted }` bucket per table, with rows keyed in
// snake_case to mirror the mobile app's WatermelonDB column names.

export interface TableChangeSet {
  created: Record<string, any>[];
  updated: Record<string, any>[];
  deleted: string[];
}

export interface PushChangesBody {
  jobs?: TableChangeSet;
  submissions?: TableChangeSet;
  attachments?: TableChangeSet;
}

export type RejectReason = 'conflict' | 'stale-delete' | 'forbidden' | 'missing-job' | 'missing-submission';

export interface RejectedRecord {
  table: 'jobs' | 'submissions' | 'attachments';
  id: string;
  reason: RejectReason;
  conflictLogIds?: string[];
  serverLastModified?: number;
}

export interface PushSyncResult {
  rejected: RejectedRecord[];
  serverTimestamp: number;
}

export interface PullSyncResult {
  changes: {
    jobs: TableChangeSet;
    submissions: TableChangeSet;
    attachments: TableChangeSet;
  };
  timestamp: number;
}
