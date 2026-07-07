# @fieldsync/shared

Reference TypeScript types for the FieldSync data model and sync wire
format — mirrors `backend/prisma/schema.prisma` and `backend/src/sync/sync.types.ts`.

This is **not** a build dependency of `backend`, `mobile`, or `web` — each of
those is meant to be independently deployable and pushed to its own repo, so
each vendors its own copy of the types it needs rather than importing this
package at runtime. Treat this as the canonical reference to copy from (or,
if you later set up a real package registry / npm workspaces across the
three repos, to depend on directly) whenever the backend schema changes.

- `src/entities.ts` — REST-shaped (camelCase) entities: `User`, `Job`, `Submission`, `Attachment`, `ConflictLog`.
- `src/sync.ts` — sync wire types (snake_case rows, `TableChangeSet`, pull/push request/response shapes).

Keep this in sync by hand with `backend/prisma/schema.prisma` whenever a
column is added, renamed, or removed.
