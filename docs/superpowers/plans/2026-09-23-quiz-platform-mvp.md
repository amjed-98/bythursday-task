# Quiz Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A timed multiple-choice quiz platform for a tutoring centre (students take quizzes, teachers author/import them, admin sees everything) that runs with one `docker compose up`.

**Architecture:** Next.js 15 App Router monolith. All business rules live in plain TypeScript service modules under `src/server/` that take an explicit `actor` and `now` and a Drizzle `db` handle, so they are unit/integration-testable without HTTP. Pages and server actions are thin: resolve session → actor, call a service, render. Pure logic (scoring, deadline, window state, import validation) lives in `src/domain/` with no I/O.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind v4, Auth.js v5 (credentials, JWT in httpOnly cookie), bcryptjs, Drizzle ORM + postgres-js, Postgres 16, zod, exceljs + papaparse, date-fns-tz, Vitest, Playwright, pnpm, Docker Compose.

**Spec:** `docs/TICKET-BT-1.md`

## Global Constraints

- `docker compose up` on a clean machine = db + migrate + seed + app on http://localhost:3000. No other step.
- Username + password login only. No email. Passwords hashed with bcrypt (bcryptjs, cost 10).
- Roles: `student`, `teacher`, `admin`. Every page and server action checks role server-side.
- Score arithmetic in integer centi-points: correct `+points*100`, wrong `-points*penaltyPercent`, blank `0`, total floored at 0.
- `deadline = min(startedAt + timeLimitMinutes, quiz.closesAt)`, computed on the server, stored on the attempt.
- Unique `(student_id, quiz_id)` on attempts.
- `isCorrect` never leaves the server during an attempt; review only when `now >= closesAt`.
- Questions and penalty locked once any attempt exists.
- `dir="auto"` on every piece of user content; Noto Sans Arabic loaded; UI chrome English.
- Display + datetime inputs in `Asia/Amman`; stored as UTC `timestamptz`.
- Imports: one transaction per file; any row error → nothing committed; errors carry 1-based spreadsheet row number (header = row 1).
- Student flow usable at 360px width with no horizontal scroll.
- Conventional commits, one per logical unit, starting from scaffold.

## Review Focus

1. Client submits/auto-submits a second or two after the deadline (network latency) → attempt is finalised as `expired` with already-saved answers counted, never a 500. Test in Task 5.
2. Quiz `closesAt` earlier than `startedAt + timeLimit` (student starts 5 min before close) → deadline = closesAt, countdown shows 5 min. Test in Task 3.
3. Student saves an option id that belongs to a different question/quiz → rejected, nothing stored. Test in Task 5.
4. XLSX cells typed as numbers/dates/rich text (Excel stores `points` as number, usernames as number) → parsed to trimmed strings, not `[object Object]`. Test in Task 8.
5. Arabic text with BOM-prefixed UTF-8 CSV headers → header still recognised. Test in Task 8.

---

## File Structure

```
docker-compose.yml, Dockerfile, .dockerignore, .env.example
drizzle.config.ts, drizzle/                     migrations (generated)
src/db/schema.ts                                tables + enums
src/db/client.ts                                createDb(url), db singleton
src/domain/scoring.ts                           scoreAttempt()
src/domain/deadline.ts                          computeDeadline(), windowState(), remainingMs()
src/domain/time.ts                              Amman <-> UTC helpers, formatters
src/domain/errors.ts                            DomainError + codes
src/domain/import/parse-file.ts                 xlsx/csv buffer -> rows
src/domain/import/schemas.ts                    zod row schemas per import kind
src/domain/import/validate.ts                   validateRows() -> {rows}|{errors}
src/server/actor.ts                             Actor type, assertRole()
src/server/attempts.ts                          startAttempt, getAttemptView, saveAnswer, submitAttempt, getAttemptResult
src/server/quizzes.ts                           create/update/get/list quizzes, canManageQuiz
src/server/results.ts                           getQuizResults, resultsToCsv
src/server/imports.ts                           importUsers, importQuizQuestions
src/server/dashboard.ts                         getStudentDashboard
src/server/users.ts                             listUsers, resetPassword
src/auth.ts, src/auth.config.ts, src/middleware.ts
src/lib/session.ts                              requireActor(roles)
src/app/...                                     pages (see tasks)
src/components/...                              UI pieces
scripts/seed.ts, scripts/generate-sample-data.ts
sample-data/*.xlsx
tests/unit/*.test.ts, tests/integration/*.test.ts, tests/e2e/*.spec.ts
README.md, DECISIONS.md, AI_USAGE.md, CLAUDE.md, docs/ai-log.md
```

---

### Task 1: Scaffold + Docker Compose + schema + migrations

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `.gitignore`, `.env.example`, `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `drizzle.config.ts`, `src/db/schema.ts`, `src/db/client.ts`, `vitest.config.ts`

**Interfaces:**
- Produces: `schema` exports `users, classes, quizzes, quizClasses, questions, options, attempts, answers, roleEnum, attemptStatusEnum`; `createDb(url: string)`, `db`, type `Db`.

- [ ] **Step 1:** `git init -b main`, scaffold Next 15 (`pnpm create next-app` equivalent by hand: TS strict, Tailwind v4, App Router, `src/`), commit `chore: scaffold next.js app`.
- [ ] **Step 2:** Schema:

```ts
export const roleEnum = pgEnum("role", ["student", "teacher", "admin"]);
export const attemptStatusEnum = pgEnum("attempt_status", ["in_progress", "submitted", "expired"]);
classes: id serial pk, name text unique not null
users: id serial pk, username text unique not null, passwordHash text not null, role roleEnum, fullName text not null, fullNameLatin text null, classId int null -> classes.id
quizzes: id serial pk, teacherId -> users.id, title text, timeLimitMinutes int, opensAt timestamptz, closesAt timestamptz, penaltyPercent int (check 0..100), createdAt timestamptz default now()
quizClasses: quizId, classId, pk(quizId, classId), cascade on quiz delete
questions: id serial pk, quizId cascade, position int, text text, points int (check > 0), unique(quizId, position)
options: id serial pk, questionId cascade, position int (0..3), text text, isCorrect bool, unique(questionId, position)
attempts: id serial pk, studentId, quizId, startedAt, deadline, finishedAt null, status, scoreCenti int null, correctCount/wrongCount/blankCount int null, UNIQUE(studentId, quizId)
answers: attemptId cascade, questionId, optionId null, answeredAt, pk(attemptId, questionId)
```

- [ ] **Step 3:** `pnpm drizzle-kit generate`, compose file: `db` (postgres:16-alpine, healthcheck `pg_isready`, host port `${DB_PORT:-5433}`), `migrate` (app image, `pnpm db:setup` = migrate + seed, depends on db healthy), `app` (app image, `pnpm start`, depends on migrate `service_completed_successfully`, port 3000). `AUTH_SECRET` defaulted in compose for local demo.
- [ ] **Step 4:** `docker compose up --build` → app returns 200 at :3000. Commit `feat: add database schema, migrations and docker compose`.

### Task 2: Scoring + deadline domain logic (TDD)

**Files:** Create `src/domain/scoring.ts`, `src/domain/deadline.ts`, `src/domain/time.ts`; Test `tests/unit/scoring.test.ts`, `tests/unit/deadline.test.ts`

**Interfaces — Produces:**
```ts
type ScorableQuestion = { id: number; points: number; correctOptionId: number };
type AttemptScore = { scoreCenti: number; maxScoreCenti: number; correct: number; wrong: number; blank: number };
function scoreAttempt(questions: ScorableQuestion[], answers: ReadonlyMap<number, number | null>, penaltyPercent: number): AttemptScore;
function computeDeadline(startedAt: Date, timeLimitMinutes: number, closesAt: Date): Date;
type WindowState = "upcoming" | "open" | "closed";
function windowState(quiz: { opensAt: Date; closesAt: Date }, now: Date): WindowState;
function remainingMs(deadline: Date, now: Date): number; // >= 0
function isReviewOpen(quiz: { closesAt: Date }, now: Date): boolean;
function formatCenti(centi: number): string; // 1250 -> "12.5", 1000 -> "10"
// time.ts
const APP_TIME_ZONE = "Asia/Amman";
function ammanInputToUtc(value: string): Date;  // "2026-09-23T09:00" -> Date
function utcToAmmanInput(date: Date): string;
function formatAmman(date: Date): string;       // "23 Sep 2026, 09:00"
```

- [ ] **Step 1: failing tests** — scoring: all correct penalty 0; mixed with 25% (points 2,1,4: correct 2, wrong 1, blank 4 → 200−25 = 175); 100% wrong cancels a correct of equal points; floor (all wrong, 100% → 0 not negative); 0% wrong = 0; answers for unknown question ignored; maxScore = Σ points × 100. Deadline: limit-bound, close-bound (start 5 min before close → closesAt), windowState boundaries (opensAt inclusive, closesAt exclusive), remainingMs never negative. Time: `ammanInputToUtc("2026-09-23T09:00")` = `2026-09-23T06:00:00Z`.
- [ ] **Step 2:** run `pnpm vitest run tests/unit` → FAIL.
- [ ] **Step 3:** implement:

```ts
export function scoreAttempt(questions, answers, penaltyPercent) {
  const tally = questions.reduce((acc, q) => {
    const chosen = answers.get(q.id) ?? null;
    if (chosen === null) return { ...acc, blank: acc.blank + 1 };
    if (chosen === q.correctOptionId) return { ...acc, raw: acc.raw + q.points * CENTI, correct: acc.correct + 1 };
    return { ...acc, raw: acc.raw - q.points * penaltyPercent, wrong: acc.wrong + 1 };
  }, { raw: 0, correct: 0, wrong: 0, blank: 0 });
  return { scoreCenti: Math.max(0, tally.raw), maxScoreCenti: sum(points) * CENTI, ... };
}
export const computeDeadline = (s, m, c) => new Date(Math.min(s.getTime() + m * 60_000, c.getTime()));
```

- [ ] **Step 4:** tests PASS. Commit `feat: add scoring and deadline rules`.

### Task 3: Integration test harness + attempts service

**Files:** Create `src/domain/errors.ts`, `src/server/actor.ts`, `src/server/attempts.ts`, `tests/integration/setup.ts`, `tests/integration/factories.ts`, `tests/integration/attempts.test.ts`, `vitest.integration.config.ts`

**Interfaces — Produces:**
```ts
type Actor = { id: number; role: "student" | "teacher" | "admin"; classId: number | null };
class DomainError extends Error { code: "FORBIDDEN" | "NOT_FOUND" | "NOT_OPEN" | "ATTEMPT_CLOSED" | "INVALID_ANSWER" | "LOCKED" | "VALIDATION" }
function assertRole(actor: Actor, roles: Actor["role"][]): void;
startAttempt(db, actor, quizId, now): Promise<{ attemptId: number }>;  // idempotent resume
getAttemptView(db, actor, quizId, now): Promise<AttemptView | null>;   // null if no attempt; finalises expired
type AttemptView = { attemptId; status; quiz: { id; title; penaltyPercent }; deadline: string; remainingMs; questions: { id; position; text; points; options: { id; position; text }[] }[]; answers: Record<number, number | null> };
saveAnswer(db, actor, { attemptId, questionId, optionId: number | null }, now): Promise<void>;
submitAttempt(db, actor, attemptId, now): Promise<void>;
getAttemptResult(db, actor, quizId, now): Promise<AttemptResult>;
type AttemptResult = { status; score: AttemptScore; review: ReviewItem[] | null; closesAt: string; quizTitle: string };
finaliseExpiredAttempts(db, quizId, now): Promise<void>;
```

- Integration DB: `TEST_DATABASE_URL` (default `postgres://quiz:quiz@localhost:5433/quiz_test`). globalSetup creates DB if missing and runs migrations; `beforeEach` truncates all tables `RESTART IDENTITY CASCADE`. `fileParallelism: false`.
- Access rules in `startAttempt`: actor is student; quiz assigned to actor.classId; `windowState == open` → else NOT_FOUND (not assigned) / NOT_OPEN. Existing attempt returned regardless of window (resume).
- Insert via `onConflictDoNothing({ target: [studentId, quizId] })` then select.
- `saveAnswer`: transaction, `SELECT ... FOR UPDATE` attempt; owner check; status in_progress and `now < deadline` else ATTEMPT_CLOSED (and finalise if expired); option must belong to question and question to attempt's quiz else INVALID_ANSWER; upsert answer.
- `submitAttempt`: transaction + row lock; if already finalised → no-op; status = `now <= deadline ? submitted : expired`; store score.

- [ ] **Step 1: failing tests:** 20 concurrent `startAttempt` → 1 row, same id; restart after start returns same attempt + same deadline; save after deadline → ATTEMPT_CLOSED (clock passed as `now`, client time irrelevant); replay of an earlier save after deadline rejected; option from another question → INVALID_ANSWER; other student's attempt → FORBIDDEN; class not assigned → NOT_FOUND; before opensAt/after closesAt → NOT_OPEN; `JSON.stringify(view)` contains no `isCorrect`/`correct`; result `review` null before close, populated after; late submit → `expired` with saved answers scored; start 5 min before close → deadline == closesAt.
- [ ] **Step 2:** start db `docker compose up -d db`, run `pnpm test:integration` → FAIL.
- [ ] **Step 3:** implement service.
- [ ] **Step 4:** PASS. Commit `feat: add attempt lifecycle with one-attempt and deadline enforcement`.

### Task 4: Auth + roles + guards

**Files:** `src/auth.config.ts`, `src/auth.ts`, `src/middleware.ts`, `src/lib/session.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/login/page.tsx`, `src/app/login/login-form.tsx`, `src/app/login/actions.ts`, `src/app/page.tsx`, `src/components/app-shell.tsx`, `tests/unit/actor.test.ts`

**Interfaces — Produces:** `requireActor(roles?: Role[]): Promise<Actor>` (redirects to `/login` if no session, `notFound()`-style 403 page if wrong role); `homePathFor(role)`: student→`/student`, teacher→`/teacher`, admin→`/admin`.

- Credentials `authorize`: zod parse, lookup by lowercased username, `bcrypt.compare`, return `{ id, role, classId, name }`. JWT callback copies fields; session callback exposes them. Cookie httpOnly (Auth.js default). `trustHost: true`.
- Middleware (edge-safe config, no db): redirect unauthenticated to `/login`, and prefix-role mismatch (`/admin` admin only, `/teacher` teacher|admin, `/student` student) to home. Server re-checks in every page/action via `requireActor`.
- [ ] Unit test `assertRole` throws FORBIDDEN for wrong role. Implement. Manual check login works. Commit `feat: add username/password auth with role guards`.

### Task 5: Student flow (dashboard, take, result)

**Files:** `src/server/dashboard.ts`, `src/app/student/page.tsx`, `src/app/student/quiz/[quizId]/page.tsx`, `.../actions.ts`, `.../take/quiz-runner.tsx`, `.../result/page.tsx`, `src/components/countdown.tsx`, `src/components/question-navigator.tsx`, `tests/integration/dashboard.test.ts`

**Interfaces — Produces:** `getStudentDashboard(db, actor, now) → { available: QuizCard[]; upcoming: QuizCard[]; completed: QuizCard[] }` where `QuizCard = { id; title; opensAt; closesAt; timeLimitMinutes; questionCount; attemptStatus: AttemptStatus | null; scoreCenti; maxScoreCenti }`. In-progress attempts appear under available ("Resume").

- Quiz page: if no attempt → intro (questions count, time, penalty explained, "Start" button → `startAttemptAction`). If in_progress → `QuizRunner`. If finalised → redirect result.
- `QuizRunner` (client): one question per screen, options as full-width ≥48px buttons, sticky header with countdown (client end = `performance.now() + remainingMs` so client clock edits don't matter), navigator grid (answered/current), "Clear answer", prev/next, autosave per click with saved/failed indicator and retry, confirm dialog before submit, auto-submit at 0. `ATTEMPT_CLOSED` from save → route to result.
- Result page: score / max, correct/wrong/blank; review list if open; otherwise "Review opens after {closesAt Amman}".
- [ ] Integration test dashboard buckets (upcoming/open/closed, other class excluded). Implement. Commit `feat: add student dashboard and quiz taking flow`.

### Task 6: Teacher quiz CRUD

**Files:** `src/server/quizzes.ts`, `src/domain/quiz-input.ts` (zod `quizInputSchema`), `src/app/teacher/page.tsx`, `src/app/teacher/quizzes/new/page.tsx`, `src/app/quizzes/[quizId]/edit/page.tsx`, `src/components/quiz-form/*.tsx`, `src/app/quizzes/actions.ts`, `tests/integration/quizzes.test.ts`

**Interfaces — Produces:**
```ts
type QuizInput = { title; classIds: number[]; timeLimitMinutes; opensAt: Date; closesAt: Date; penaltyPercent; questions: { text; points; options: [string,string,string,string]; correctIndex: 0|1|2|3 }[] };
createQuiz(db, actor, input): Promise<number>;           // teacher only
updateQuiz(db, actor, quizId, input): Promise<void>;     // LOCKED if attempts exist and questions/penalty changed
getQuizForEdit(db, actor, quizId): Promise<QuizInput & { id; isLocked }>;
listQuizzesForActor(db, actor, { classId? }): Promise<QuizListItem[]>;
canManageQuiz(actor, quiz: { teacherId }): boolean;     // admin or owner
```
- Validation: title 1–200, ≥1 class, time limit 1–300, closesAt > opensAt, penalty 0–100 int, 1–100 questions, points 1–100 int, options non-empty.
- [ ] Integration tests: teacher B cannot get/update teacher A's quiz (FORBIDDEN); student cannot create; locked quiz rejects question change but accepts title change. Implement. Commit `feat: add teacher quiz create and edit`.

### Task 7: Results + CSV export

**Files:** `src/server/results.ts`, `src/app/quizzes/[quizId]/results/page.tsx`, `src/app/quizzes/[quizId]/results/export/route.ts`, `tests/integration/results.test.ts`, `tests/unit/results-csv.test.ts`

**Interfaces — Produces:** `getQuizResults(db, actor, quizId, now) → { quiz; rows: { studentId; fullName; fullNameLatin; className; status: AttemptStatus | "not_started"; scoreCenti; timeTakenSeconds }[]; questionStats: { position; text; percentCorrect: number | null }[] }` (finalises expired attempts first). `resultsToCsv(results): string` (UTF-8 BOM so Excel shows Arabic).
- [ ] Tests: other teacher FORBIDDEN, admin allowed, not-started students listed, percentCorrect over finalised attempts. Commit `feat: add quiz results and csv export`.

### Task 8: Import (parse, validate, commit)

**Files:** `src/domain/import/parse-file.ts`, `schemas.ts`, `validate.ts`, `src/server/imports.ts`, `src/app/admin/import/page.tsx`, `src/app/teacher/quizzes/import/page.tsx`, actions, `tests/unit/import-validate.test.ts`, `tests/unit/parse-file.test.ts`, `tests/integration/imports.test.ts`

**Interfaces — Produces:**
```ts
type RawRow = { rowNumber: number; values: Record<string, string> };
parseSpreadsheet(buffer: Buffer, fileName: string): Promise<RawRow[]>; // .xlsx|.csv, header normalised lowercase_snake, BOM stripped
type RowError = { row: number; message: string };
validateRows<T>(rows: RawRow[], schema: ZodType<T>, uniqueKey?: (t: T) => string): { ok: true; rows: T[] } | { ok: false; errors: RowError[] };
importUsers(db, actor, kind: "students" | "teachers", rows): Promise<{ created; updated }>;  // admin only, one tx, upsert by username, classes auto-created
importQuizQuestions → questionsFromRows(rows): QuizInput["questions"]; quiz import = quiz meta form + file → createQuiz
```
- Columns: students `username, password, full_name, full_name_latin, class`; teachers `username, password, full_name`; quiz `question, points, option_a, option_b, option_c, option_d, correct` (`correct` ∈ A–D, case-insensitive).
- [ ] Tests: missing column → error row 1; bad `correct` → row N message; duplicate username in file; numeric cells from xlsx; BOM CSV header; integration: file with one bad row commits nothing. Commit `feat: add xlsx/csv import with row-level validation`.

### Task 9: Admin pages

**Files:** `src/app/admin/page.tsx` (all quizzes, `?class=` filter), `src/app/admin/users/page.tsx` (list + role filter + reset password), `src/server/users.ts`.
- [ ] Commit `feat: add admin quiz overview and user management`.

### Task 10: Sample data + seed

**Files:** `scripts/generate-sample-data.ts`, `sample-data/students.xlsx`, `teachers.xlsx`, `quiz-english-vocabulary.xlsx`, `quiz-arabic-grammar.xlsx`, `quiz-math-closed.xlsx`, `scripts/seed.ts`
- Seed = admin user + `importUsers` on the xlsx files + `createQuiz` from quiz files (same parsers as UI) + past attempts for the closed quiz via deterministic PRNG. Idempotent: users upsert; quizzes skipped if (teacher, title) exists; attempts `onConflictDoNothing`.
- [ ] `pnpm db:seed` twice → same counts. Commit `feat: add sample spreadsheets and idempotent seed`.

### Task 11: Mobile/RTL polish

- [ ] Check 360px in Playwright screenshots (student dashboard, runner with Arabic quiz, result). Fix overflow. Commit `style: polish mobile and rtl layout`.

### Task 12: E2E

**Files:** `playwright.config.ts`, `tests/e2e/student-takes-quiz.spec.ts`
- [ ] Student logs in at 360px viewport, opens English quiz, answers all, submits, sees "Score". Plus: student visiting `/teacher` is redirected. Commit `test: add student end-to-end flow`.

### Task 13: Docs

- [ ] `README.md`, `DECISIONS.md`, `AI_USAGE.md`, `CLAUDE.md`, `docs/ai-log.md`. Final clean-clone `docker compose up` check. Commit `docs: add readme, decisions and ai usage`.
