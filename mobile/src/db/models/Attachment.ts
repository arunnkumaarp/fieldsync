import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type Submission from './Submission';

export default class Attachment extends Model {
  static table = 'attachments';

  static associations = {
    submissions: { type: 'belongs_to' as const, key: 'submission_id' },
  };

  @field('submission_id') submissionId!: string;
  @field('type') type!: 'photo' | 'signature';
  @field('local_uri') localUri?: string;
  @field('remote_url') remoteUrl?: string;
  @date('last_modified') lastModified!: Date;
  @readonly @date('server_created_at') serverCreatedAt?: Date;

  @relation('submissions', 'submission_id') submission!: Submission;
}
