# Decisions

The main product decisions were made before any code was written, in a Q&A with the AI assistant (see [AI_USAGE.md](AI_USAGE.md)), and recorded in [docs/TICKET-BT-1.md](docs/TICKET-BT-1.md). This file covers what those decisions mean in practice, the assumptions behind them, what I added, and what I left out.

## Core rules and how they are enforced

| Rule | Where it lives | Why this way |
|---|---|---|
| **One attempt per student per quiz** | Unique `(student_id, quiz_id)` constraint on `attempts`. `startAttempt` does `INSERT … ON CONFLICT DO NOTHING`, then reads the row back. | The database settles races, so 20 simultaneous "Start" taps still create one attempt (integration test). A refresh, a second tab or a dead phone gets the same attempt back, with the same deadline. |
| **Server-side timer** | `deadline = min(startedAt + timeLimit, closesAt)`, calculated once at start and stored on the attempt. Every save locks the attempt row (`SELECT … FOR UPDATE`) and compares the deadline with the **server** clock. | Changing the phone's clock or replaying an old request cannot add time. The countdown on screen only mirrors the deadline, and it counts on `performance.now()`, a clock the user can't change. |
| **Expired attempts** | Any read (dashboard, quiz page, result, teacher results) finalises in-progress attempts that are past their deadline as `expired`, scoring the answers saved before the deadline. | No background job is needed. A student whose phone died still gets a score. |
| **Late submit** | A submit that arrives on or after the deadline doesn't fail: the attempt becomes `expired`, and answers saved in time still count. | Auto-submit at 0:00 plus network delay would otherwise show the student an error at the worst moment. |
| **Negative marking** | `scoreAttempt()` in `src/domain/scoring.ts`: correct `+points`, wrong `−penalty% × points`, blank `0`, total floored at 0. | Scores are stored as **integer centi-points** (1 point = 100), so 25% of a 1-point question is exactly 25, with no rounding errors. |
| **Answer secrecy** | The attempt view never selects `is_correct`. The per-question review is built only when `now ≥ closesAt`. | A test serialises the whole attempt payload and checks it contains no "correct" field. |
| **Questions locked after the first attempt** | `updateQuiz` rejects changes to questions **or the penalty** once any attempt exists. Title, classes and schedule stay editable. | The ticket locks questions. I also lock the penalty, because changing it mid-quiz would score students differently for the same answers. |
| **Authorization** | Every service takes an `actor` and checks it (`assertRole`, `canManageQuiz`). Middleware redirects by URL section, and each page and server action checks again with `requireActor`. | Hiding links is not a security check. Tests call the services directly with the wrong role or the wrong teacher. |
| **Imports** | Parse (`xlsx`/`csv`) → validate every row with zod → write everything in one transaction. | Any error returns every bad row with its spreadsheet row number, and nothing is saved. The seed uses the same code path, so the sample files are loaded exactly the way real ones will be. |

## Assumptions

- A student belongs to exactly one class. A quiz can be assigned to several classes.
- Usernames are case-insensitive (stored in lowercase) and use `a-z 0-9 . - _`.
- Question points are whole numbers from 1 to 100. The penalty is a whole percentage from 0 to 100.
- Each quiz file holds one quiz's questions. The quiz details (title, classes, window, time limit, penalty) are entered in the import form, because a CSV has only one sheet and teachers pick these per class anyway.
- The student spreadsheet includes a `password` column (the centre hands out initial passwords). On re-import, a blank password keeps the existing one, so updating a class list doesn't lock anyone out.
- A deadline is fixed when the attempt starts. Extending `closesAt` or the time limit later affects only attempts that start afterwards.
- The review opens for everyone at `closesAt`, including students who submitted early. That keeps answers from circulating while the quiz is still open.
- A student who opens a quiz that isn't assigned to their class gets a 404, not a 403, so they can't tell that the quiz exists. A teacher opening another teacher's quiz also gets a 404.
- Admin (Nour) can view and edit every quiz but doesn't author them. Quizzes belong to a teacher.
- If a class is removed from a quiz after students attempted it, those students stay in the results.
- All times are shown and entered in `Asia/Amman` and stored as UTC `timestamptz`.
- Sample passwords (`student123` etc.) are shared for the demo only.

## Extras, and why

- **Login throttling:** 10 failed tries per username per 15 minutes. It's cheap and stops a classmate from guessing passwords. It lives in memory, so it resets on restart (see below).
- **Ordered autosave:** answer saves are queued in the browser, so tapping A then B quickly can never be stored as A.
- **Admin password reset:** replaces email reset (out of scope). Students forget passwords, and Nour needs a way to fix that.
- **"Not started" in results:** the results table lists every student assigned to the quiz, not just those who attempted it, so a teacher can see who is missing.
- **CSV export with a UTF-8 BOM:** without it, Excel shows Arabic names as garbage.
- **Right-to-left option layout:** `dir="auto"` on the question text isn't enough, because the A–D badge comes first and makes the browser pick left-to-right for the whole block. A small helper applies the browser's own first-strong-character rule to the question text and sets `dir` on the option list.
- **Deterministic seed:** past attempts on the closed quiz come from a seeded random generator and go through the real `submitAttempt`, so the demo results are the same on every machine and scored by the real rules.

## Left out (on purpose)

From the ticket's out-of-scope list:
- Shuffling question and option order.
- Email password reset (admin resets passwords instead).
- A full Arabic UI translation (user content is right-to-left; interface text is English).
- Multi-select questions and images in questions.
- Production deployment.
- Proctoring.

Also not built:
- **Deleting or archiving** quizzes and users. Deleting a quiz with attempts needs a policy (keep results?), so it's better decided with Nour.
- **Pagination** on the users list. About 300 students on one page is fine for now.
- **Security headers / CSP** and a shared rate-limit store. These are needed before a real deployment, not for a local run.
- **Revoking sessions:** sessions are JWTs that last 12 hours, so a password reset doesn't sign out someone who is already signed in.

## Known limitations

- The login throttle is per process and in memory, so a restart clears it.
- The server clock is the authority, so the host needs correct time (NTP).
- If the connection drops, answers aren't saved until the student taps **Retry** (it shows "Not saved"). They aren't stored offline.
- The teacher results table scrolls sideways on narrow phones. The student flow was the priority at 360px.

## Next week

1. First-login password change, and archiving quizzes and users.
2. Per-student extra time (accommodations), stored as an override on the attempt.
3. Save answers offline in the browser when the connection drops, and send them before the deadline.
4. Security headers, CSP, and a Postgres-backed login throttle. Deploy behind HTTPS.
5. Arabic interface translation and a right-to-left layout for the whole app.
6. A question bank shared across quizzes, and optional shuffling.
