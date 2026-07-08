import type { SyncConflictResolver } from '@nozbe/watermelondb/sync';

export interface ConflictReport {
  submissionId: string;
  localData: Record<string, unknown>;
}

function safeParseJson(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * WatermelonDB's synchronize() always pulls before it pushes, and its
 * default merge for a locally-dirty record colliding with a pulled remote
 * update keeps the local value for every column in `_changed` — silently,
 * on-device, with the backend never seeing that a conflict happened. That's
 * fine for most apps, but it defeats this app's whole point: a conflicting
 * edit to `submissions.data` needs to become a `needs_review` flag and a
 * `conflict_logs` entry the web dashboard can show a human, not a value that
 * just wins locally.
 *
 * This resolver runs during that pull-merge phase, while both the local
 * (about-to-be-overwritten) and remote (server truth) versions are still
 * available. For a real conflict on `submissions.data`, it:
 *   1. Queues the local/remote diff into `reports` (the caller — runSync —
 *      sends these to POST /submissions/:id/report-conflict once the pull
 *      transaction commits; this function must stay synchronous).
 *   2. Forces the resolution to the server's value and clears the local
 *      dirty flag for the fields it just discarded, so the very next push
 *      doesn't silently re-apply the stale edit now that its `_changed`
 *      marker would otherwise still be set.
 *
 * jobs/attachments don't have this treatment — there's no per-field log
 * table for them, so WatermelonDB's default per-column-local-wins merge is
 * left alone; the backend's push-time staleness check remains their only
 * (best-effort) conflict defense. See backend/README.md#sync-protocol.
 */
export function createSubmissionConflictResolver(reports: ConflictReport[]): SyncConflictResolver {
  return (table, local, remote, resolved) => {
    if (table !== 'submissions') return resolved;

    const changedColumns = (typeof local._changed === 'string' ? local._changed : '').split(',').filter(Boolean);
    if (!changedColumns.includes('data')) return resolved;

    const localData = safeParseJson(local.data);
    const remoteData = safeParseJson(remote.data);
    if (JSON.stringify(localData) === JSON.stringify(remoteData)) return resolved;

    reports.push({ submissionId: String(remote.id), localData });

    const remainingChanged = changedColumns.filter((c) => c !== 'data' && c !== 'needs_review').join(',');
    return {
      ...resolved,
      data: remote.data,
      needs_review: remote.needs_review,
      _changed: remainingChanged,
      _status: remainingChanged ? 'updated' : 'synced',
    };
  };
}
