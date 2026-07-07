import { IsObject } from 'class-validator';
import { PushChangesBody } from '../sync.types';

// The per-table shape is dynamic (jobs/submissions/attachments, each with
// created/updated/deleted arrays of loosely-typed rows), so we validate only
// that `changes` is an object and let SyncService's own checks (existence,
// org ownership, timestamp comparison) guard against malformed rows.
export class PushSyncDto {
  @IsObject()
  changes: PushChangesBody;
}
