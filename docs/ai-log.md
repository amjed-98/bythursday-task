# AI log

Running log of how AI tools were used on this project: prompts given, what came back, and what I corrected.
Tool: Claude Code (Claude Opus) in the Claude desktop app.

## 2026-09-23

### Session 1: brainstorm → ticket
- Pasted the byThursday brief and ran a brainstorming skill. Claude asked clarifying questions (auth method, roles, negative-marking rule, timer authority, import formats); I answered each, and the answers became the "Decisions already made" table in `docs/TICKET-BT-1.md`.
- Asked for the result as a Jira-style ticket so a fresh session could start from it without the chat history.

### Session 2: plan → implementation
- Prompt: "Read docs/TICKET-BT-1.md. Decisions are settled. Write the plan with superpowers:writing-plans, then implement it."
- Claude wrote `docs/superpowers/plans/2026-09-23-quiz-platform-mvp.md` (13 tasks, interfaces per task, a "Review Focus" list of edge cases the ticket doesn't spell out).
- npm registry was flaky (TLS resets); first `pnpm add` died. Retried with a pinned `package.json` + `pnpm install` with higher fetch retries.
- Pinned TypeScript to 5.9 (npm `latest` is 7.0, not yet supported by Next 15) and Vitest to 3.x.
- Order of work followed the plan; the schema + attempts service + integration tests came first because every other feature depends on the one-attempt and deadline rules.

### Corrections and problems found along the way
| What happened | How it was caught | Fix |
|---|---|---|
| Auth.js JWT type augmentation (`declare module "next-auth/jwt"`, then `@auth/core/jwt`) didn't merge under pnpm's strict `node_modules`, so `token.role` was `unknown`. | `tsc` errors | Dropped the augmentation. Token claims are now **validated with zod** in the session callback, which is also safer than a cast. |
| The role list was imported from the Drizzle schema into edge middleware. | Code review of the import graph | Moved `ROLES` into a dependency-free `src/domain/roles.ts`. |
| ESLint couldn't load `eslint-plugin-react-hooks` (pnpm isolation), and `next lint` is deprecated. | `pnpm lint` crashed | `.npmrc` `public-hoist-pattern` for eslint plugins; switched to the ESLint CLI. |
| Re-running the seed looked hung. | Watched `pg_stat_activity`: the DB was idle, so the time was going to CPU | Benchmarked bcrypt: 1.8 s per hash on this (heavily loaded) machine, both pure-JS and native. Kept pure-JS `bcryptjs` (no native build in Alpine); the seed now skips user imports once users exist. |
| The e2e login step "failed": the next `page.goto` ran before the sign-in response set the cookie. | Server log showed `POST /login 303`, then `/admin/import → /login`. A curl reproduction with a cookie jar worked. | The test waits for the redirect away from `/login`. It was a test race, not an app bug. |
| `docker compose up` failed with `EAI_AGAIN registry.npmjs.org`. | Build log | Containers on the Docker bridge have no internet on this machine (VPN), but host networking works. Added an opt-in `DOCKER_BUILD_NETWORK=host`; the default is unchanged for reviewers. |
| The runtime image would have had corepack download pnpm at container start. | Reading the Dockerfile while debugging the above | `corepack prepare pnpm@10.28.2 --activate` in the base layer. |
| The e2e max score was written as 20; the sample English quiz sums to 21. | Summed the points before running the test | Fixed the assertion. |
| Moving a quiz's close time earlier while students were answering left their stored deadlines past the new close time, so the review could open while they could still answer. | A fresh review of the branch against the acceptance criteria (session 3) | `updateQuiz` caps running deadlines at the new `closesAt`, with two integration tests seen failing first. |

### Honest notes on process
- Most tests were written first and seen failing (route access, login throttle, import parser and validator). For scoring/deadline the implementation was typed in the same step because dependencies were still installing, and `quiz-input` tests were written right after the schema. All of them run green now; none were edited to match a bug.
- The AI wrote nearly all of the code in one session, from the plan. The product decisions were mine (session 1).

## 2026-09-24

### Session 3: verification
- Ran the session 2 prompt again in a new worktree. Claude noticed the plan and all 13 tasks were already committed, and asked instead of redoing them. I chose "verify against acceptance criteria".
- Checked: lint, typecheck, unit, integration, e2e; `docker compose up` on a fresh volume under a separate project name; README logins; the Arabic quiz at 360px (Playwright, right-to-left computed direction, no horizontal scroll).
- A read-only review agent found the close-time gap above, which I confirmed in the code before fixing.
