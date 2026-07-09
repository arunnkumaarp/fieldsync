import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/react';
import Job from '../db/models/Job';

// WatermelonDB queries already exclude locally-deleted (`_status = 'deleted'`)
// records, so this is a plain reactive read of everything else.
export function useJobs(): Job[] {
  const database = useDatabase();
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const query = database.get<Job>('jobs').query(Q.sortBy('last_modified', Q.desc));
    const subscription = query.observe().subscribe(setJobs);
    return () => subscription.unsubscribe();
  }, [database]);

  return jobs;
}

export function useJob(jobId: string): Job | null {
  const database = useDatabase();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    let cancelled = false;
    const record = database.get<Job>('jobs').findAndObserve(jobId);
    const subscription = record.subscribe((next) => {
      if (!cancelled) setJob(next);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [database, jobId]);

  return job;
}
