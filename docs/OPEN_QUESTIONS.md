# Open Questions

Anything ambiguous. Prefer the most conservative default until answered. Never silently invent business rules or statutory rates.

| ID | Question | Conservative default (v1) | Status |
|---|---|---|---|
| OQ-001 | ESIC contribution-period rule ("stays covered until period end" even if wages rise above ceiling mid-period) | Do not implement; applicability checked per month against full monthly gross only | Open |
| OQ-002 | Exact `HOLIDAY_WORKED` pay multiplier / compensatory off | Store status if marked; pay treatment TBD — treat as Present for payable days until clarified | Open |
| OQ-003 | Overtime pay: rate formula vs flat adjustment | Use `PayrollAdjustment` type `OVERTIME_PAY` (flat paise); flag OT for ESIC wage inclusion via settings when built | Open |
| OQ-004 | `poolOrder` AppSetting values beyond priority/createdAt | Ignore until specified; claim order = `priority DESC, createdAt ASC` | Open |
| OQ-005 | Prefer "lead she has not attempted before" — how if multiple eligible? | **Resolved Phase 3:** first `SKIP LOCKED` query excludes leads with any prior Case for this employee; if none, second query takes any eligible | Resolved |
| OQ-017 | Referral experienceText → Lead.experienceYears | Parse leading number; leave null if unparseable. Designation → trade | Resolved |
| OQ-018 | `/app/completed` in Phase 3? | Deferred to Phase 4; home shows recent 5 only | Resolved |
| OQ-006 | Field encryption key rotation | Single `FIELD_ENCRYPTION_KEY`; no rotation in v1 | Open |
| OQ-007 | Auth password hasher: argon2id vs bcrypt | **Resolved Phase 1:** bcryptjs cost 12 (argon2 native module segfaulted on install/rebuild here) | Resolved |
| OQ-011 | Login rate-limit store across serverless instances | In-memory Map per instance for Phase 1; move to Redis/KV before multi-instance prod | Open |
| OQ-012 | Adopt Next.js Cache Components with Auth.js | Left disabled in Phase 1; enable with Suspense session boundaries in hardening if needed | Open |
| OQ-013 | Seed payroll: full Aug attendance + locked PayrollLines vs shell run only | Phase 1 seeds Aug LOCKED + Sep DRAFT runs and sample Sep marks; full attendance grids/lines in Phases 8–9 | Open |
| OQ-014 | Import staging across multi-instance deploys | Client re-sends file each step; OK for ≤4 MB. If we need resume-after-crash, add `ImportUpload` staging table later | Open |
| OQ-015 | Lead list “Last rating” source | Most recent case with non-null rating (by `closedAt` desc). Cases without rating ignored | Resolved (Phase 2) |
| OQ-016 | Admin Joined toggle in Phase 2 vs Phase 4 | Spec §6.3 includes Joined on admin leads; implemented in Phase 2 with audit. Employee completed-list Joined remains Phase 4 | Resolved |
| OQ-019 | Completed drawer: Dialog vs true side sheet | Used centred Dialog (Radix) for Phase 4; side sheet optional later if UX requires | Assumed |
| OQ-020 | Telecaller performance window | Last 30 calendar days (IST day keys) for chart + KPIs; case table capped at 50 most recent | Assumed |
| OQ-021 | Audit log page size | 50 rows/page (dense admin table); actions list distinct up to 200 | Assumed |
| OQ-022 | Deactivated telecaller with OPEN case | Deactivate blocks login via Auth.js `isActive`; open case left until Phase 5 Release | Assumed |
| OQ-023 | Dashboard period options | `today` / `7d` / `30d` (IST day bounds); default 30d to match seed “~140 / 30d” | Assumed |
| OQ-024 | Release sets `closedAt`? | Yes — timestamp when released; outcome/rating stay null | Assumed |
| OQ-025 | Live activity refresh | Client `router.refresh()` every 30s + manual Refresh; no SSE/websocket in v1 | Assumed |
| OQ-026 | Dashboard KPIs set | Closed, connected rate, avg rating, referrals, joined for selected period | Assumed |
| OQ-027 | Analytics default date range | Last 30 IST calendar days when `from`/`to` omitted | Assumed |
| OQ-028 | Analytics “Joined” KPI | Count of leads with `joinedAt` in range (optional `joinedMarkedById` when telecaller filtered); series = joined among closed cases by closed day | Assumed |
| OQ-029 | Cross-filter dimensions | outcome, rating, employeeId, hour (IST), dow (IST Sun=0); city/trade via filter bar only | Assumed |
| OQ-030 | Drill from time chart | Click day sets `from=to=that day` and `tab=data` | Assumed |
| OQ-031 | Analytics export format | CSV only (not xlsx) for Phase 6; same 10k row cap as lead export | Assumed |
| OQ-032 | Employee Excel import wizard in Phase 7? | Deferred — UI_SPEC lists it; Phase 7 acceptance is salary history + encrypt/mask. Add in hardening or a follow-up | Assumed |
| OQ-033 | Profile tabs Attendance / Payslips | Phase 8: Attendance tab links to month grid; Payslips still Phase 9 | Assumed |
| OQ-036 | Default attendance month when URL omits `month` | Demo default `2026-09` (seed DRAFT); switch to IST current month when leaving demo seed | Assumed |
| OQ-037 | Lock without treating unmarked as absent | Refuse lock while unmarked working days remain (FLOWS §8.3) | Assumed |
| OQ-038 | Excel import blank cell = no-op vs clear | Blank/missing cells skipped (no change); explicit clear only via Clear action / empty after a mapped clear row | Assumed |
| OQ-039 | OVERTIME_PAY in ESIC wages? | Include OT adjustment in ESIC wage base (PAYROLL_RULES mentions OT if flagged) | Assumed |
| OQ-040 | Unlock deletes PayrollLines? | Keep lines; DRAFT can Recalculate to replace; locked lines immutable while LOCKED | Assumed |
| OQ-041 | WORKING_DAYS divisor holiday count | Global holidays in month (not per-employee OUT_OF_RANGE filtered) | Assumed |
| OQ-042 | Payslip company legal name / logo | Hardcoded “EVerified” on PDF until branding settings exist | Assumed |
| OQ-043 | CI runs Playwright e2e? | Phase 10 CI = typecheck/lint/vitest only; e2e local/`pnpm test:e2e` (needs longer Next boot) | Assumed |
| OQ-044 | WCAG full audit tooling | Manual landmarks/skip-link/aria-current in Phase 10; axe CI optional later | Assumed |
| OQ-034 | Default salary component split when adding structure | 50% Basic / 25% HRA / rest Special (matches seed); editable split UI later | Assumed |
| OQ-035 | Document storage without Blob token | Local `.data/uploads` for dev/demo; production should set `BLOB_READ_WRITE_TOKEN` | Assumed |
| OQ-008 | Employer PF "total 12% − EPS" when EPS rounds differently than 12% part | Match worked example: employee PF and employer 12% base use same round-half-up on pfBase; EPS on min(pfWage, ceiling); EPF = that 12% − EPS | Open |
| OQ-009 | Designation combobox: closed list vs free text | Free text allowed; suggestions as listed in UI_SPEC | Resolved (spec) |
| OQ-010 | Timezone for "today" case counts and daily cap | `Asia/Kolkata` calendar day | Resolved (spec) |
| OQ-045 | Excel salary / CTC columns (current, expected, confirmed) | Store the sheet text on the lead. Do not convert to paise and do not treat sheet "Status" or "Joined" as `Lead.status` / `joined` | Assumed |
| OQ-046 | ECR challan wage rupees, NCP days, EPS membership, refund | Wages and contributions are half-up to whole rupees. EPF wages never exceed gross. EPS and EDLI wages are EPF wages capped at the PF ceiling. Every PF member is treated as an EPS member. NCP is the days in the month when EPF wages are 0, otherwise days in the month minus payable days, half-up to an integer. Refund of advances is 0. | Assumed |
