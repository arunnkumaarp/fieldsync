# FieldSync Mobile

React Native + WatermelonDB app for offline-first field data capture, with
full sync against the backend: local-first CRUD, `synchronize()` wired to
`GET`/`POST /sync`, conflict detection/reconciliation, and a queued upload
path for photo/signature attachments.

## Stack

- React Native 0.86, TypeScript
- `@nozbe/watermelondb` — local SQLite database, reactive queries, sync engine
- `@react-navigation/native` (native-stack)
- `react-native-image-picker` for camera capture
- `react-native-svg` + `react-native-view-shot` for the signature pad (hand-rolled, snapshotted to a real PNG file)
- `@react-native-community/geolocation` for GPS auto-tagging
- `@react-native-async-storage/async-storage` — persists the JWT across app restarts (sync bookkeeping itself is persisted internally by WatermelonDB)

## Local data model

`src/db/schema.ts` defines three WatermelonDB tables — `jobs`, `submissions`,
`attachments` — with column names matching the backend's sync wire format
1:1 (`org_id`, `job_id`, `last_modified`, ...). See
`backend/README.md#sync-protocol` for why that mapping matters, including a
non-obvious detail: `submissions.data` travels the wire as a JSON-**string**,
not a nested object, because WatermelonDB's sync layer works at the raw
SQLite-column level (`@json` only parses at the Model getter/setter
boundary). There's also no local `deleted_at` column — WatermelonDB
represents "deleted" through its own internal `_status` bookkeeping, and a
pulled server-side deletion is applied by destroying the local row outright.

## Screens

- **Login** (`src/screens/LoginScreen.tsx`) — email/password against
  `POST /auth/login`; the JWT is persisted (`AsyncStorage`) and held in
  `AuthContext`. Capture works fully offline regardless, but sync needs a
  token (the backend scopes every call to the caller's org), so the app
  gates the main stack behind login.
- **Job list** (`src/screens/JobListScreen.tsx`) — reactive, offline-capable,
  pull-to-refresh triggers a sync. Header has a sign-out action.
- **Job detail** (`src/screens/JobDetailScreen.tsx`) — job info, past
  submissions, and a capture form (`DynamicForm` + `PhotoCapture` +
  `SignaturePad`, GPS auto-tagged into `data._meta.gps` on submit).

`SyncStatusBar` shows a real "last synced" time (read from WatermelonDB's own
persisted sync timestamp via `getLastPulledAt`) and a live pending-changes
count (rows not yet marked `_status = 'synced'`), plus a manual "Sync now"
button.

## Sync integration

`src/sync/runSync.ts` wraps WatermelonDB's `synchronize()`:

```ts
await synchronize({
  database,
  pullChanges: async ({ lastPulledAt }) => api.get(`/sync?last_pulled_at=${lastPulledAt ?? 0}`),
  pushChanges: async ({ changes, lastPulledAt }) => {
    const result = await api.post(`/sync?last_pulled_at=${lastPulledAt}`, { changes });
    return { experimentalRejectedIds: toRejectedIds(result.rejected) };
  },
  conflictResolver: createSubmissionConflictResolver(conflictReports),
});
```

Pull/push bodies map 1:1 onto the backend's wire format — no translation
layer needed beyond the JSON-string handling noted above.

**Conflict handling** is where this gets interesting, and it's not what you'd
guess from the backend's push-time staleness check alone. WatermelonDB's
`synchronize()` always pulls immediately before it pushes, which means by
push time `last_pulled_at` is already fresh — the backend's "did this change
after your last pull" check can't catch an edit made hours ago while
offline, because from the server's perspective the client "just" pulled a
second ago. WatermelonDB's own answer to this is a client-side
`conflictResolver` hook that runs during the pull-merge step, while both the
about-to-be-overwritten local version and the incoming remote version are
still available — `src/sync/conflictResolver.ts` uses it to:

1. Detect a genuine conflict (the local record's `data` column is dirty
   *and* actually differs from what the server just sent).
2. Force the resolution to the server's value, clearing the local dirty flag
   for the discarded fields (so the next push doesn't silently re-apply the
   stale edit).
3. Queue the discarded local value for `runSync` to report to the backend's
   `POST /submissions/:id/report-conflict` once the pull commits — see
   `backend/README.md#client-detected-conflicts` for why that endpoint
   exists and what it does with the report.

`jobs`/`attachments` don't get this treatment (no per-field log table for
them); they rely solely on the backend's push-time check, and a rejected
record is simply left dirty by WatermelonDB (via `experimentalRejectedIds`)
to retry on the next sync.

## Attachment upload queue

`src/sync/uploadQueue.ts` runs after every sync. The "queue" isn't a separate
table — it's just: any attachment whose metadata has already synced
(`_status === 'synced'`, so the server definitely has a row) but whose
`remote_url` is still null. For each: request a signed URL
(`POST /attachments/signed-url`), read the local file as a blob and `PUT` it,
then tell the server (`PATCH /attachments/:id/remote-url`) and update the
local row to match. Since this is just a query over durable local rows, it
survives app restarts and dropped connectivity for free — a failed upload
just stays pending and gets retried on the next sync.

## Manual test scenario: offline conflict → needs_review

This is the scenario the conflict-detection machinery above exists for.
"Two sessions" means two devices/simulators, or one device logged in from
two separate app installs — anything with two independent local databases
against the same backend.

1. Start the backend (`cd backend && docker compose up`) and seed it
   (`npx prisma db seed` if not already seeded).
2. On **Session A**, log in as `tom@fieldsync.dev` / `password123` and sync
   once (pull-to-refresh) so it has the seeded jobs.
3. On **Session B**, log in as `rae@fieldsync.dev` / `password123` and sync
   once too. Both sessions now have the same submission for "Inspect rooftop
   HVAC unit" locally.
4. Put **both** sessions in airplane mode.
5. On **Session A**: open that job, edit the submission's notes to
   `"Leak found near compressor"`, submit.
6. On **Session B**: open the *same* job, edit notes to
   `"All clear, no leaks"`, submit. (Both edits are purely local right now —
   airplane mode.)
7. Reconnect **Session A** first, pull-to-refresh. Its push applies cleanly
   (nobody else has touched the server copy yet) — the server's `notes` is
   now `"Leak found near compressor"`.
8. Reconnect **Session B**, pull-to-refresh. Watch what happens:
   - B's pull fetches A's version. `conflictResolver` detects that B's local
     `notes` edit collides with it, discards B's edit locally (B's UI will
     now show `"Leak found near compressor"` — A's value — not B's), and
     queues a conflict report.
   - `runSync` sends that report to the backend, which logs both values into
     `conflict_logs` and sets `needs_review = true`.
9. On **Session B**, go back to the job's submission list — it now shows a
   **"Needs review"** badge. Nothing was silently lost: B's discarded value
   (`"All clear, no leaks"`) is sitting in `conflict_logs.local_value`,
   visible to whoever resolves it on the web dashboard's conflict review
   page (phase 4).

## Configuration

`src/api/config.ts` picks a default API base URL by platform (Android
emulator: `10.0.2.2`, iOS simulator: `localhost`) — call `setApiBaseUrl()`
before login if you're pointing at something else (a real device on the same
LAN, a tunnel, etc).

## Running locally

This is a bare React Native project (not Expo — WatermelonDB needs native
modules that Expo Go can't load).

```bash
cd mobile
npm install

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

Requires a configured React Native development environment (Xcode + a
simulator for iOS, Android Studio + an emulator or device for Android) — see
the [React Native environment setup guide](https://reactnative.dev/docs/set-up-your-environment).
The backend needs to be running and reachable at the configured API base URL
before login will succeed (see [Configuration](#configuration)).

Camera and location permission strings are already declared
(`ios/FieldSyncMobile/Info.plist`, `android/app/src/main/AndroidManifest.xml`).

## Known limitation / not yet verified

WatermelonDB, navigation, camera, geolocation, and view-shot all ship native
modules, and this environment has no iOS/Android toolchain to actually build
and run the app on a simulator or device. Everything here has been verified
with `tsc --noEmit` and `eslint` (both clean), and every library API used
(WatermelonDB's `conflictResolver`/`synchronize`/raw-record internals
especially) was checked directly against the installed package's source and
type definitions, not from memory — including tracing through
`node_modules/@nozbe/watermelondb/src/sync/impl/*.js` to confirm exactly when
`pushChanges`'s `lastPulledAt` argument is computed, which is what surfaced
the conflict-timing gap this design works around. The backend side of every
new/changed endpoint (`report-conflict`, the JSON-string `data` wire format)
was verified end-to-end with real `curl` requests against a running Postgres
instance. What's **not** verified is the mobile app actually running — build
it locally per the steps above before relying on it.
