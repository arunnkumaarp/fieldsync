import { Attachment, Job, Submission } from '@prisma/client';

const ms = (d: Date | null): number | null => (d ? d.getTime() : null);

export function jobToWire(job: Job) {
  return {
    id: job.id,
    org_id: job.orgId,
    status: job.status,
    title: job.title,
    description: job.description,
    assigned_to: job.assignedTo,
    location_lat: job.locationLat,
    location_lng: job.locationLng,
    last_modified: ms(job.lastModified),
    server_created_at: ms(job.serverCreatedAt),
    deleted_at: ms(job.deletedAt),
  };
}

export function submissionToWire(submission: Submission) {
  return {
    id: submission.id,
    job_id: submission.jobId,
    // JSON-encoded STRING, not the object itself. `data` is declared as a
    // plain 'string' column in the mobile app's WatermelonDB schema (SQLite
    // columns are scalar); WatermelonDB's sync layer applies pulled rows at
    // the raw-column level, bypassing the @json model decorator that would
    // otherwise parse it. Sending a real object here would get coerced to ''
    // by WatermelonDB's raw sanitizer (a non-string value into a 'string'
    // column). The REST API (SubmissionsController) intentionally does NOT
    // do this — only the sync wire format needs it.
    data: JSON.stringify(submission.data ?? {}),
    needs_review: submission.needsReview,
    last_modified: ms(submission.lastModified),
    server_created_at: ms(submission.serverCreatedAt),
    deleted_at: ms(submission.deletedAt),
  };
}

export function attachmentToWire(attachment: Attachment) {
  return {
    id: attachment.id,
    submission_id: attachment.submissionId,
    type: attachment.type,
    local_uri: attachment.localUri,
    remote_url: attachment.remoteUrl,
    last_modified: ms(attachment.lastModified),
    server_created_at: ms(attachment.serverCreatedAt),
    deleted_at: ms(attachment.deletedAt),
  };
}

// Inverse of the encoding in submissionToWire: a sync push's `data` arrives
// as a JSON-encoded string (WatermelonDB's raw column value), but REST
// clients (e.g. a future admin tool hitting SubmissionsController directly)
// could plausibly send a real object. Accept either.
export function parseSubmissionDataFromWire(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

// WatermelonDB's client applies `created` and `updated` rows identically
// (both become an upsert into the local SQLite table) — the split only
// exists for the server's own bookkeeping. Since every row here already
// existed before this pull, we report everything non-deleted as `updated`
// and let `deleted` carry soft-deleted ids; `created` is always empty.
export function splitChangeSet<T extends { deletedAt: Date | null; id: string }>(
  rows: T[],
  toWire: (row: T) => Record<string, unknown>,
) {
  const updated: Record<string, unknown>[] = [];
  const deleted: string[] = [];
  for (const row of rows) {
    if (row.deletedAt) deleted.push(row.id);
    else updated.push(toWire(row));
  }
  return { created: [], updated, deleted };
}
