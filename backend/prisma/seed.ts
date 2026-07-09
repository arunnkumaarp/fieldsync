import { PrismaClient, Role, JobStatus, AttachmentType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.create({
    data: { name: 'Acme Field Services' },
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      orgId: org.id,
      name: 'Ada Admin',
      email: 'admin@fieldsync.dev',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const tech1 = await prisma.user.create({
    data: {
      orgId: org.id,
      name: 'Tom Technician',
      email: 'tom@fieldsync.dev',
      passwordHash,
      role: Role.TECHNICIAN,
    },
  });

  const tech2 = await prisma.user.create({
    data: {
      orgId: org.id,
      name: 'Rae Technician',
      email: 'rae@fieldsync.dev',
      passwordHash,
      role: Role.TECHNICIAN,
    },
  });

  const job1 = await prisma.job.create({
    data: {
      orgId: org.id,
      title: 'Inspect rooftop HVAC unit',
      description: 'Quarterly inspection, check refrigerant levels',
      status: JobStatus.IN_PROGRESS,
      assignedTo: tech1.id,
      locationLat: 37.7749,
      locationLng: -122.4194,
    },
  });

  const job2 = await prisma.job.create({
    data: {
      orgId: org.id,
      title: 'Replace water heater',
      description: 'Unit at 45 Market St, tenant reports no hot water',
      status: JobStatus.PENDING,
      assignedTo: tech2.id,
      locationLat: 37.7935,
      locationLng: -122.3964,
    },
  });

  const job3 = await prisma.job.create({
    data: {
      orgId: org.id,
      title: 'Fire extinguisher recertification',
      description: 'Annual recert for floors 1-3',
      status: JobStatus.COMPLETED,
      assignedTo: tech1.id,
      locationLat: 37.7858,
      locationLng: -122.4064,
    },
  });

  const submission1 = await prisma.submission.create({
    data: {
      jobId: job1.id,
      data: {
        refrigerant_psi: 118,
        filter_condition: 'good',
        notes: 'No issues found',
      },
    },
  });

  await prisma.attachment.create({
    data: {
      submissionId: submission1.id,
      type: AttachmentType.photo,
      remoteUrl: 'https://picsum.photos/seed/fieldsync1/800/600',
    },
  });

  const submission2 = await prisma.submission.create({
    data: {
      jobId: job3.id,
      needsReview: true,
      data: {
        extinguishers_checked: 12,
        notes: 'Two units need replacement tags',
      },
    },
  });

  await prisma.conflictLog.create({
    data: {
      submissionId: submission2.id,
      fieldName: 'extinguishers_checked',
      localValue: 12,
      remoteValue: 14,
      resolved: false,
    },
  });

  await prisma.attachment.create({
    data: {
      submissionId: submission2.id,
      type: AttachmentType.signature,
      remoteUrl: 'https://picsum.photos/seed/fieldsync-sig/400/200',
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete:', {
    org: org.name,
    users: [admin.email, tech1.email, tech2.email],
    jobs: [job1.id, job2.id, job3.id],
    submissions: [submission1.id, submission2.id],
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
