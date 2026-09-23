# CLAUDE.md

Guidance for AI coding agents (and humans) working in this repo.

## What this is

A quiz platform for a tutoring centre, built with Next.js 15 App Router, TypeScript strict, Tailwind v4, Drizzle and Postgres 16, and Auth.js credentials login. Roles: `student`, `teacher`, `admin`. The spec is `docs/TICKET-BT-1.md`; the reasoning behind it is in `DECISIONS.md`.

## Commands

```bash
docker compose up -d db     # Postgres on host port 5433
pnpm db:setup               # migrate + seed (idempotent)
pnpm dev
pnpm test                   # unit (no DB)
pnpm test:integration       # real Postgres, database quiz_test (auto-created)
pnpm test:e2e               # Playwright against a running app on :3000
pnpm lint && pnpm typecheck
pnpm db:generate            # after editing src/db/schema.ts
```

Run lint, typecheck, unit and integration tests before every commit.

## Where code goes

- `src/domain/`: pure functions, no I/O (scoring, deadline, time zone, import parsing and validation, zod schemas). Unit-tested.
- `src/server/`: services. Each takes `(db, actor, …, now)`, checks the actor's role and ownership itself, and throws `DomainError` with a code. Integration-tested against real Postgres.
- `src/app/`: pages, server actions, route handlers. Keep them thin: `requireActor(roles)` → validate input with zod → call a service → render or return `ActionResult`. No business rules here.
- `src/components/`: UI. Shared class helpers are in `components/ui.ts`.

## Rules that must not break

- **Never send `options.is_correct` to a student during an attempt.** Only `getAttemptResult` exposes it, and only after `closesAt`. There is a test for this.
- **Time comes from the server.** Services take `now: Date`; pages and actions pass `new Date()`. Never trust a time from the client.
- **Every server action and page calls `requireActor`.** Middleware only redirects for convenience.
- **Route access is default-deny.** A new top-level route redirects every user home until you add it to `SECTION_ROLES` in `src/lib/route-access.ts`.
- **Attempts are unique per (student, quiz).** Use `ON CONFLICT`, not check-then-insert.
- **Scores are integer centi-points** (`CENTI_PER_POINT = 100`). Display them with `formatCenti`.
- **Imports are all-or-nothing:** validate every row first, then write in one transaction.
- **Put `dir="auto"` on every element that shows user-entered text** (names, titles, questions, options).
- Times are displayed and entered in `Asia/Amman` (`src/domain/time.ts`) and stored as UTC.

## Conventions

- Conventional commits, one per logical unit.
- Tests: behaviour-named (`it("rejects an answer saved after the deadline")`), one behaviour per test, arrange/act/assert.
- No magic numbers: use named constants. No commented-out code. Comments explain *why*, not *what*.
- Add schema changes to `src/db/schema.ts`, then run `pnpm db:generate`. Commit the generated SQL in `drizzle/`.
