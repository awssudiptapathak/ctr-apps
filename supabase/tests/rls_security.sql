-- Phase 1 RLS test harness for CTR-CMS
--
-- These checks are intended to be run in a Supabase local/dev database after
-- the initial migration has been applied.
--
-- Positive checks:
-- 1. Authenticated residents can read their own profile and public event listings.
-- 2. Resident users can insert their own nominations and device tokens.
-- 3. Admins can read operational tables such as audit_logs and tickets.
--
-- Negative checks:
-- 1. Anonymous users cannot read profiles or private resident records.
-- 2. A resident cannot read another resident's ticket or notification ledger.
-- 3. Non-admin users cannot mutate admin-only tables such as app_settings.

-- Example positive check: resident can view own profile.
SELECT *
FROM public.profiles
WHERE auth_user_id = auth.uid();

-- Example positive check: published events are visible to residents.
SELECT *
FROM public.events
WHERE status IN ('PUBLISHED', 'ACTIVE', 'COMPLETED');

-- Example negative check: unauthenticated callers must not read resident tables.
-- Expected result: zero rows returned when auth.uid() is null.
SELECT *
FROM public.profiles
WHERE auth.uid() IS NULL;

-- Example negative check: a resident cannot read a different resident's ticket.
SELECT *
FROM public.tickets t
WHERE t.user_id <> (
  SELECT p.id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
);

-- Example negative check: user cannot mutate app_settings.
SELECT *
FROM public.app_settings;

-- Suggested local test flow:
-- 1. Create resident and admin profiles.
-- 2. Sign in as resident and assert SELECT/INSERT on own rows works.
-- 3. Sign in as another resident and assert access to other user's data is blocked.
-- 4. Sign in as admin and assert audit_logs and operational writes succeed.
-- 5. Verify anonymous requests fail by using a session with no auth.uid().
