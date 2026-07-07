// Wire types for GET/POST /sync — see backend/src/sync/sync.types.ts (the
// source of truth) and backend/README.md#sync-protocol for the full writeup.
// Rows on the wire use snake_case keys and epoch-ms timestamps, matching
// WatermelonDB's SyncDatabaseChangeSet convention.

export interface TableChangeSet {
  created: Record<string, any>[];
  updated: Record<string, any>[];
  deleted: string[];
}

export interface PullSyncResponse {
  changes: {
    jobs: TableChangeSet;
    submissions: TableChangeSet;
    attachments: TableChangeSet;
  };
  timestamp: number;
}

export interface PushSyncBody {
  changes: {
    jobs?: TableChangeSet;
    submissions?: TableChangeSet;
    attachments?: TableChangeSet;
  };
}

export type RejectReason = 'conflict' | 'stale-delete' | 'forbidden' | 'missing-job' | 'missing-submission';

export interface RejectedRecord {
  table: 'jobs' | 'submissions' | 'attachments';
  id: string;
  reason: RejectReason;
  conflictLogIds?: string[];
  serverLastModified?: number;
}

export interface PushSyncResponse {
  rejected: RejectedRecord[];
  serverTimestamp: number;
}

// Wire row shapes (snake_case) for each table, as returned by GET /sync.
export interface JobWire {
  id: string;
  org_id: string;
  status: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  location_lat: number | null;
  location_lng: number | null;
  last_modified: number | null;
  server_created_at: number | null;
  deleted_at: number | null;
}

export interface SubmissionWire {
  id: string;
  job_id: string;
  data: Record<string, unknown>;
  needs_review: boolean;
  last_modified: number | null;
  server_created_at: number | null;
  deleted_at: number | null;
}

export interface AttachmentWire {
  id: string;
  submission_id: string;
  type: 'photo' | 'signature';
  local_uri: string | null;
  remote_url: string | null;
  last_modified: number | null;
  server_created_at: number | null;
  deleted_at: number | null;
}
