# EVerified — Product

## One paragraph

A company (a "LinkedIn for technicians and EV technicians", blue-collar workforce) owns a large list of technician leads (phone numbers). Telecallers (employees) must call them, but **must never be able to see or copy the whole list**. The admin (CEO/ops) imports an Excel file. Each telecaller is served **exactly one lead at a time** ("a case"). She calls, writes remarks, gives a 0–5 interest rating, optionally records friends' numbers the lead referred, closes the case, and only then can start the next. Admin sees performance dashboards (simple + Power BI-style analytics). Separately, the same app has a **Payroll module for contract technicians** the company supplies to clients: employee master (Zoho/Frappe-HRMS style), a month attendance grid with Ctrl+click and right-click marking, holidays, and automatic salary calculation including **PF and ESIC**.

## Two modules

| Module | Purpose |
|---|---|
| **A — Recruitment CRM** | Lead pool → one-at-a-time case claiming → call outcomes, ratings, referrals → joined tracking → admin dashboards & analytics |
| **B — Contract Payroll** | Contract employee master, clients, attendance grid, holidays, statutory config, payroll runs, payslips (PF/ESIC) |

## Roles

| Role | Who | Can do |
|---|---|---|
| `ADMIN` | CEO / ops | Everything: import leads, manage users, all dashboards, payroll module, settings, audit log |
| `EMPLOYEE` | Telecaller | Only: start next case, work the active case, see **her own** completed cases, toggle "Joined" on her own completed cases, change own password |

Employees can never access `/admin/**`, any list/export of unassigned leads, other employees' cases, or payroll. Enforce in middleware **and** again in every server function.

## Out of scope (v1)

- Public self-sign-up
- Client billing / invoicing
- Professional Tax, TDS, gratuity, Bonus Act, leave encashment (extension points only; do not build)
- ESIC contribution-period "stays covered until period end" nuance
- Dark mode as a separate product feature (the console ships dark + light from the visual reference; preference is local only)
- Employee bulk lead list / export / CSV download
- Mobile native apps (responsive web only)
- Multi-tenant / multi-company

## Non-negotiable product rules

1. One OPEN case per employee; one OPEN case per lead.
2. Claim uses `SELECT … FOR UPDATE SKIP LOCKED` in a single transaction.
3. Money always integer paise; phones always normalised 10-digit Indian mobiles.
4. No fake UI for unbuilt features — if a phase has not shipped it, it must not appear.
5. Identity (`userId`, `role`) always from server session, never from request bodies.
