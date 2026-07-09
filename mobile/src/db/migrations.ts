import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// No migrations yet — schema.ts is still at version 1. When a future phase
// adds a column (e.g. an `upload_status` on attachments for the offline
// upload queue), add a migration step here rather than editing existing
// column definitions in schema.ts.
export const migrations = schemaMigrations({
  migrations: [],
});
