import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/react';
import Submission from '../db/models/Submission';
import Attachment from '../db/models/Attachment';

export function useSubmissionsForJob(jobId: string): Submission[] {
  const database = useDatabase();
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const query = database
      .get<Submission>('submissions')
      .query(Q.where('job_id', jobId), Q.sortBy('last_modified', Q.desc));
    const subscription = query.observe().subscribe(setSubmissions);
    return () => subscription.unsubscribe();
  }, [database, jobId]);

  return submissions;
}

export function useAttachmentsForSubmission(submissionId: string): Attachment[] {
  const database = useDatabase();
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    const query = database.get<Attachment>('attachments').query(Q.where('submission_id', submissionId));
    const subscription = query.observe().subscribe(setAttachments);
    return () => subscription.unsubscribe();
  }, [database, submissionId]);

  return attachments;
}
