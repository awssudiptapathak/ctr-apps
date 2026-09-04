# CTR-CMS

Clubtown Residency Cultural Committee Management System.

## Phase 1 status

This repository now includes the baseline monorepo and core Phase 1 foundation:

- Expo React Native mobile app shell in `apps/mobile`
- Next.js admin shell in `apps/admin`
- Shared TypeScript definitions in `packages/shared`
- Initial PostgreSQL schema in `supabase/migrations/001_init_schema.sql`
- RLS security guidance and test templates in `supabase/tests/rls_security.sql`
- Environment template in `.env.example`

## Architecture summary

- Resident mobile app: React Native + Expo + TypeScript
- Admin console: Next.js + TypeScript
- Backend: Supabase Postgres + Auth + Storage + Edge Functions
- Security: PostgreSQL RLS with application roles
- Timezone: Asia/Kolkata business timezone, UTC storage where needed

## Core roles

- `USER`
- `ADMIN`
- `SUPER_ADMIN`

## Included Phase 1 schema

The initial migration creates the foundation tables required by the product specification:

- `profiles`
- `events`
- `programs`
- `program_eligibility`
- `nominations`
- `time_slots`
- `announcements`
- `campaigns`
- `results`
- `notifications`
- `device_tokens`
- `tickets`
- `ticket_messages`
- `media_assets`
- `whatsapp_messages`
- `audit_logs`
- `app_settings`

## RLS and security

- Row Level Security is enabled on all exposed application tables.
- Resident users can read public content and manage their own records.
- Admins can manage operational tables.
- Super admins can manage system settings.
- Auth user profile creation is scaffolded through a trigger on `auth.users`.

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the admin web app:
   ```bash
   npm run dev
   ```
3. Start the mobile app:
   ```bash
   npm run mobile
   ```
4. Build an Android APK for the Expo mobile app:
   ```bash
   npm run mobile:apk
   ```
   This uses the Expo EAS preview profile configured in `apps/mobile/eas.json` and produces a signed Android APK build.
5. Apply the Supabase migration locally or in a Supabase project:
   ```bash
   supabase db push
   ```

## Important notes

- Do not commit `.env` or any credentials.
- Keep service-role keys server-side; never expose them to mobile or browser clients.
- Follow the Phase 2+ spec rollout plan and continue with events/programs and resident workflows next.
