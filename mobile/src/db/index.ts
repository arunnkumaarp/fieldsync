import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import Job from './models/Job';
import Submission from './models/Submission';
import Attachment from './models/Attachment';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'fieldsync',
  jsi: true,
  onSetUpError: (error) => {
    console.error('WatermelonDB failed to set up', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Job, Submission, Attachment],
});
