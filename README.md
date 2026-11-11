# zuzo-dialer

Multitenant campaign-calling SaaS with a super-admin dashboard, extracted from
ZuZo's single-tenant insurance "outreach" feature and generalized for any
industry.

## Structure

```
apps/
  api/            NestJS + Drizzle + Postgres backend
  tenant-web/     Tenant dashboard (campaigns, contacts, DNC, credentials, team)
  platform-web/   Super-admin console (tenants, platform admins, stats)
packages/
  shared-types/   (placeholder for cross-app TS types)
```

One deploy: `apps/api` serves both frontends as static SPAs at `/app/` and
`/super-admin/` once built (see `npm run build:all`).

## Local setup

Requires Postgres. If you don't have Docker, install via Homebrew:

```
brew install postgresql@16
brew services start postgresql@16
createdb zuzo_dialer_dev
```

Or with Docker: `docker compose up -d` (uses `docker-compose.yml` at the repo root).

```
npm install
cp .env.example apps/api/.env   # fill DATABASE_URL, JWT_SECRET, CREDENTIALS_ENCRYPTION_KEY
cd apps/api
npm run db:migrate
npm run db:seed                 # creates a platform admin + demo "acme" tenant
cd ../..
npm run start:dev -w apps/api   # API on :3100
npm run dev -w apps/tenant-web  # tenant dashboard on :5174 (proxies /api to :3100)
npm run dev -w apps/platform-web  # super-admin console on :5175
```

Seeded logins (`npm run db:seed` in `apps/api`):
- Platform admin: `admin@zuzo-dialer.local` / `ChangeMe123!`
- Tenant admin (tenant "acme"): `owner@acme.test` / `ChangeMe123!`

## Testing

```
npm run test -w apps/api       # unit tests
npm run test:e2e -w apps/api   # e2e tests (needs DATABASE_URL)
```

`apps/api/test/tenant-isolation.e2e-spec.ts` is a standing regression test —
extend it whenever a new tenant-scoped table/endpoint is added.

## Telephony providers

Each tenant configures its own telephony credentials (Settings → Telephony in
the tenant dashboard): Stub (zero-config demo provider), Twilio, Africa's
Talking, or LiveHub. See `apps/api/src/modules/voice/adapters/` for the
adapter implementations and `voice-adapter-factory.service.ts` for how a
tenant's active credential becomes a live adapter instance.

## What's not done yet

- Real sandbox credentials for Twilio/AfricaTalking/LiveHub haven't been
  wired against a live tenant — the Stub provider is fully exercised, but the
  three real adapters haven't been tested against actual provider accounts.
- No webhook endpoint receives call-status callbacks from a real provider yet
  (adapters can parse them — `parseInbound`/`parseCallStatus` — but nothing
  calls them from an HTTP route).
- No deploy pipeline/hosting decision made.
- No audit log of admin actions.
- Billing, per-tenant subdomains, SSO, Postgres RLS: deliberately deferred —
  see the original plan for reasoning.
