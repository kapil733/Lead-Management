# CURSOR_MASTER_PROMPT — TechConnect Ops

Single source of truth for the build plan. Distilled, always-current detail lives in `/docs`. Prefer those files when they diverge from narrative here; update both in the same change.

## How to use

1. **Phase 0** (done): context files, `.cursor/rules`, `AGENTS.md`.
2. Run **one** per-phase kickoff from Part 9 at a time. Do **not** build everything in a single run.

## Docs map

| File | Content |
|---|---|
| `docs/PRODUCT.md` | Product paragraph, roles, modules, out-of-scope |
| `docs/GLOSSARY.md` | Domain terms |
| `docs/DATA_MODEL.md` | Prisma field list + invariants |
| `docs/FLOWS.md` | Claim/close/import/attendance/payroll flows + Mermaid |
| `docs/UI_SPEC.md` | Tokens, shells, page specs |
| `docs/PAYROLL_RULES.md` | Formulas, rounding, worked example |
| `docs/SECURITY.md` | Auth, RBAC, lead protection, encryption |
| `docs/DECISIONS.md` | ADR log |
| `docs/OPEN_QUESTIONS.md` | Ambiguities + conservative defaults |
| `docs/TASKS.md` | Phase checklist with status |

## Tech stack (fixed)

Next.js (latest stable, App Router) · TypeScript strict · Tailwind + shadcn/ui · Prisma + Postgres (Neon) · Auth.js v5 Credentials + JWT · zod · RHF · tanstack-table · Recharts · nuqs · exceljs + papaparse (**not** npm `xlsx`) · `@react-pdf/renderer` · Vercel Blob · date-fns · sonner · Vitest · Playwright · pnpm · Vercel hosting · `src/env.ts` zod boot validation.

Folder structure: see Part 2.1 in the original brief — `src/app/(auth|employee|admin)`, `src/server/**`, `src/lib/**`, `src/components/**`, `prisma/`, `docs/`, `tests/`.

Conventions: money = paise ints; dates attendance = `DATE`; phones = `^[6-9]\d{9}$`; soft action results; server-side list pagination.

## Phases

| # | Phase | Acceptance |
|---|---|---|
| 0 | Context + rules + AGENTS | Part 3 files exist |
| 1 | Scaffold, tokens, shadcn, Prisma+migration, Auth, RBAC, shells, seed | Login to shells; employee blocked from `/admin`; seed idempotent |
| 2 | Lead import + Leads list/detail + revert | 5k import; dedupe/invalid; revert |
| 3 | Employee case flow + claim txn | Concurrent claim test; §6.1 rules |
| 4 | Completed + Joined + audit + telecallers | Own data only; joined audited |
| 5 | Dashboard + live activity + release | Seed-matched; release works |
| 6 | Analytics full | URL filters; cross-filter; empty/loading |
| 7 | Payroll master (clients, employees, salary, docs) | History; encrypt+mask |
| 8 | Holidays + attendance grid | §8.3 + Playwright |
| 9 | Calc, runs, payslips, exports, statutory | Worked example exact; lock immutable |
| 10 | Hardening + README + e2e | `pnpm test:e2e` green |

### Kickoff template

```text
Execute PHASE <N> from CURSOR_MASTER_PROMPT.md. First re-read AGENTS.md, .cursor/rules, docs/PRODUCT.md, docs/DATA_MODEL.md, docs/UI_SPEC.md and docs/TASKS.md. Verify the installed versions of every library you will use. Build only this phase. Do not add features from later phases. When finished: run typecheck, lint, tests; update docs/TASKS.md and docs/DECISIONS.md; then summarise what you built, what you assumed (also log in docs/OPEN_QUESTIONS.md) and exactly how I can verify it manually. Then stop.
```

## Demo / seed (Phase 1+)

Idempotent `prisma/seed.ts` only when `SEED_DEMO=true` or non-production.

- Users: `admin@demo.test` / `Admin@12345`; telecallers `priya|rahul|neha|amit|sana@demo.test` / `Caller@12345` (`mustChangePassword=false`).
- ~400 leads; ~140 closed cases / 30d; one OPEN stale case for Priya (~75 min).
- Payroll: 2 clients, 14 contract employees, 2026 holidays, Aug+Sep 2026 attendance; August locked, September open with unmarked days.
- README "Demo accounts" section.

## Definition of done (every phase)

- Typecheck, lint, unit + integration tests pass; mandatory coverage for payroll, attendance resolution, phone normalisation, claim concurrency when those land.
- No console errors on new pages; loading/empty/error states.
- Role access verified.
- Docs updated; open questions logged; summary + manual verification steps.
- No hardcoded colours, rates, or secrets; no unused code; no TODO stubs.
