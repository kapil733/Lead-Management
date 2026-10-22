# Tasks / Phase checklist

Each phase ends with: `pnpm typecheck && pnpm lint && pnpm test` green, this file updated, summary printed, then **stop**. Do not build later phases early. No stub buttons for unbuilt features.

| # | Phase | Status | Acceptance |
|---|---|---|---|
| 0 | Context files + `.cursor/rules` + `AGENTS.md` | **done** | All Part 3 files exist and reflect the master prompt |
| 1 | Scaffold, tokens, shadcn, Prisma + migration (partial unique indexes), Auth.js, RBAC middleware, shells, seed | **done** | Admin/employee login to shells; employee blocked from `/admin`; seed idempotent |
| 2 | Lead import wizard + admin Leads list/detail + import history/revert | **done** | 5k-row import: dedupe + invalid report; revert works |
| 3 | Employee case flow + claim transaction | **done** | Parallel claims never same lead (integration test); §6.1 validation covered |
| 4 | Completed list + Joined + audit + telecaller management | **done** | Employee sees only own data; joined audited |
| 5 | Simple admin dashboard + live activity + release stale | **done** | Numbers match seed; release works |
| 6 | Analytics (tabs, filters, cross-filter, drill, export) | **done** | Filters in URL; cross-filter; loading/empty states |
| 7 | Payroll: clients, employee master, salary structures, documents | **done** | Salary history; sensitive fields encrypted + masked |
| 8 | Holidays + attendance grid (interactions, undo/redo, import/diff, lock) | **done** | §8.3 interactions; Playwright Ctrl+Click + right-click |
| 9 | Salary drawer, calc engine, runs, payslip PDF, exports, statutory settings | **done** | Worked example test exact; locked run immutable |
| 10 | Hardening: a11y, error boundaries, rate limits, README/deploy, e2e | **done** | Full e2e suite green; README deploy guide |

## Phase 10 notes (2026-10-07)

Built:

- Error boundaries: `error.tsx` (root/admin/employee), `global-error.tsx`, `not-found.tsx` with retry
- A11y: skip link, `#main-content` landmarks, `aria-current` on nav, dashboard loading skeleton
- Rate limits: shared in-memory limiter; login (existing) + claim, import commit, lead export, KYC reveal
- README: demo accounts, env table, Docker Compose Postgres, Vercel+Neon deploy guide, security checklist
- `docker-compose.yml` (Postgres 16 on :5436); `.github/workflows/ci.yml` (migrate/seed/typecheck/lint/test)
- E2E expanded: auth+RBAC, smoke (runs/leads/completed), attendance Ctrl+Click/right-click — `pnpm test:e2e` **8 passed**
- Packages verified: `@playwright/test@1.56.1`, Next `16.4.0`

**Product phases 0–10 complete.**

## Phase 9 notes (2026-10-07)

Built:

- Pure calc engine `src/server/payroll/calc/*` (rounding, salary); rates from `StatutoryConfig` only
- Worked example unit test exact (payable 28.5 → net ₹15,945)
- `/admin/payroll/runs` list + month detail: Recalculate, Lock (snapshots PayrollLine), Unlock, exports
- Exports: payroll register / PF / ESIC xlsx; payslip ZIP (`jszip@3.10.1`); single payslip PDF (`@react-pdf/renderer@4.9.0`)
- `/admin/payroll/settings` statutory config form + history + CA/EPFO/ESIC note
- Attendance name → salary drawer with full breakdown; profile Payslips tab
- Lock from attendance or runs writes PayrollLine snapshots; recalc/mark refused while LOCKED
- Nav: Runs + Settings added
- Packages: `@react-pdf/renderer@4.9.0`, `jszip@3.10.1`
- Vitest `fileParallelism: false` (shared DB)

## Phase 8 notes (2026-10-07)

Built:

- Pure `resolveDayStatus` (§8.3): explicit → holiday → weekly off → unmarked; OUT_OF_RANGE outside DOJ/exit
- `/admin/payroll/holidays` year CRUD; holidays drawer on attendance page
- `/admin/payroll/attendance` OpenProject-style grid: sticky name/TOTAL, weekend/holiday shading, legend, save indicator
- Interactions: click cycle, Shift+click range, drag select, Ctrl/Cmd+click Present, right-click cell/col/row menus, hotkeys P/H/A/L/W/Del, Ctrl+Z/Y undo/redo, optimistic batched writes
- Lock/unlock month (treat unmarked as Absent); locked = read-only attendance (PayrollLine snapshots = Phase 9)
- Excel template download + import with diff dialog; matrix format (code + day columns)
- Name click → salary preview drawer (payable days + profile link; no calc)
- Profile Attendance tab → link to grid
- Nav: Employees, Attendance, Holidays, Clients
- Tests: unit resolve; integration holidays/mark/lock; Playwright Ctrl+Click + right-click (`pnpm test:e2e`)
- Packages verified: `@playwright/test@1.56.1`, `exceljs@4.4.0`, `date-fns@4.1.0`, `nuqs@2.8.1`

**Not built (later phases):** salary calc engine, PayrollLine snapshots on lock, payslips, runs UI, statutory settings, full employee Excel import wizard.

## Bugfix (2026-10-10)

Completed cases crashed the case page (draft snapshot loop) and the Completed list (Joined switch nested inside a button). Name search matched every row because an empty phone fragment was included. Both fixed.

Friend numbers showed "Invalid phone" on the first digit. The field now stays quiet until the number is finished or the field is left, and the message says to enter a 10-digit mobile starting with 6–9.

## Data reset (2026-10-10)

Operational data wiped so the app can be started empty: leads, cases, referrals, imports, audit log, payroll employees, attendance, clients, holidays, and runs. Admin logins, app settings, and statutory rates were kept. Demo telecaller logins were removed.

## UI restyle (2026-10-10)

Matched the sign-in, ops console, and telecaller reference screens: lime-on-charcoal tokens, dark/light toggle, console shell (module switch, search, rail), calling desk, and page titles. Behaviour, routes, and server actions are unchanged.

Dark cards were the same black as the page. `--surface` is now `#262E2A` (was `#111412`), with `--surface-2` and borders lifted to match, so cards sit above the background on every page. Light theme is unchanged.

## Import fields (2026-10-10)

Lead import “Map to” now includes every column from the Halla workbook (DOB, email, location, recruitment status, company, salaries, notice, CTC, DOJ, position, experience, resume, alternative mobile, serial). Those values are stored on the lead and shown on the open case. Sheet status does not change lead status.

## Case desk (2026-10-10)

The open-case page fits one screen. Close case uses the green button. The profile card stays on the left. Friends sit at the top right. Call outcome stays bottom left, with remarks filling the bottom right. The profile and friends cards take twice the height of the call and remarks cards. Profile fields use the earlier three-column layout and stretch to fill that card. Friend rows stay compact. Friends are added, edited, and deleted in a modal.

## Lead import (2026-10-10)

A sheet with one table per city (title row, then the same header repeated) can be imported. After mapping columns, pick one or more cities. Only those rows are added. A normal single-table file skips that step.

## Calling desk (2026-10-10)

Employee history no longer lists phone numbers. Opening one history row loads that lead's number and saved remark. Reconnect requires a remark of at least 3 characters; those remarks show on the next open of the same lead. Reconnect history rows have Open, which starts that call again on the case desk with Close case. The app name is EVerified and the accent is `#12A56E`.

## Calling desk and ECR (2026-10-21)

The open case lets the telecaller edit city, type a location, and choose whether the lead is a petrol bike technician or an EV bike technician. Those values save on that lead when the case closes. Payroll runs download an EPFO ECR 2.0 `.txt` file (`kind=ecr`) built from each PF-applicable line. Employees without a 12-digit UAN are named on the run page and left out of the file.

## All phases complete

No further phased build work in the master checklist. Follow-ups (Redis rate limits, employee Excel import wizard, branding settings) are tracked in `docs/OPEN_QUESTIONS.md`.
