# UI Spec

Overall feel: charged ops console. EVerified green accent on charcoal (dark default) with a paper light theme. Display type for titles, mono for numbers, phones, and kickers. Admin is a top bar (logo, Recruitment/Payroll switch, search, theme, user) plus a 248px rail. Employee is a calling desk: Desk / History, one case at a time.

Dark is the default. Light is toggled from the sun/moon control and stored in `localStorage` key `tc-theme`.

## Design tokens

Put in `globals.css` as CSS variables; map in Tailwind. **No hardcoded hex in components.** Dark values below; light overrides live on `[data-theme="light"]`.

| Token | Dark value | Use |
|---|---|---|
| `--bg` | `#0A0C0B` | App background |
| `--surface` | `#262E2A` | Cards, panels (lifted off `--bg` so they read as separate) |
| `--surface-2` | `#323C36` | Nested fills, active nav |
| `--border` | `#46554D` | Hairline borders |
| `--border-strong` | `#5A6C62` | Inputs, inactive chips |
| `--text` | `#ECF0E6` | Primary text |
| `--muted` | `#8C968A` | Secondary text |
| `--primary` | `#12A56E` | Buttons, active segment, accent. White label text. |
| `--primary-fg` | `#FFFFFF` | Text on primary |
| `--primary-hover` | `#18B87C` | |
| `--primary-soft` | green at 18% | Soft chips |
| `--success` | `#5BE3A4` | Positive |
| `--warning` | `#FFB224` | Pool low, caution |
| `--danger` | `#FF6A55` | Errors, release |
| `--info` | `#6CB8FF` | Active case, info |

### Rating colour scale

`0 #E11D48`, `1 #F97316`, `2 #F59E0B`, `3 #84CC16`, `4 #22C55E`, `5 #059669`.

### Attendance status colours (soft bg / strong text)

| Status | Soft / Strong |
|---|---|
| Present | `#D1FAE5` / `#047857` |
| Half day | `#FEF3C7` / `#B45309` |
| Absent | `#FFE4E6` / `#BE123C` |
| Paid leave | `#E0F2FE` / `#0369A1` |
| Weekly off | `#F1F5F9` / `#475569` |
| Holiday | `#EDE9FE` / `#6D28D9` |
| Weekend column bg | `#EFF6FF` |

Cell codes: `P`, `½`, `A`, `PL`, `WO`, `H`. Empty = unmarked.

## Typography, spacing, shape

- Fonts via `next/font`: **Bricolage Grotesque** (display titles), **Instrument Sans** (UI), **JetBrains Mono** (numbers, phones, kickers, table headers).
- Sizes: page title 24/32 semibold, section title 16/24 semibold, body 14/20, table 13/18, caption 12/16.
- Radius: cards `12px`, inputs/buttons `8px`, chips full.
- Shadow only `0 1px 2px rgba(15,23,42,.06)` on cards. Borders do the heavy lifting.
- Spacing: 4/8/12/16/24/32. Page padding 24 (admin), 16 (employee mobile).

## Layouts

### Admin shell

- Left rail 240px (collapsible to 72px icon-only).
- Logo top; nav in two groups:
  - **Recruitment CRM**: Dashboard, Analytics, Leads, Import, Telecallers, Audit log
  - **Payroll**: Employees, Attendance, Holidays, Payroll runs, Clients, Statutory settings
  - Settings at bottom
- Top bar: page title + subtitle left; global filters/actions right; user menu.
- Active nav: `primary-soft` bg + primary text + 3px left accent.
- Desktop-first; must not break at 1024px.

### Employee shell

- No sidebar. Slim top bar (logo, name, "Today: N cases", avatar menu).
- Max content width 960px, centred.
- Bottom-fixed action bar on mobile.
- Mobile-first. Min touch target 44px.

## Shared component behaviour

- Buttons: primary (filled indigo), secondary (white + border), ghost, destructive. Loading = spinner + disabled.
- Tables: sticky header, no zebra, row hover `surface-2`, 40px row height (admin), sortable headers, column visibility, pagination footer ("1–25 of 312").
- Chips/badges: rounded-full, soft bg + strong text.
- Toasts: bottom-right (desktop), top (mobile). Destructive actions need confirm naming the item.
- Empty states: 48px muted icon, one-line headline, one-line help, primary action.
- Forms: label above, helper below, inline error in danger, focus first invalid on submit.
- Every data view: loading skeleton, empty state, error state with retry.
- Every interactive element: hover, focus-visible, disabled.

---

## Page specs — Auth & Employee

### `/login`

Centred card on `bg`, logo, "Sign in", email + password (show/hide), primary button, generic error "Invalid email or password". Rate-limit: 5 failures / 15 min per email+IP. First login with `mustChangePassword` → `/app/profile?force=1`. Admin → `/admin/dashboard`, employee → `/app`.

### `/app` (Home)

KPI row: Closed today, Avg rating, Referrals added, Joined this month. Big **Start next case** / **Resume case**. Daily progress bar `N / dailyCaseCap`. Recent 5 closed cases. Cap/pool empty → button disabled with explanation.

### `/app/case`

Desktop: two columns (40% lead card / 60% outcome form). Mobile: stacked + sticky bottom **Close case**.

- Phone large tabular with spaces; `tel:` Call button sets `callClickedAt` once; no copy; `user-select: none`.
- Live timer since `startedAt`.
- Outcome chips single-select. Connected requires rating and remarks. Reconnect (`CALL_BACK_LATER`) requires remarks, which are shown the next time that lead is opened. Other outcomes: remarks optional.
- Rating: six large buttons (min 56px); captions: `0–1 Not interested…`, `2 Maybe later`, `3 Interested`, `4 Keen to join`, `5 Will join and bring friends`. Keys `0`–`5` on desktop.
- Friends rows optional; designation suggestions listed in PRODUCT flows.
- City (editable text, prefilled), location (free text), and technician (Petrol bike technician or EV bike technician, blank allowed) sit on the lead card. They are saved on that lead when the case closes, and ride along in the case draft. Clearing city or location stores null. They are not required to close.
- Draft autosave to `localStorage` by case id every 2s.
- Close → confirm sheet → success screen (no auto-claim).
- No OPEN case → redirect `/app`.

### `/app/completed`

Table (cards on mobile): datetime, name, outcome, rating, friends count, Joined toggle, remarks preview. Phone numbers are not on the list. Opening one row loads that lead's number and remark. Reconnect rows have **Open**, which starts that lead again on the case desk so she can call and close the case. Earlier remarks stay visible. Filters + search within own cases only. Paginate 25. **No export**.

### `/app/profile`

Name/email read-only; change password (min 10, one number). Forced mode banner; hide nav.

---

## Page specs — Admin CRM

### `/admin/leads/import`

Stepper: Upload → Map → Review → Done + Import history with Revert. A workbook of stacked city tables adds a Cities step (multi-select, all on by default) between Map and Review.

### `/admin/leads`

Table + URL filters; row → `/admin/leads/[id]` (timeline, referrals, Joined). Admin CSV export (audit-logged).

### `/admin/employees`

Telecaller table; add dialog (temp password + copy); reset/deactivate; row → performance page.

### `/admin/dashboard`

Alerts strip; KPI cards with period toggle; cases chart + live activity (stale + Release); telecaller table with data bars.

### `/admin/analytics`

Power BI-style: sticky filter bar (nuqs URL state), cross-filtering, tabs Overview / Telecallers / Referrals & Joined / Time patterns / Data. Each visual: title, subtitle, ⋯ menu, skeleton + empty.

---

## Page specs — Payroll

### `/admin/payroll/employees`

Master table; add + Excel import wizard; profile tabs: Overview, Statutory & Bank, Salary structure, Attendance, Payslips, Documents, Activity.

### `/admin/payroll/clients`

Simple CRUD.

### `/admin/payroll/attendance`

OpenProject-style grid: sticky name + TOTAL columns, weekend shading, month toolbar, legend, save indicator. Interactions: click, Shift+click range, drag rectangle, Ctrl/Cmd+click Present, right-click context menus (cell/column/row), hotkeys P/H/A/L/W/Delete, Ctrl+Z undo. Optimistic batched writes. Locked banner + Unlock. Holidays drawer. Excel import with diff dialog. Salary drawer from name click.

### `/admin/payroll/holidays`

Year list CRUD.

### `/admin/payroll/runs`

Month list; detail table; Recalculate; exports (register, PF summary, ECR challan `.txt`, ESIC summary); payslip zip; Lock. The ECR file is the EPFO upload for that wage month. PF-applicable employees with a missing or non-12-digit UAN are named on the run page and left out of the file.

### `/admin/payroll/settings`

StatutoryConfig form + history; verification note for CA/EPFO/ESIC.
