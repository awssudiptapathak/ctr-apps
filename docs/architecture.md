# CTR-CMS architecture

Monorepo for the Clubtown Residency Cultural Committee Management System. Mobile + admin apps talk to a plain-PostgreSQL backend through a custom Express REST API. Supabase was dropped because Docker cannot run on this machine.

## Monorepo structure

- `apps/mobile`: Expo resident app (talks to API over HTTP via `src/api.ts`)
- `apps/admin`: Next.js admin portal (talks to API via `lib/api.ts`)
- `apps/server`: Express REST API backed by PostgreSQL (`pg`, JWT auth, bcrypt)
- `packages/shared`: domain constants, types, utilities, and a shared fetch client
- `supabase/migrations`: PostgreSQL schema (the plain-PG `000_custom_auth_pg.sql` is the live one)
- `supabase/seed.sql`: sample data
- `supabase/tests`: security and validation scripts

## Data flow

- Clients never connect to PostgreSQL directly; they use the REST API at `apps/server` (port 4200).
- Auth uses JWT (issued on login/register) carried in `Authorization: Bearer <token>`.
- Passwords are hashed with bcrypt and stored in `profiles.password_hash`.

## Security defaults

- API routes are protected by `requireAuth`/`requireRole` middleware.
- Role checks happen server-side; clients never hold DB credentials.
- The database schema enables sensible `CHECK` constraints and uniqueness; RLS from the Supabase-era migration is not applicable to this plain-PostgreSQL setup and must be enforced in the API layer.
- The database is the source of truth; the API applies authorization.

## Core roles

- `USER`
- `ADMIN`
- `SUPER_ADMIN`

## Getting started

1. Ensure PostgreSQL 17 is running (Windows service `postgresql-x64-17` on :5432).
2. Apply schema: `npm run db:init` (table `ctrcms`, user `ctrcms`).
3. Seed: `npm run db:seed`.
4. Start API: `npm run server` (http://localhost:4200).
5. Admin: `npm run dev`. Mobile: `npm run mobile`.

## Important notes

- Do not commit `.env` or any credentials.
- `JWT_SECRET` must be set in production.
- Keep the original Supabase migration (`001_init_schema.sql`) only as historical reference; `000_custom_auth_pg.sql` is authoritative.
