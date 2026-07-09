import { appSchema, tableSchema } from '@nozbe/watermelondb';

// Column names mirror the backend's sync wire format 1:1 (see
// backend/src/sync/sync.mappers.ts) so the sync adapter (added in phase 3)
// can pass rows through with minimal translation. `deleted_at` is
// deliberately not a local column: WatermelonDB represents "deleted" via its
// own internal bookkeeping (`_status`) and pulled deletions are applied by
// destroying the local row outright, not by flagging a column.
export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'jobs',
      columns: [
        { name: 'org_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'assigned_to', type: 'string', isOptional: true },
        { name: 'location_lat', type: 'number', isOptional: true },
        { name: 'location_lng', type: 'number', isOptional: true },
        { name: 'last_modified', type: 'number' },
        { name: 'server_created_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'submissions',
      columns: [
        { name: 'job_id', type: 'string', isIndexed: true },
        // JSON-encoded string — WatermelonDB/SQLite columns are scalar only.
        // See Submission.data getter/setter for the parse/stringify boundary.
        { name: 'data', type: 'string' },
        { name: 'needs_review', type: 'boolean' },
        { name: 'last_modified', type: 'number' },
        { name: 'server_created_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'attachments',
      columns: [
        { name: 'submission_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' },
        { name: 'local_uri', type: 'string', isOptional: true },
        { name: 'remote_url', type: 'string', isOptional: true },
        { name: 'last_modified', type: 'number' },
        { name: 'server_created_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});
