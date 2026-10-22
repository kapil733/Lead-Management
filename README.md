# EVerified

Internal **Lead CRM** + **contract payroll** for a technician workforce platform.

Product rules, phases, and agent conventions live in `AGENTS.md` and `/docs`.

## Prerequisites

- Node.js **20+**
- **pnpm** 10+ (`corepack enable && corepack prepare pnpm@10.28.1 --activate`)
- PostgreSQL **16** (local Docker or Neon)

## Quick start (local)

```bash
# 1) Database
docker compose up -d

# 2) Env
cp .env.example .env
# Defaults for compose:
# DATABASE_URL="postgresql://techconnect:techconnect@localhost:5436/techconnect?schema=public"
# AUTH_SECRET="$(openssl rand -base64 32)"
# FIELD_ENCRYPTION_KEY="$(openssl rand -base64 32)"   # must decode to 32 bytes
# AUTH_URL="http://localhost:3010"
# SEED_DEMO="true"

# 3) App
pnpm install
pnpm db:migrate
SEED_DEMO=true pnpm db:seed
pnpm dev
```

Open [http://localhost:3010](http://localhost:3010).

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.test` | `Admin@12345` |
| Telecaller | `priya@demo.test` | `Caller@12345` |
| Telecaller | `rahul@demo.test` | `Caller@12345` |
| Telecaller | `neha@demo.test` | `Caller@12345` |
| Telecaller | `amit@demo.test` | `Caller@12345` |
| Telecaller | `sana@demo.test` | `Caller@12345` |

Seed also creates ~400 leads, sample closed cases, 2 payroll clients, 14 contract employees, holidays, and Aug (LOCKED) / Sep (DRAFT) payroll runs.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server (port **3010**) |
| `pnpm build` / `pnpm start` | Production build + serve |
| `pnpm typecheck` | TypeScript |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit + integration |
| `pnpm test:e2e` | Playwright end-to-end |
| `pnpm db:migrate` | Prisma migrate (dev) |
| `pnpm db:seed` | Idempotent seed (`SEED_DEMO=true`) |
| `pnpm db:reset` | Reset DB + migrate + seed |

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | yes | Auth.js JWT secret (≥16 chars) |
| `AUTH_URL` | recommended | Public origin, e.g. `https://ops.example.com` |
| `FIELD_ENCRYPTION_KEY` | yes | 32-byte key, **base64** (Aadhaar/PAN/bank) |
| `BLOB_READ_WRITE_TOKEN` | no | Vercel Blob; if unset, docs store under `.data/uploads` |
| `SEED_DEMO` | no | `true` to enable demo seed content |

Validated at boot in `src/env.ts`.

## Deploy (Vercel + Neon)

1. **Neon** — create a Postgres 16 project; copy the pooled `DATABASE_URL`.
2. **Vercel** — Import this repo; Framework Preset = Next.js; install command `pnpm install`; build `pnpm build`.
3. **Env** on Vercel (Production + Preview as needed):
   - `DATABASE_URL`
   - `AUTH_SECRET` (unique per environment)
   - `AUTH_URL` = your Vercel URL (or custom domain)
   - `FIELD_ENCRYPTION_KEY` (generate once; rotating re-encrypts KYC — plan carefully)
   - Optional: `BLOB_READ_WRITE_TOKEN` for payroll document storage
4. **Migrations** — the Vercel build runs `prisma migrate deploy` before `next build`. For a database that is not the Vercel `DATABASE_URL`, apply the same command yourself:

   ```bash
   DATABASE_URL="…" pnpm exec prisma migrate deploy
   SEED_DEMO=true DATABASE_URL="…" pnpm db:seed   # demo only; skip in real prod
   ```

5. **Security checklist**
   - Do not enable public sign-up (none exists).
   - Keep `SEED_DEMO` off in production.
   - Confirm CSP / frame headers from `next.config.ts` after first load.
   - Login is rate-limited (5 failures / 15 min per email+IP). Claim, import commit, export, and KYC reveal are also rate-limited in-memory (single-instance; see `docs/OPEN_QUESTIONS.md` OQ-011 for Redis).

Serverless note: Vercel body limit ~4.5 MB — lead import rejects oversized files with a clear error.

## Deploy (your own AWS server)

The app is plain Postgres plus Next.js. `scripts/deploy-aws.sh` copies this repo to an EC2 instance over SSH, installs Node 20, can install Postgres on that same machine, runs migrations, and starts the site on port 80.

```bash
cp .env.aws.example .env.aws
# fill DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY
set -a && source .env.aws && set +a
./scripts/deploy-aws.sh
```

The SSH user needs passwordless sudo. Open ports 22 and 80 in the instance security group. `.env.aws` is gitignored. Leave `DATABASE_URL` empty to create a database on that server. Set it if Postgres already lives somewhere else.

## Testing

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test:e2e    # starts Next on :3010; needs seeded DB
```

CI (GitHub Actions) runs migrate → seed → typecheck → lint → test against a Postgres service. See `.github/workflows/ci.yml`.

## Accessibility & errors

- Skip link + `#main-content` landmarks on admin/employee shells
- Route `error.tsx` / `global-error.tsx` / `not-found.tsx` with retry
- Login errors use `role="alert"`; nav uses `aria-current="page"`

## Docs map

| Doc | Contents |
|---|---|
| `docs/PRODUCT.md` | Scope, roles |
| `docs/TASKS.md` | Phase checklist |
| `docs/DATA_MODEL.md` | Schema |
| `docs/PAYROLL_RULES.md` | PF/ESIC formulas |
| `docs/SECURITY.md` | Auth, RBAC, encryption |
| `docs/DECISIONS.md` | ADR log |

## Phase status

All product phases **0–10** are complete. See `docs/TASKS.md` for the checklist and notes.
