# FieldSync Backend

NestJS + Prisma + PostgreSQL API that implements the [WatermelonDB sync
protocol](https://watermelondb.dev/docs/Sync/Backend) for the FieldSync
mobile app, plus the REST API and realtime feed the web dashboard uses.

## Modules

| Module | Responsibility |
|---|---|
| `auth` | JWT login, `JwtStrategy`/`JwtAuthGuard`, `RolesGuard` for org/role-scoped access |
| `sync` | `GET /sync` (pull) and `POST /sync` (push) — see [Sync protocol](#sync-protocol) below |
| `jobs` | CRUD for job records |
| `submissions` | CRUD, conflict resolution (`POST /submissions/:id/resolve`) |
| `attachments` | Signed upload URLs (S3/R2-compatible) + attachment records |
| `users` | User/org management |
| `prisma` | Global `PrismaService`/`PrismaModule` |
| `realtime` | WebSocket gateway (`/realtime` namespace) broadcasting live updates to the web dashboard |

Every table that participates in sync (`jobs`, `submissions`, `attachments`)
carries the same three columns:

- **`last_modified`** — bumped by the **server** on every write (Prisma
  `@updatedAt`, or set explicitly inside the sync transaction). Client-supplied
  values for this column are always ignored — trusting a device's clock would
  let a client fabricate an old timestamp to bypass conflict detection.
- **`server_created_at`** — set once, at insert time, by the server.
- **`deleted_at`** — soft-delete marker. Rows are never hard-deleted so a
  deletion can be replicated to every other client as a change record.

## Sync protocol

### Pull — `GET /sync?last_pulled_at=<ms>`

Returns everything in the caller's org that changed after `last_pulled_at`
(omit it, or pass `0`, for an initial full sync):

```json
{
  "changes": {
    "jobs": { "created": [], "updated": [ { "id": "...", "org_id": "...", "last_modified": 1234, ... } ], "deleted": ["id1"] },
    "submissions": { "created": [...], "updated": [...], "deleted": [...] },
    "attachments": { "created": [...], "updated": [...], "deleted": [...] }
  },
  "timestamp": 1735689600000
}
```

The whole pull runs in one transaction: `SELECT now()` is issued first and
reused both as the upper bound for every table query (`last_modified > last_pulled_at AND last_modified <= now`)
and as the `timestamp` returned to the client for its *next* pull. Capturing
"now" once, inside the same transaction as the reads, is what "mark server
time atomically with the query" means in practice — it guarantees the next
pull's lower bound lines up exactly with this pull's upper bound: no row can
fall in the gap (a row modified after `now` fails the `<= now` check here and
will simply appear on the next pull instead) and no row can appear twice.

Rows are returned in wire format matching WatermelonDB's `SyncDatabaseChangeSet`
(snake_case keys, e.g. `org_id`, `last_modified`, timestamps as epoch ms).
Everything non-deleted is reported under `updated` — WatermelonDB's client
applies `created` and `updated` identically (both upsert into SQLite), so the
split is purely informational and there's no way for the server to know
which of *this* pull's rows the calling device has never seen before.
Soft-deleted rows are reported by id only, under `deleted`.

One deliberate wire-format quirk: `submissions.data` is sent as a **JSON-encoded
string**, not a nested object, even though the REST API (`GET /submissions/:id`)
returns it as a real object. This isn't an inconsistency — it's required.
WatermelonDB's mobile schema declares `data` as a plain `'string'` SQLite
column (SQLite has no JSON column type), and the sync layer applies pulled
rows at that raw-column level, bypassing the `@json` model decorator that
would otherwise parse it. Sending a real object here gets silently coerced to
`''` by WatermelonDB's raw-value sanitizer (any non-string value into a
`'string'`-typed column becomes empty) — every submission's data would be
wiped on pull. `parseSubmissionDataFromWire()` in `sync.mappers.ts` is the
inverse, applied on push.

### Push — `POST /sync?last_pulled_at=<ms>`

Body:

```json
{ "changes": { "jobs": {...}, "submissions": {...}, "attachments": {...} } }
```

For every created/updated row, the server compares the *existing* server
row's `last_modified` against the `last_pulled_at` query param (the client's
own record of when it last synced):

- **No existing row** → insert it (server sets `last_modified`/`server_created_at`, ignoring anything the client sent for those columns).
- **`server.last_modified <= last_pulled_at`** → the client had the latest version before it edited, so the write is safe. Applied normally.
- **`server.last_modified > last_pulled_at`** → someone else changed this row after the client's last pull. **Conflict.**

Conflict handling differs by table, because only `submissions` has a
`needs_review` flag and a `conflict_logs` table to hang a diff off of:

- **`jobs` / `attachments`**: the incoming write is rejected outright — the
  server's version is left untouched. The id is reported back in `rejected`
  with `reason: "conflict"`.
- **`submissions`**: the server does *not* pick a winner. It diffs the
  client's proposed `data` JSON against the server's current `data`
  field-by-field, writes one `conflict_logs` row per field that actually
  differs (`local_value` / `remote_value`), and sets `needs_review = true`.
  The submission's `data` is left as the server's version — the client's
  edit is not silently discarded, it's preserved in `conflict_logs.local_value`
  pending a human decision. The id is reported in `rejected` with the ids of
  the `conflict_logs` rows that were created.

Everything above — every applied insert/update/delete, every `conflict_logs`
row, every `needs_review` flip — happens inside one Prisma `$transaction`.
That's what "transactional, all-or-nothing" means here: the *set of
decisions* for this push (which rows apply cleanly, which are flagged, which
are rejected) commits atomically, so a crash mid-push can never leave, say,
an attachment pointing at a submission that was never actually created, or a
`needs_review = true` submission with no matching `conflict_logs` row. It
does **not** mean one stale record poisons the whole batch — the response
lists exactly which records were rejected so the caller can re-pull, resolve,
and retry just those.

Response:

```json
{ "rejected": [ { "table": "submissions", "id": "...", "reason": "conflict", "conflictLogIds": ["..."] } ], "serverTimestamp": 1735689600000 }
```

### Conflict resolution — `POST /submissions/:id/resolve`

Used by the web dashboard's conflict review page. Body:
`{ "conflictLogId": "...", "choice": "local" | "remote" | "custom", "customValue"?: any }`.

Applies the chosen value onto `submissions.data[fieldName]`, marks that
`conflict_logs` row `resolved = true`, and clears `needs_review` once no
unresolved conflict logs remain for the submission — all inside one
transaction so the submission and its log can never disagree about
resolution state.

### Client-detected conflicts — `POST /submissions/:id/report-conflict`

Body: `{ "localData": { ...the client's pre-merge submission.data... } }`.

This exists because of a timing gap in WatermelonDB's own sync protocol that
the naive push-time staleness check above can't close. `synchronize()`
**always pulls immediately before it pushes** — so by the time a push
reaches this backend, `last_pulled_at` has already been refreshed by that
same call's pull. Concretely: if device A edits a submission offline, then
reconnects and syncs, then device B (also offline since before A's edit)
reconnects — B's *pull* phase fetches A's version and, by WatermelonDB's
default per-column merge rule, silently keeps B's local value for any field
B also touched. B's *push* phase then sends that merged data with a
`last_pulled_at` that's already fresh (from the pull moments earlier), so
the `existing.last_modified > last_pulled_at` check never fires — the
conflict already happened, invisibly, entirely on B's device.

The mobile app closes this gap with a custom WatermelonDB `conflictResolver`
(see `mobile/src/sync/conflictResolver.ts`) that runs during that pull-merge
step, while both versions are still available. It forces the resolution to
the server's value (so nothing is silently overwritten going forward) and
calls this endpoint with what the discarded local edit actually was. The
server re-diffs `localData` against whatever is *currently* stored (not a
value it's asked to trust) and only writes `conflict_logs` rows / flips
`needs_review` for fields that genuinely still differ — calling this twice
with the same already-resolved data is a no-op, not a duplicate conflict.

## Realtime

`RealtimeGateway` exposes a Socket.IO namespace at `/realtime`. Clients
connect with `auth: { token: <JWT> }`; the gateway verifies the token and
joins the socket to a room scoped to the caller's `org_id`, so one org never
sees another's events. Events, all scoped to the calling org's room:

- `submission.upsert` — a submission was created/updated (from either the
  REST API or a sync push that applied cleanly)
- `submission.conflict` — a sync push flagged a submission for review
- `job.upsert` — a job was created/updated

Payloads mirror the REST API's shape (camelCase) rather than the sync wire
format, since the dashboard merges these into a TanStack Query cache that was
populated from REST responses.

## Running locally

### Option A — Docker Compose (Postgres + backend)

```bash
cd backend
cp .env.example .env   # only needed if you want to run outside Docker too
docker compose up --build
```

This starts Postgres, waits for its healthcheck, then builds and starts the
backend, running `prisma migrate deploy` before boot. The API listens on
`http://localhost:3000`.

Seed data isn't run automatically in Docker — exec into the container once
it's up:

```bash
docker compose exec backend npx prisma db seed
```

### Option B — Node + local/external Postgres

```bash
cd backend
cp .env.example .env      # edit DATABASE_URL if not using the Docker Postgres
npm install
npx prisma migrate dev    # creates tables
npm run seed               # optional: sample org/users/jobs/submissions
npm run start:dev
```

### Seeded accounts

All seeded users share the password `password123`:

| Email | Role |
|---|---|
| `admin@fieldsync.dev` | ADMIN |
| `tom@fieldsync.dev` | TECHNICIAN |
| `rae@fieldsync.dev` | TECHNICIAN |

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@fieldsync.dev","password":"password123"}'
```

Use the returned `accessToken` as a `Bearer` token against any other route,
including `GET /sync` and `POST /sync?last_pulled_at=0`.

## Object storage (attachments)

`POST /attachments/signed-url` returns a presigned PUT URL from any
S3-compatible store (AWS S3, Cloudflare R2, MinIO). For local dev, run MinIO
alongside Postgres and point the `S3_*` env vars in `.env` at it — the
`.env.example` defaults already assume a local MinIO on `:9000` with the
default `minioadmin`/`minioadmin` credentials.
