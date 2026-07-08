import { Prisma } from '@prisma/client';

// Never return passwordHash over the API — not even a bcrypt hash belongs in
// a response body. Used both for direct /users responses and anywhere else
// a user gets included via a relation (job.assignee, etc).
export const publicUserSelect = {
  id: true,
  orgId: true,
  name: true,
  email: true,
  role: true,
  lastModified: true,
} satisfies Prisma.UserSelect;
