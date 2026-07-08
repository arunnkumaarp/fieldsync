# FieldSync

FieldSync is an offline-first field data collection and sync platform: a
React Native mobile app for capturing job forms, photos, signatures, and GPS
data with zero connectivity, a NestJS + PostgreSQL backend implementing the
[WatermelonDB sync protocol](https://watermelondb.dev/docs/Sync/Backend), and
a Next.js dashboard for live monitoring and conflict review.

This is a monorepo containing three **independently deployable** projects
that share one Postgres schema (defined once, in `backend/prisma/schema.prisma`).
Each subproject is meant to become its own GitHub repo — see
[Publishing to your own repos](#publishing-to-your-own-repos) below.

```
/fieldsync
  /backend    NestJS + Prisma + PostgreSQL — REST API, sync endpoints, WebSocket gateway
  /mobile     React Native + WatermelonDB — offline-first capture app
  /web        Next.js + TypeScript — live dashboard, conflict review, job map
  /shared     Shared TypeScript types referenced by mobile/web
```

## Architecture

```
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    │  (single schema) │
                    └────────┬─────────┘
                             │ Prisma
                    ┌────────┴─────────┐
                    │  backend (NestJS)│
                    │  REST + /sync    │◄──────────────┐
                    │  WebSocket       │                │
                    └────┬────────┬────┘                │
                         │        │                     │
              REST + WS  │        │ WatermelonDB sync   │ signed upload URL
                         │        │ (pull/push)          │ (S3/R2)
                    ┌────┴───┐┌───┴──────────┐   ┌───────┴───────┐
                    │  web   ││   mobile     │   │ object storage│
                    │(Next.js)│(React Native)│   │  (S3/R2)      │
                    └────────┘└──────────────┘   └───────────────┘
```

- **mobile** works fully offline against a local WatermelonDB (SQLite)
  database, and calls `POST /sync` / `GET /sync` only when connectivity is
  available. Conflicting edits are never silently dropped — see
  [`mobile/README.md`](./mobile/README.md).
- **backend** owns the schema and is the only thing that talks to Postgres.
  It never trusts a client-supplied `last_modified`; the server clock is the
  only source of truth for ordering writes. See [`backend/README.md`](./backend/README.md)
  for the full sync protocol writeup.
- **web** never touches Postgres directly — it's a REST + WebSocket client
  of the backend, same as mobile is a sync client of it. See
  [`web/README.md`](./web/README.md).
- **shared** holds TypeScript types (e.g. the shape of a `Submission`'s
  `data` JSON, sync wire types) that mobile and web both import, so the
  three projects don't silently drift out of sync with the backend's schema.

## Subprojects

| Project | Stack | Docs |
|---|---|---|
| `backend` | NestJS, Prisma, PostgreSQL, Socket.IO | [backend/README.md](./backend/README.md) |
| `mobile` | React Native, WatermelonDB | [mobile/README.md](./mobile/README.md) |
| `web` | Next.js, TypeScript, Tailwind, shadcn/ui, TanStack Query | [web/README.md](./web/README.md) |
| `shared` | TypeScript | [shared/README.md](./shared/README.md) |

## Build phases

This project was built in four phases, each independently checked in:

1. **Backend schema + sync endpoints** — Prisma schema, auth, `/sync` pull/push, jobs/submissions/attachments/users CRUD, WebSocket gateway, seed data. *(done)*
2. **Mobile offline forms** — WatermelonDB schema, job list, dynamic form with photo/signature/GPS capture, local CRUD. No sync yet. *(done)*
3. **Sync integration end-to-end** — wires mobile's `synchronize()` to the backend, client + server conflict detection and reporting, queued attachment uploads. *(done)*
4. **Web dashboard** — submissions feed, conflict review, job map, submission detail. *(done)*

## Publishing to your own repos

Each subproject is structured to become its own GitHub repository. From the
monorepo root, for each of `backend`, `mobile`, `web`, `shared`:

```bash
# Using git subtree split (preserves history for that folder only)
git subtree split --prefix=backend -b backend-only
git remote add backend-origin <your-backend-repo-url>
git push -u backend-origin backend-only:main

# repeat for mobile / web / shared, changing --prefix and the remote name
```

If you'd rather not preserve history, the simpler path is to copy each
folder into a fresh directory, `git init` there, and push:

```bash
cp -r backend /path/to/fieldsync-backend
cd /path/to/fieldsync-backend
git init
git add .
git commit -m "Initial commit: FieldSync backend"
git remote add origin <your-backend-repo-url>
git push -u origin main
```

## Requirements

- Node.js 20+
- PostgreSQL 16 (or Docker, to run it via `backend/docker-compose.yml`)
- For mobile: a React Native development environment (Xcode/Android Studio) — see `mobile/README.md`
