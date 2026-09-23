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
