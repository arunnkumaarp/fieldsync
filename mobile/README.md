# FieldSync Mobile

React Native + WatermelonDB app for offline-first field data capture. This
README covers what's built so far — **local-first CRUD with zero
connectivity**. The sync integration (`synchronize()` against the backend,
conflict re-pull/reconcile, queued attachment uploads) lands in phase 3; this
document's "offline capture and conflict resolution" test scenario will be
filled in then, once there's an actual sync loop to exercise.

## Stack

- React Native 0.86, TypeScript
- `@nozbe/watermelondb` — local SQLite database, reactive queries
- `@react-navigation/native` (native-stack) for the two-screen flow
- `react-native-image-picker` for camera capture
- `react-native-svg` + `PanResponder` for the signature pad (hand-rolled — no WebView dependency)
- `@react-native-community/geolocation` for GPS auto-tagging

## Local data model

`src/db/schema.ts` defines three WatermelonDB tables — `jobs`, `submissions`,
`attachments` — with column names matching the backend's sync wire format
1:1 (`org_id`, `job_id`, `last_modified`, ...). See
`backend/README.md#sync-protocol` for why that mapping matters. One
deliberate omission: there's no local `deleted_at` column. WatermelonDB
represents "deleted" through its own internal `_status` bookkeeping, and a
pulled server-side deletion is applied by destroying the local row outright
— so `deleted_at` is a wire-protocol concept, not a local one.

`submissions.data` is stored as a JSON-encoded string column (SQLite columns
are scalar) and exposed as a parsed object via WatermelonDB's `@json`
decorator — see `src/db/models/Submission.ts`.

## Screens

- **Job list** (`src/screens/JobListScreen.tsx`) — reactive list of all local
  jobs (`useJobs()` hook, backed by `Query#observe()`), fully functional with
  no network. Shows a status dot and a `SyncStatusBar` (see below).
- **Job detail** (`src/screens/JobDetailScreen.tsx`) — job info, past
  submissions for that job, and a form to capture a new one:
  - `DynamicForm` renders fields from `src/forms/jobFormSchema.ts` — a config
    array, not hardcoded JSX, so adding a field is a config edit.
  - `PhotoCapture` opens the camera (`react-native-image-picker`) and shows a preview.
  - `SignaturePad` captures freehand strokes into an SVG path string.
  - On submit: GPS is captured (`src/utils/gps.ts`) and merged into the
    submission's `data._meta.gps`, then the submission and any
    photo/signature attachments are written to WatermelonDB in one go.

## Sync status indicator (pre-sync)

`SyncStatusBar` shows a live "pending changes" count today — computed by
querying each table for rows where WatermelonDB's internal `_status` column
isn't `'synced'` (`usePendingChangesCount` hook). That's real, local-only
data; it works with the radio off. "Last synced" is hardcoded to "never" for
now because there's genuinely nothing to report yet — phase 3 will persist a
real `lastPulledAt` and replace that placeholder.

## Demo data

Since there's no sync yet, the app seeds three demo jobs (and one demo
submission) into WatermelonDB on first launch if the local `jobs` table is
empty (`src/db/seed.ts`) — otherwise you'd open the app to a permanently
empty list. This is throwaway local data with ids that won't reconcile with
the backend; phase 3 replaces it with a real first pull.

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

Camera and location permission strings are already declared
(`ios/FieldSyncMobile/Info.plist`, `android/app/src/main/AndroidManifest.xml`);
you'll get the OS permission prompts the first time you take a photo or
submit a form.

## Known limitation / not yet verified

WatermelonDB, `react-native-image-picker`, and `@react-native-community/geolocation`
all ship native modules, and this environment has no iOS/Android toolchain
to actually build and run the app on a simulator or device. Everything here
has been verified with `tsc --noEmit` and `eslint` (both clean) and reviewed
against each library's current API surface (checked directly against
installed `node_modules` type definitions, not from memory) — but it has
**not** been exercised in a running app. Build it locally per the steps
above before relying on it.
