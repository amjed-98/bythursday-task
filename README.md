# Quizzes for Nour's tutoring centre

Timed multiple-choice quizzes. Students take them on their phones, teachers write or import them, and the admin (Nour) sees every result.

## Run it

Needs Docker (with Compose v2). Nothing else.

```bash
git clone https://github.com/amjed-98/bythursday-task.git
cd bythursday-task
docker compose up
```

Open http://localhost:3000 once the `app` container logs `Ready`. The first start builds the image, runs migrations and loads the sample data (a few minutes). Later starts skip what is already loaded.

- Postgres is exposed on host port **5433** (not 5432) so it doesn't clash with a local Postgres. Change it with `DB_PORT=6543 docker compose up`.
- Start over with an empty database: `docker compose down -v && docker compose up`.
- If the build can't reach the npm registry (`EAI_AGAIN`, common behind a VPN that blocks Docker's bridge network), build on the host network instead: `DOCKER_BUILD_NETWORK=host docker compose up`.

## Logins

| Role | Username | Password | What you'll see |
|---|---|---|---|
| Admin (Nour) | `admin` | `admin123` | All quizzes (filter by class), users, imports |
| Teacher, English | `t.rana` | `teacher123` | English Vocabulary quiz (open, no penalty) |
| Teacher, Arabic | `t.khaled` | `teacher123` | Arabic grammar quiz (open, 25% penalty) |
| Teacher, Maths | `t.huda` | `teacher123` | Algebra quiz (closed, 50% penalty, 35 past attempts) |
| Teacher, Science | `t.samer` | `teacher123` | No quizzes yet — try creating or importing one |
| Student, 10A | `layla.khatib` | `student123` | English + Arabic open; Algebra closed with a result and review |
| Student, 10B | `tala.masri` | `student123` | English + Arabic open |
| Student, 11A | `dana.banihani40` | `student123` | Arabic open; Algebra closed |

All 60 students use `student123`. Every username is in `sample-data/students.xlsx`, or on the admin **Users** page.

Each student can take a quiz once. To try the quiz flow again, import a new student (see below) or reset the database.

## Loading data

Real data will come as spreadsheets, so the sample data goes through the same path.

- **Students / teachers:** sign in as `admin` → **Import** → pick `students` or `teachers` → upload `.xlsx` or `.csv`.
- **A quiz:** sign in as a teacher → **Import** → fill in title, classes, times and penalty → upload the questions file.

Sample files are in [`sample-data/`](sample-data):

| File | Columns |
|---|---|
| `students.xlsx` | `username, password, full_name, full_name_latin, class` |
| `teachers.xlsx` | `username, password, full_name` |
| `quiz-*.xlsx` | `question, points, option_a, option_b, option_c, option_d, correct` (A–D) |

Rules: the first row holds the headers. Re-importing a username updates that person; a blank password keeps their current one. If any row is wrong, nothing is saved, and the page lists each row number with the reason.

The seed (`scripts/seed.ts`) loads these same files through the same parser and services. It runs automatically in Docker, and you can re-run it: `pnpm db:seed` (idempotent).

## Development

Needs Node 24 and pnpm 10.

```bash
pnpm install
cp .env.example .env          # then set AUTH_SECRET: openssl rand -base64 32
docker compose up -d db       # just Postgres, on :5433
pnpm db:setup                 # migrate + seed
pnpm dev
```

| Command | What it does |
|---|---|
| `pnpm test` | Unit tests: scoring, deadlines, time zone, import parsing and validation, route access |
| `pnpm test:integration` | Integration tests against real Postgres (`quiz_test` database, created automatically; needs `docker compose up -d db`) |
| `pnpm test:e2e` | Playwright, phone-sized viewport, against a running app (`docker compose up` first). Uses `E2E_BASE_URL`, default `http://localhost:3000` |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm sample-data` | Regenerates `sample-data/*.xlsx` from `scripts/sample-content.ts` |
| `pnpm db:generate` | New migration after editing `src/db/schema.ts` |

First time running e2e: `pnpm exec playwright install chromium`.

## How it is built

- **Next.js 15 App Router** with server actions, **TypeScript strict**, **Tailwind v4**.
- **Postgres 16** through **Drizzle ORM**. Schema: [`src/db/schema.ts`](src/db/schema.ts).
- **Auth.js** credentials login (username + password, bcrypt), JWT session in an httpOnly cookie.
- Business rules are plain functions that take the user, the database and the current time, so tests call them directly:
  - [`src/domain/`](src/domain): pure logic (scoring, deadline, import validation), no I/O.
  - [`src/server/`](src/server): services that enforce the rules against the database.
  - [`src/app/`](src/app): pages and server actions. They get the signed-in user and call a service; no rules live here.

See [DECISIONS.md](DECISIONS.md) for why, and [AI_USAGE.md](AI_USAGE.md) for how AI tools were used.
