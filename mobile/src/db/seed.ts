import { Database } from '@nozbe/watermelondb';
import { v4 as uuidv4 } from 'uuid';
import type Job from './models/Job';
import type Submission from './models/Submission';

// Phase 2 has no sync yet, so without this the app would boot to an empty
// job list and there'd be nothing to demo offline capture against. This
// mirrors backend/prisma/seed.ts's org/jobs so the two look related, but the
// ids are intentionally different (this data isn't meant to reconcile with
// the server — phase 3 replaces it with a real pull on first sync).
const DEMO_ORG_ID = 'demo-org';

export async function seedDemoDataIfEmpty(database: Database): Promise<void> {
  const jobsCollection = database.get<Job>('jobs');
  const existingCount = await jobsCollection.query().fetchCount();
  if (existingCount > 0) return;

  await database.write(async () => {
    const now = Date.now();

    const job1 = await jobsCollection.create((job) => {
      job._raw.id = uuidv4();
      job.orgId = DEMO_ORG_ID;
      job.status = 'IN_PROGRESS';
      job.title = 'Inspect rooftop HVAC unit';
      job.description = 'Quarterly inspection, check refrigerant levels';
      job.locationLat = 37.7749;
      job.locationLng = -122.4194;
      job.lastModified = new Date(now);
    });

    await jobsCollection.create((job) => {
      job._raw.id = uuidv4();
      job.orgId = DEMO_ORG_ID;
      job.status = 'PENDING';
      job.title = 'Replace water heater';
      job.description = 'Unit at 45 Market St, tenant reports no hot water';
      job.locationLat = 37.7935;
      job.locationLng = -122.3964;
      job.lastModified = new Date(now);
    });

    await jobsCollection.create((job) => {
      job._raw.id = uuidv4();
      job.orgId = DEMO_ORG_ID;
      job.status = 'COMPLETED';
      job.title = 'Fire extinguisher recertification';
      job.description = 'Annual recert for floors 1-3';
      job.locationLat = 37.7858;
      job.locationLng = -122.4064;
      job.lastModified = new Date(now);
    });

    const submissionsCollection = database.get<Submission>('submissions');
    await submissionsCollection.create((submission) => {
      submission._raw.id = uuidv4();
      submission.jobId = job1.id;
      submission.data = { notes: 'No issues found on first pass', refrigerant_psi: 118 };
      submission.needsReview = false;
      submission.lastModified = new Date(now);
    });
  });
}
