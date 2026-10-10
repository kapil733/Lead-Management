# Security and Privacy

Source: master prompt Part 10. Enforce in middleware **and** every server action / route handler.

## Authentication

- Passwords: argon2id (or bcrypt cost ≥ 12). Min length 10.
- Auth.js (next-auth v5) Credentials provider, JWT session.
- Admin creates users; no public sign-up.
- Login rate limit: 5 failures per 15 min per email+IP.
- Session cookie: `httpOnly`, `secure`, `sameSite=lax`.
- Deactivated users rejected on every request (`isActive` in session callback).
- `mustChangePassword` forces `/app/profile?force=1`.

## Authorisation

- Middleware for route groups: employees blocked from `/admin/**`.
- `requireRole()` at the top of every server action and route handler.
- Identity (`userId`, `role`) always from server session — never from request bodies.
- Integration tests: EMPLOYEE gets 403 on every admin function.

## Lead protection

- One lead at a time; no bulk lead list for EMPLOYEE.
- No export/download/CSV for EMPLOYEE anywhere.
- Daily case cap.
- Claim: single transaction with `SELECT … FOR UPDATE SKIP LOCKED`.
- Partial unique indexes: one OPEN case per employee; one OPEN case per lead.
- Full audit trail on claim, close, release, joined-toggle.
- Do not log full phone numbers to console or error trackers.
- UI: no copy button; `user-select: none` on phone (cosmetic only — real protection is server-side).

## Sensitive payroll data

- Aadhaar, PAN, bank account: AES-256-GCM with `FIELD_ENCRYPTION_KEY` (32 bytes base64 from env).
- Store masked last digits separately for display.
- "Reveal" is admin-only and audit-logged.

## Uploads

- Validate MIME + size (≤ 5 MB for documents; lead import ≤ 4 MB / 20,000 rows).
- Private Blob paths; signed access.
- Vercel serverless body limit ~4.5 MB — reject oversized imports with a clear message.

## Headers & env

- Security headers via `next.config` (CSP, X-Frame-Options, Referrer-Policy).
- Env validated at boot with zod (`src/env.ts`).
- No secrets in client bundles.

## Dependency hygiene

- Pin versions.
- `pnpm audit` in CI.
