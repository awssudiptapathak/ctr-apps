BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE public.app_role AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE public.event_status AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED');
CREATE TYPE public.nomination_status AS ENUM ('OPEN', 'PENDING', 'REJECTED', 'CANCELLED', 'APPROVED', 'WAITLISTED', 'SLOT_ALLOCATED', 'COMPLETED');
CREATE TYPE public.ticket_category AS ENUM ('EVENT', 'NOMINATION', 'TECHNICAL', 'GENERAL', 'OTHER');
CREATE TYPE public.ticket_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE public.ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  flat_no text,
  role public.app_role NOT NULL DEFAULT 'USER',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  password_hash text NOT NULL,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL CHECK (year BETWEEN 2024 AND 2100),
  title text NOT NULL,
  description text,
  venue text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status public.event_status NOT NULL DEFAULT 'DRAFT',
  publish_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT events_time_valid CHECK (start_at < end_at),
  CONSTRAINT events_year_title_unique UNIQUE (year, title)
);

CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  rules text,
  max_participants integer NOT NULL DEFAULT 1 CHECK (max_participants >= 1),
  nomination_open_at timestamptz,
  nomination_close_at timestamptz,
  status public.event_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT programs_window_check CHECK (
    nomination_open_at IS NULL OR nomination_close_at IS NULL OR nomination_open_at < nomination_close_at
  )
);

CREATE TABLE public.program_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  min_age integer,
  max_age integer,
  category text,
  custom_rule text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT program_eligibility_age_range CHECK (
    min_age IS NULL OR max_age IS NULL OR min_age <= max_age
  )
);

CREATE TABLE public.nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_name text NOT NULL,
  status public.nomination_status NOT NULL DEFAULT 'PENDING',
  reason text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX nominations_active_unique
ON public.nominations (user_id, program_id)
WHERE status IN ('PENDING', 'APPROVED', 'WAITLISTED', 'SLOT_ALLOCATED', 'COMPLETED');

CREATE TABLE public.time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  nomination_id uuid NOT NULL UNIQUE REFERENCES public.nominations(id) ON DELETE RESTRICT,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  venue text NOT NULL,
  status text NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'CONFIRMED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT time_slots_time_valid CHECK (start_at < end_at),
  EXCLUDE USING gist (
    program_id WITH =,
    venue WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
);

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  title text NOT NULL,
  subtitle text,
  body text NOT NULL,
  venue text,
  cta text,
  leaflet_path text,
  publish_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz,
  status public.event_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT announcements_publish_valid CHECK (publish_at < COALESCE(expires_at, 'infinity'))
);

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  video_path text,
  thumbnail_path text,
  duration_seconds integer,
  published_at timestamptz,
  expires_at timestamptz,
  status public.event_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT campaigns_duration_positive CHECK (duration_seconds IS NULL OR duration_seconds > 0)
);

CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  nomination_id uuid NOT NULL REFERENCES public.nominations(id) ON DELETE CASCADE,
  position integer,
  score numeric(5,2),
  remarks text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT results_position_positive CHECK (position IS NULL OR position > 0)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios')),
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, expo_push_token)
);

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category public.ticket_category NOT NULL DEFAULT 'GENERAL',
  priority public.ticket_priority NOT NULL DEFAULT 'NORMAL',
  subject text NOT NULL,
  description text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'OPEN',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  resolved_at timestamptz
);

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mock',
  announcement_id uuid REFERENCES public.announcements(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING')),
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key)
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value_json jsonb,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER programs_set_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER program_eligibility_set_updated_at BEFORE UPDATE ON public.program_eligibility FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER nominations_set_updated_at BEFORE UPDATE ON public.nominations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER time_slots_set_updated_at BEFORE UPDATE ON public.time_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER announcements_set_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER campaigns_set_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER results_set_updated_at BEFORE UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER notifications_set_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER device_tokens_set_updated_at BEFORE UPDATE ON public.device_tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tickets_set_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ticket_messages_set_updated_at BEFORE UPDATE ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER media_assets_set_updated_at BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER whatsapp_messages_set_updated_at BEFORE UPDATE ON public.whatsapp_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER app_settings_set_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
