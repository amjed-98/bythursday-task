# BT-1: Quiz platform MVP for Nour's tutoring centre (byThursday assessment)

**Type:** Story · **Priority:** Highest · **Deadline:** submit public GitHub repo by 2026-09-24 (24h window)
**Repo:** new, `bythursday-task` (local: `/home/amjad/Desktop/projects/bythursday-task`), GitHub `amjed-98/bythursday-task` (public)

## Context

Practical assessment for byThursday. Client brief (Nour, a tutoring centre in Amman, with ~300 students and 12 teachers):
- Students log in, take a timed multiple choice quiz and see their score at the end.
- Teachers put the quizzes in. Each quiz has a time limit (usually 20 min) and a date range when it is open.
- A student cannot take a quiz twice. Nour wants to see how the students did.
- Negative marking for wrong answers varies by teacher and quiz.
- Sample data: 3 classes (10A, 10B, 11A) with about 20 students each, and 4 teachers. A typical quiz has 15 questions with 4 options each, and each question has its own points.
- Many students have Arabic names, and some quizzes are in Arabic.
- No designer, so it must look clean. It must work well on phones, because most students only have a phone.
- The real data will arrive later as spreadsheets, so the sample data must be loadable the same way.

The reviewers run the project from the README, try to break it, and read everything, including how the AI tools were used.

## Decisions already made (do not re-litigate)

| Area | Decision |
|---|---|
| Stack | Next.js 15 App Router + TypeScript strict + Tailwind, server actions. Drizzle ORM + Postgres 16. pnpm. |
| Run | `docker compose up` = db + migrate + seed + app on :3000. One command on a clean machine. |
| Auth | Auth.js credentials, **username + password** (the centre issues usernames), bcrypt, httpOnly session cookie. No email. |
| Roles | **Student**, **Teacher**, **Admin** (Nour). Admin sees everything and manages users and imports. Teacher sees their own quizzes and those quizzes' results. Student takes quizzes. |
| Quiz input | In-app create/edit form **and** CSV/XLSX import (students, teachers, quizzes). |
| Negative marking | **Per-quiz penalty %**. Wrong = −penalty% × question points. Blank = 0. Correct = +points. Total floored at 0. |
| Timer | Server-authoritative. `deadline = min(startedAt + timeLimit, quiz.closesAt)`. Late answers rejected. Expired attempts auto-finalised when read. |
| One attempt | DB unique constraint on (studentId, quizId). A refresh, second tab or dead phone resumes the same attempt with the same time left. |
| Answer secrecy | Correct answers are never sent to the client during an attempt. Score is shown right after submit. The per-question review opens only after the quiz window closes. |
| Editing | Questions are locked once any attempt exists. |
| Arabic | `dir="auto"` on user content, Noto Sans Arabic font, UTF-8 end to end (including XLSX/CSV import). UI chrome stays in English. |
| Timezone | Asia/Amman for display and for the open/close inputs. Stored as UTC. |

## Scope

### Student
- Login.
- Dashboard: available, upcoming and completed quizzes for the student's class.
- Take a quiz: one question per screen, large tap targets, sticky countdown, question navigator, each answer autosaved to the server, confirm before submit, auto-submit at 0.
- Result: score, max score, correct/wrong/blank counts. Review after the window closes.

### Teacher
- My quizzes list. Create/edit: title, classes assigned, time limit, opens/closes, penalty %, questions (text, points, 4 options, 1 correct).
- Quiz import from XLSX/CSV, with row-level validation errors shown to the teacher.
- Results per quiz: a table per student (score, time taken, submitted/expired/not started), per-question % correct, CSV export.

### Admin
- All quizzes and results across teachers, with a filter by class.
- Import students and teachers from XLSX/CSV. User list.

### Sample data (`sample-data/`, loadable)
- `students.xlsx` (about 60 students, realistic Arabic names in Arabic script plus transliteration, and class), `teachers.xlsx` (4 teachers), plus 3 quiz files.
- Quizzes: an English quiz with no penalty (open now), an Arabic quiz with a 25% penalty (open now), and a closed quiz with seeded past attempts so the results pages have data.
- The seed runs automatically on the first `docker compose up`. `pnpm db:seed` re-runs it idempotently.

## Acceptance criteria

1. On a clean machine, `git clone` followed by `docker compose up` gives a working app at http://localhost:3000 with the seeded data. No other steps.
2. Logins for student, teacher and admin from the README work.
3. A student cannot:
   - start a second attempt, even with concurrent requests;
   - answer after the deadline, including by editing client time or replaying requests;
   - see correct answers before the window closes;
   - open a quiz that is not assigned to their class or is outside its window.
4. A teacher cannot view or edit another teacher's quiz or results. Students cannot reach teacher or admin routes (server-side checks, not just hidden links).
5. The scoring matches the negative-marking rule for penalties of 0%, 25%, 100% and a floor case.
6. An Arabic quiz renders right-to-left correctly on a 360px-wide phone. The whole student flow is usable at 360px with no horizontal scroll.
7. XLSX import of the sample files works through the UI. Malformed rows report the row number and the reason, and nothing partial is committed (one transaction per import).
8. Tests:
   - unit tests for scoring, deadline calculation and import parsing/validation;
   - integration tests against real Postgres for the one-attempt rule, late-answer rejection, authorization and answer secrecy;
   - one Playwright end-to-end test: student logs in, takes the quiz, submits, sees the score.
9. The repo root contains `README.md` (one-command run, how to load data, all logins), `DECISIONS.md` (assumptions, extras and why, what was left out, next week), `AI_USAGE.md` (tools, how they were directed, how output was verified; honest) and `CLAUDE.md`.
10. The commit history is incremental: conventional commits, one per logical unit, starting from scaffold. No single mega-commit.

## Out of scope (list in DECISIONS.md)
- Shuffling question/option order.
- Email password reset (admin resets passwords instead).
- A full Arabic UI translation.
- Multi-select questions, images in questions.
- Production deployment.
- Proctoring.

## Suggested order
1. Scaffold, Docker Compose, DB schema and migrations.
2. Auth and roles.
3. Scoring and deadline logic (TDD).
4. Student take-quiz flow.
5. Teacher CRUD.
6. Import.
7. Results.
8. Seed and sample files.
9. Mobile/RTL polish.
10. End-to-end test.
11. Docs.

## Notes
- Not a Jira-tracked repo. There is no `origin/dev` and there are no deploy workflows. Work on `main` via feature branches merged locally, or directly with incremental commits. Do not set up deploy.
- `AI_USAGE.md` must be honest and will be discussed in the interview. Keep a running log in `docs/ai-log.md` of prompts and of corrections made to the AI's output.
