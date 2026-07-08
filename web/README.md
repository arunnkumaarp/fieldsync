# FieldSync Web Dashboard

Next.js (App Router) dashboard for live monitoring and conflict review — a
REST + WebSocket client of the backend, same way the mobile app is a sync
client of it. It never talks to Postgres directly.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Hand-built shadcn/ui-style primitives (`src/components/ui/`) on top of Radix primitives (`@radix-ui/react-dialog`, `@radix-ui/react-select`) — copied-in source rather than the shadcn CLI, so there's no network dependency on a component registry at build time
- TanStack Query v5 for all REST data fetching/caching
- Socket.IO client for live updates
- `react-map-gl` (MapLibre binding) for the job map — no API key required, see [Job map](#job-map)

## Architecture

Three providers wrap every page (`src/providers/`), composed in
`ClientOnlyProviders`:

```
QueryProvider          — TanStack Query client
  └ AuthProvider        — JWT held in localStorage, exposed via context
      └ RealtimeProvider — Socket.IO connection once authenticated
```

**Why the whole provider tree is `next/dynamic(..., { ssr: false })`:**
this dashboard has no SEO/SSR value — it's entirely behind auth, and that
auth state lives in `localStorage`, which a server render can never see. If
the provider tree were server-rendered, `AuthProvider`'s
`useSyncExternalStore` would have to report "logged out" on the first
client-hydration pass (to match the auth-less server HTML), and the
dashboard layout's redirect-on-logged-out effect could fire against that
transient false value before the real one arrived — bouncing an
already-logged-in user back to `/login` on every hard page reload. This
wasn't theoretical: it reproduced in an actual browser test, tracked down to
this exact race, and fixed by making `ClientOnlyProviders`
(`src/providers/ClientOnlyProviders.tsx`) skip SSR for the whole tree, so
`AuthProvider`'s first-ever render happens client-side with nothing to
reconcile against.

## Pages

- **`/login`** — email/password against `POST /auth/login`; JWT persisted to `localStorage`.
- **`/submissions`** — live-updating feed, filterable by technician, job status, and date range (`useSubmissions`, backed by `GET /submissions?technicianId=&jobStatus=&dateFrom=&dateTo=`). Accepts a `?jobId=` query param too (used by the job map's "View submissions" link).
- **`/submissions/[id]`** — form data, attachment previews (photo/signature; attachments without a `remoteUrl` yet show a "Not yet uploaded" placeholder instead of a broken image), and a sync/audit history section (created/modified timestamps plus the full conflict-log timeline, resolved or not).
- **`/conflicts`** — every submission with `needsReview = true`, one card per submission, one row per unresolved `conflict_logs` entry showing the device's value side-by-side with the server's, each with a button that calls `POST /submissions/:id/resolve`.
- **`/map`** — every job with a location, plotted and colored by status; click a pin for a popup with job details and a link into the filtered submissions feed.

## Realtime

`RealtimeProvider` connects to the backend's `/realtime` Socket.IO namespace
(`auth: { token }`, matching what `backend/src/realtime/realtime.gateway.ts`
expects) once a user is logged in, and invalidates the relevant TanStack
Query cache keys on `submission.upsert`, `submission.conflict`, and
`job.upsert`. Invalidating rather than hand-merging into the cache is the
simpler correct choice: these events fire rarely enough that an extra
refetch is cheap, and it can't silently drift from server truth the way a
manual cache merge could.

## Job map

Uses `react-map-gl`'s MapLibre binding with a free, no-API-key-required demo
style (`https://demotiles.maplibre.org/style.json`) so the map works out of
the box. Set `NEXT_PUBLIC_MAP_STYLE_URL` in `.env.local` to point at a
Mapbox/MapTiler/Google style URL instead if you have a key and want richer
tiles — nothing else needs to change.

**Note:** in a fully offline/firewalled environment, the demo style's tiles
won't load (you'll see a blank gray background) since it's fetched from a
public CDN — but job markers, click-through popups, and the "view
submissions" link are all independent of whether the background tiles
loaded, since those come from your own backend, not the tile server.

## Running locally

```bash
cd web
cp .env.local.example .env.local   # defaults point at http://localhost:3000
npm install
npm run dev
```

Requires the backend running and reachable at `NEXT_PUBLIC_API_BASE_URL`
(see `backend/README.md`) — sign in with any of the seeded accounts
(`admin@fieldsync.dev` / `password123`, etc). The dashboard runs on
`http://localhost:3001` by default in dev to avoid colliding with the
backend's `:3000`; the backend's `.env.example` already sets
`CORS_ORIGIN=http://localhost:3001` to match.

## Verified

Every page was exercised end-to-end in a real headless browser (Playwright)
against a running backend + Postgres instance: login, hard-reload while
authenticated (specifically to catch the hydration race described above),
filtering the submissions feed, opening a submission's detail page,
resolving a real conflict on the conflict review page and watching it drop
off the unresolved list, clicking a map marker through to its popup, and
signing out. Screenshots of each step were captured and reviewed, not just
asserted on programmatically.
