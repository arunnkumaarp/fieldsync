// Mirrors the backend's REST response shapes (camelCase) — see
// backend/src/*/​*.service.ts. Not the sync wire format (that's snake_case
// and only used between the backend and the mobile app).

export type Role = 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';
export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AttachmentType = 'photo' | 'signature';

export interface PublicUser {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  lastModified: string;
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
  assignee?: PublicUser | null;
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

export interface Submission {
  id: string;
  jobId: string;
  data: Record<string, unknown>;
  needsReview: boolean;
  lastModified: string;
  serverCreatedAt: string;
  deletedAt: string | null;
  attachments: Attachment[];
  conflictLogs: ConflictLog[];
  job?: Job;
}

export interface LoginResponse {
  accessToken: string;
  user: { id: string; orgId: string; name: string; email: string; role: Role };
}
