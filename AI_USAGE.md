# How AI was used

**Short version:** Claude Code (Anthropic's Claude, running in the Claude desktop app) wrote nearly all of the code and docs in this repo. I set the direction: I made the product decisions, and they were fixed in a ticket before any code existed. The AI then planned and built against that ticket and had to prove each rule with tests. A running log of prompts and corrections is in [docs/ai-log.md](docs/ai-log.md).

## Tools

| Tool | Used for |
|---|---|
| Claude Code (Claude Opus), desktop app | Everything below |
| "superpowers" skills in Claude Code: `brainstorming`, `writing-plans` | Structured Q&A to reach decisions; a task-by-task implementation plan |
| No other AI tools | — |

## How it was directed

1. **Decisions first (session 1).** I pasted the brief and ran a brainstorming session. The AI asked questions one area at a time (auth method, roles, how negative marking works, who owns the timer, what "one attempt" means when a phone dies, import formats). I answered each one. The answers became the "Decisions already made (do not re-litigate)" table in [`docs/TICKET-BT-1.md`](docs/TICKET-BT-1.md).
2. **A ticket as the contract.** I had it written as a Jira-style ticket with acceptance criteria, so a fresh session could work from the ticket alone instead of a long chat.
3. **Plan before code (session 2).** Prompt: *"Read docs/TICKET-BT-1.md. Decisions are settled. Write the plan with superpowers:writing-plans, then implement it."* The plan is in [`docs/superpowers/plans/`](docs/superpowers/plans/2026-09-23-quiz-platform-mvp.md). It lists every task's files and interfaces, plus a "Review Focus" list of edge cases the ticket doesn't spell out (late auto-submit, a quiz closing mid-attempt, an option id from another question, numeric Excel cells, BOM-prefixed CSV).
4. **Standing rules.** My global Claude Code config sets the working style: conventional commits per logical unit, tests with every change, no magic numbers, early returns, zod at every boundary, no secrets in code.

## How the output was checked

Automated:
- **Unit tests (74):** scoring for 0%, 25% and 100% penalty and the floor case; deadline and window boundaries; Amman/UTC conversion; route access by role; login throttle; import parsing (xlsx numeric and rich-text cells, BOM CSV, Arabic) and row validation.
- **Integration tests (53) against real Postgres:** 20 concurrent starts create 1 attempt; late and replayed answers rejected; expired attempts finalised and scored; options from another question rejected; other students' attempts forbidden; a student can't open a quiz for another class or outside its window; the attempt payload contains no correctness data; review hidden until close; teacher A can't read or edit teacher B's quiz or results; imports with one bad row commit nothing.
- **Playwright e2e** at 360px: admin imports a fresh student through the UI; the student signs in, takes the quiz, submits and sees the score; the page has no horizontal scroll; `/teacher` redirects the student away.
- `tsc --noEmit` and ESLint clean; `next build` passes; `docker compose up` checked from a fresh `git clone`.

Manual (in the AI session): reading server logs and `pg_stat_activity` when the seed looked hung, reproducing the login flow with curl and a cookie jar, and checking the seeded data against the logins in the README.

## Where the AI was wrong or needed correcting

Full table in [docs/ai-log.md](docs/ai-log.md#corrections-and-problems-found-along-the-way). The main ones:

- **Type augmentation** for Auth.js didn't apply under pnpm. The fix was to validate the session token with zod instead of casting, which is also stricter.
- **A flaky e2e** looked like broken login. The server log and a curl reproduction showed the test was navigating before the sign-in cookie landed. The app was fine; the test was fixed.
- **"Seed hangs"** was a very slow bcrypt on a heavily loaded machine (1.8 s per hash). This was measured before changing anything, not guessed at.
- **Docker build failure** was this machine's VPN blocking bridge networking. I added an opt-in workaround and left the default behaviour unchanged.
- **Test discipline:** not every test was seen failing before its code was written (details in the log). I'm noting it rather than hiding it.

## What I would check before trusting it more

- A human read-through of the attempt service (`src/server/attempts.ts`). It holds the security-relevant logic: row locks, deadline checks, finalising.
- The quiz flow on a real Android phone with a slow connection, including the "Not saved → Retry" path.
- Arabic content reviewed by a native speaker. The sample Arabic grammar questions were written by the AI.
