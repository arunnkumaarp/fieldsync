import { Database } from '@nozbe/watermelondb';
import { v4 as uuidv4 } from 'uuid';
import Submission from './models/Submission';
import Attachment from './models/Attachment';

export async function createSubmission(
  database: Database,
  jobId: string,
  data: Record<string, unknown>,
): Promise<Submission> {
  const collection = database.get<Submission>('submissions');
  return database.write(async () =>
    collection.create((submission) => {
      submission._raw.id = uuidv4();
      submission.jobId = jobId;
      submission.data = data;
      submission.needsReview = false;
      submission.lastModified = new Date();
    }),
  );
}

export async function updateSubmissionData(
  submission: Submission,
  patch: Record<string, unknown>,
): Promise<Submission> {
  return submission.update((record) => {
    record.data = { ...record.data, ...patch };
    record.lastModified = new Date();
  });
}

export async function createAttachment(
  database: Database,
  submissionId: string,
  type: 'photo' | 'signature',
  localUri: string,
): Promise<Attachment> {
  const collection = database.get<Attachment>('attachments');
  return database.write(async () =>
    collection.create((attachment) => {
      attachment._raw.id = uuidv4();
      attachment.submissionId = submissionId;
      attachment.type = type;
      attachment.localUri = localUri;
      attachment.lastModified = new Date();
    }),
  );
}
