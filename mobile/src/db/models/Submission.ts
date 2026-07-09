import { Model } from '@nozbe/watermelondb';
import { field, json, children, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type Job from './Job';
import type Attachment from './Attachment';

const sanitizeData = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

export default class Submission extends Model {
  static table = 'submissions';

  static associations = {
    jobs: { type: 'belongs_to' as const, key: 'job_id' },
    attachments: { type: 'has_many' as const, foreignKey: 'submission_id' },
  };

  @field('job_id') jobId!: string;
  // Stored as a JSON string column; @json transparently parses/stringifies
  // at the model boundary so callers work with a plain object.
  @json('data', sanitizeData) data!: Record<string, unknown>;
  @field('needs_review') needsReview!: boolean;
  @date('last_modified') lastModified!: Date;
  @readonly @date('server_created_at') serverCreatedAt?: Date;

  @relation('jobs', 'job_id') job!: Job;
  @children('attachments') attachments!: Query<Attachment>;
}
