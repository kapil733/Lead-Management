# Architecture Decision Record (running log)

One line per decision. Add a line when introducing a new framework/lib or changing a fixed stack choice.

| Date | Decision |
|---|---|
| 2026-10-07 | Stack fixed: Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Prisma, Postgres (Neon), Auth.js v5 Credentials + JWT, zod, react-hook-form, tanstack-table, Recharts, nuqs, exceljs + papaparse (not npm `xlsx`), @react-pdf/renderer, Vercel Blob, date-fns, sonner, Vitest, Playwright, pnpm. |
| 2026-10-07 | Single repo, one deployment; no separate API server (<10 users). |
| 2026-10-07 | Money = integer paise; phones = normalised 10-digit; attendance dates = Postgres DATE. |
| 2026-10-07 | Soft action results: `{ ok: true, data } \| { ok: false, error }`; never throw expected failures to UI. |
| 2026-10-07 | Lead claim concurrency via `FOR UPDATE SKIP LOCKED` + partial unique indexes. |
| 2026-10-07 | Payroll statutory rates from effective-dated `StatutoryConfig`, not hardcoded in calc. |
| 2026-10-07 | Phase 0: context docs + Cursor rules only; no application code yet. |
| 2026-10-07 | Phase 1 scaffold on Next.js **16.4.0** (App Router), React 19.3, Tailwind **4.3** via `@tailwindcss/turbopack`. |
| 2026-10-07 | Auth.js / next-auth **5.0.0-beta.32**; RBAC in `src/proxy.ts` (Next 16 proxy convention, nodejs runtime — not edge middleware). |
| 2026-10-07 | Prisma pinned to **6.19.3** (not 7/8 RC) to avoid required driver adapters + custom client output during scaffold. |
| 2026-10-07 | Password hashing: **bcryptjs cost 12** (argon2 native build segfaulted in this environment). |
| 2026-10-07 | Disabled Next.js `cacheComponents` for Phase 1 so session reads stay simple; revisit with Suspense later. |
| 2026-10-07 | Zod **4.6.5**; shadcn-style primitives hand-added (Button/Input/Label/Card/Avatar/Dropdown) matching installed Radix. |
| 2026-10-07 | Dev app port **3010** to avoid local port clashes; Postgres demo on Docker `localhost:5436`. |
| 2026-10-07 | Phase 2: **exceljs 4.4.0** + **papaparse 5.7.0** for lead import (not npm `xlsx`); **nuqs 2.8.1** for Leads URL filters. |
| 2026-10-07 | Import wizard keeps the `File` on the client and re-uploads with mapping for review/commit (serverless-friendly; no staging table). |
| 2026-10-07 | CSV export capped at 10,000 rows in Phase 2; audit action `LEAD_EXPORT_CSV`. |
| 2026-10-07 | Phase 3: claim uses raw SQL `FOR UPDATE OF l SKIP LOCKED`; prefer leads with no prior Case for this employee, then fall back. |
| 2026-10-07 | Daily case cap counts cases **started** today (IST) with status OPEN or CLOSED. |
| 2026-10-07 | Case form draft autosave to `localStorage` key `tc-case-draft:{caseId}` every 2s; restored via `useSyncExternalStore`. |
| 2026-10-07 | Added `react-hook-form@7.89.0` + `@hookform/resolvers@5.2.2` (stack); Phase 3 case UI uses controlled React state for draft sync simplicity. |
| 2026-10-07 | Phase 4: `@radix-ui/react-dialog@1.1.15`, `@radix-ui/react-switch@1.2.6`, `recharts@2.15.4` (2.x; 3.x exists but 2.15 matches common shadcn chart usage). |
| 2026-10-07 | Telecaller management lives at `/admin/employees` (UI_SPEC); payroll contract employees remain `/admin/payroll/employees` (Phase 7). |
| 2026-10-07 | Temp telecaller passwords: `Tmp` + 8 base64url chars + `1` (≥10, includes digit); shown once in dialog with copy. |
| 2026-10-07 | Employee Joined uses same `setLeadJoined` as admin with `actorRole` ownership check + audit. |
| 2026-10-07 | Phase 5 dashboard period = `today` \| `7d` \| `30d` in URL (`nuqs`); KPIs/chart/telecaller bars share the same window. |
| 2026-10-07 | Release sets Case `RELEASED` + `closedAt`/`durationSeconds`/`releasedById`/`releaseReason`; Lead → `NEW` with `nextEligibleAt=null`; audit `CASE_RELEASE`. |
| 2026-10-07 | Live activity soft-polls via `router.refresh()` every 30s (no websocket). |
| 2026-10-07 | Phase 6 analytics: all filter/cross-filter state in URL via `nuqs`; default range last 30 IST days. |
| 2026-10-07 | Analytics aggregates closed cases in app memory (cap 10k) — fine for current volume; SQL rollups later if needed. |
| 2026-10-07 | Analytics CSV export at `/api/admin/analytics/export`; audit `ANALYTICS_EXPORT_CSV`. |
| 2026-10-07 | Chart ⋯ menu = clear this cross-filter + export CSV; no per-visual PNG export in v1. |
| 2026-10-07 | Phase 7: AES-256-GCM field encryption; ciphertext = base64(iv‖tag‖ciphertext); last4 stored separately for masks. |
| 2026-10-07 | Payroll docs: `@vercel/blob@2.8.1` private when `BLOB_READ_WRITE_TOKEN` set; else local `.data/uploads` with `local:` URL prefix. |
| 2026-10-07 | Salary structures are append-only history rows keyed by `effectiveFrom` (no in-place edit/delete in Phase 7). |
| 2026-10-07 | Payroll nav ships only Employees + Clients in Phase 7 — no stub links for Attendance/Holidays/Runs/Settings. |
| 2026-10-07 | Phase 8: `@playwright/test@1.56.1` for attendance Ctrl+Click / right-click e2e; `pnpm test:e2e`. |
| 2026-10-07 | Phase 8 lock freezes attendance only; PayrollLine snapshots deferred to Phase 9 calc. |
| 2026-10-07 | Attendance Excel = matrix (Employee Code + day columns); codes P/½/A/PL/WO/HW. |
| 2026-10-07 | Next `allowedDevOrigins: ['127.0.0.1','localhost']` so Playwright can load `/_next` assets. |
| 2026-10-07 | Phase 9: `@react-pdf/renderer@4.9.0` for payslip PDF; `jszip@3.10.1` for payslip ZIP. |
| 2026-10-07 | Lock recalculates then freezes PayrollLine snapshots; unlock returns DRAFT (lines kept until next recalc). |
| 2026-10-07 | Employer EPF = rounded 12% of pfBase − rounded EPS (OQ-008); rates always from StatutoryConfig. |
| 2026-10-07 | Vitest `fileParallelism: false` — integration tests share one Postgres. |
| 2026-10-07 | Phase 10: shared in-memory rate limiter (`src/server/security/rate-limit.ts`) for claim/import/export/reveal; login keeps 5/15min. |
| 2026-10-07 | Phase 10: Docker Compose Postgres 16 on host port **5436**; GitHub Actions CI with Postgres service. |
| 2026-10-07 | Phase 10 e2e suite: auth RBAC + smoke + attendance (`pnpm test:e2e`). |
| 2026-10-10 | Visual system matches the ops-console reference: lime `#C8F13C` on charcoal, light theme via `data-theme` + `localStorage` `tc-theme`. Fonts: Bricolage Grotesque, Instrument Sans, JetBrains Mono (`next/font`, no new package). |
| 2026-10-10 | Product name is EVerified. Accent is `#12A56E` (white button text), taken from the EVerified site green. |
