import { Model } from '@nozbe/watermelondb';
import { field, text, children, date, readonly } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type Submission from './Submission';

export default class Job extends Model {
  static table = 'jobs';

  static associations = {
    submissions: { type: 'has_many' as const, foreignKey: 'job_id' },
  };

  @text('org_id') orgId!: string;
  @text('status') status!: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  @text('title') title!: string;
  @text('description') description?: string;
  @text('assigned_to') assignedTo?: string;
  @field('location_lat') locationLat?: number;
  @field('location_lng') locationLng?: number;
  @date('last_modified') lastModified!: Date;
  @readonly @date('server_created_at') serverCreatedAt?: Date;

  @children('submissions') submissions!: Query<Submission>;
}
