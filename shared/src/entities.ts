// Mirrors backend/prisma/schema.prisma. Keep in sync by hand — this package
// is a reference, not a build dependency of backend/mobile/web (each of
// those is independently deployable and may vendor its own copy).

export type Role = 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';
export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AttachmentType = 'photo' | 'signature';

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  lastModified: string; // ISO timestamp over REST, epoch ms over sync wire
}

export interface Job {
  id: string;
  orgId: string;
  status: JobStatus;
  title: string;
  description: string | null;
  assignedTo: string | null;
  locationLat: number | null;
  locationLng: number | null;
  lastModified: string;
  serverCreatedAt: string;
  deletedAt: string | null;
}

export interface Submission {
  id: string;
  jobId: string;
  data: Record<string, unknown>;
  needsReview: boolean;
  lastModified: string;
  serverCreatedAt: string;
  deletedAt: string | null;
}

export interface Attachment {
  id: string;
  submissionId: string;
  type: AttachmentType;
  localUri: string | null;
  remoteUrl: string | null;
  lastModified: string;
  serverCreatedAt: string;
  deletedAt: string | null;
}

export interface ConflictLog {
  id: string;
  submissionId: string;
  fieldName: string;
  localValue: unknown;
  remoteValue: unknown;
  resolved: boolean;
  resolvedValue: unknown;
  createdAt: string;
}
