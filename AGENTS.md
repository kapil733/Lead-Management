# AGENTS.md — TechConnect Ops

Instructions for AI agents working in this repository.

## Read first (every task)

1. `docs/PRODUCT.md` — product scope, roles, out-of-scope
2. `docs/TASKS.md` — current phase and checklist
3. `docs/DATA_MODEL.md` — authoritative schema (keep in sync with Prisma)
4. `docs/UI_SPEC.md` — tokens, shells, page behaviour
5. Relevant rules under `.cursor/rules/`

Also consult when relevant:

| Doc | When |
|---|---|
| `docs/FLOWS.md` | Claim/close/import/attendance/payroll state machines |
| `docs/PAYROLL_RULES.md` | Any payroll calc or attendance payable-days work |
| `docs/SECURITY.md` | Auth, RBAC, lead protection, encryption |
| `docs/GLOSSARY.md` | Domain terms |
| `docs/DECISIONS.md` | Stack and ADR log — append when changing libs |
| `docs/OPEN_QUESTIONS.md` | Ambiguities — log new ones; use conservative defaults |
| `CURSOR_MASTER_PROMPT.md` | Full master plan, phases, DoD, seed/demo |

## Working rules

- **One phase at a time.** Build only what `docs/TASKS.md` marks as the current phase. Stop after typecheck/lint/tests and a short summary.
- **Do not invent** business rules, statutory rates, or UI. Log gaps in `OPEN_QUESTIONS.md`.
- **Verify packages** before use (`npm view` / installed types). No Pages Router patterns in App Router.
- **No fake functionality.** Unbuilt features must not appear in the UI.
- **Never trust the client** for `userId` / `role`. Guard every server action and route.
- Business logic in `src/server/**` only. React never imports Prisma.
- Soft results: `{ ok: true, data } | { ok: false, error }`.
- Money = paise ints; phones = 10-digit normalised; attendance dates = `DATE`.

## Phase kickoff

Use the template in `CURSOR_MASTER_PROMPT.md` Part 9 / `docs/TASKS.md`. Example for the next phase:

```text
Execute PHASE 1 from CURSOR_MASTER_PROMPT.md. First re-read AGENTS.md, .cursor/rules, docs/PRODUCT.md, docs/DATA_MODEL.md, docs/UI_SPEC.md and docs/TASKS.md. Verify the installed versions of every library you will use. Build only this phase. Do not add features from later phases. When finished: run typecheck, lint, tests; update docs/TASKS.md and docs/DECISIONS.md; then summarise what you built, what you assumed (also log in docs/OPEN_QUESTIONS.md) and exactly how I can verify it manually. Then stop.
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

