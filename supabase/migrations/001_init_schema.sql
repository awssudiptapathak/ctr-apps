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

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1),
    'USER'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'SUPER_ADMIN'
  );
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  flat_no text,
  role public.app_role NOT NULL DEFAULT 'USER',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
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

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER events_set_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER programs_set_updated_at
BEFORE UPDATE ON public.programs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER program_eligibility_set_updated_at
BEFORE UPDATE ON public.program_eligibility
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER nominations_set_updated_at
BEFORE UPDATE ON public.nominations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER time_slots_set_updated_at
BEFORE UPDATE ON public.time_slots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER announcements_set_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER campaigns_set_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER results_set_updated_at
BEFORE UPDATE ON public.results
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER notifications_set_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER device_tokens_set_updated_at
BEFORE UPDATE ON public.device_tokens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tickets_set_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER ticket_messages_set_updated_at
BEFORE UPDATE ON public.ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER media_assets_set_updated_at
BEFORE UPDATE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER whatsapp_messages_set_updated_at
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_settings_set_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    auth_user_id,
    full_name,
    phone,
    email,
    flat_no,
    role,
    status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Resident'),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'flat_no',
    'USER',
    'ACTIVE'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles self-select or admin-read"
ON public.profiles
FOR SELECT
USING (auth.uid() = auth_user_id OR public.is_admin());

CREATE POLICY "Profiles self-insert"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = auth_user_id AND role = 'USER');

CREATE POLICY "Profiles self-update or admin-update"
ON public.profiles
FOR UPDATE
USING (auth.uid() = auth_user_id OR public.is_admin())
WITH CHECK (
  (auth.uid() = auth_user_id AND NEW.role = OLD.role AND NEW.status = OLD.status)
  OR public.is_admin()
);

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.is_admin());

CREATE POLICY "Published events readable by users"
ON public.events
FOR SELECT
USING (status IN ('PUBLISHED', 'ACTIVE', 'COMPLETED') OR public.is_admin());

CREATE POLICY "Admins manage events"
ON public.events
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins update events"
ON public.events
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete events"
ON public.events
FOR DELETE
USING (public.is_admin());

CREATE POLICY "Published programs readable by users"
ON public.programs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = programs.event_id
      AND e.status IN ('PUBLISHED', 'ACTIVE', 'COMPLETED')
  )
  OR public.is_admin()
);

CREATE POLICY "Admins manage programs"
ON public.programs
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Published eligibility readable by users"
ON public.program_eligibility
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.programs p
    JOIN public.events e ON e.id = p.event_id
    WHERE p.id = program_eligibility.program_id
      AND e.status IN ('PUBLISHED', 'ACTIVE', 'COMPLETED')
  )
  OR public.is_admin()
);

CREATE POLICY "Admins manage eligibility"
ON public.program_eligibility
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Residents manage own nominations"
ON public.nominations
FOR SELECT
USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Residents insert own nominations"
ON public.nominations
FOR INSERT
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  AND participant_name <> ''
  AND status IN ('PENDING', 'APPROVED', 'WAITLISTED', 'CANCELLED')
);

CREATE POLICY "Residents update own nominations"
ON public.nominations
FOR UPDATE
USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
)
WITH CHECK (
  (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) AND NEW.status <> 'REJECTED')
  OR public.is_admin()
);

CREATE POLICY "Admins manage nominations"
ON public.nominations
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users view own slots or admin"
ON public.time_slots
FOR SELECT
USING (
  nomination_id IN (
    SELECT id
    FROM public.nominations n
    WHERE n.user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
  OR public.is_admin()
);

CREATE POLICY "Admins manage slots"
ON public.time_slots
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Published announcements readable by users"
ON public.announcements
FOR SELECT
USING (
  status = 'PUBLISHED'
  AND publish_at <= NOW()
  AND (expires_at IS NULL OR expires_at > NOW())
  OR public.is_admin()
);

CREATE POLICY "Admins manage announcements"
ON public.announcements
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Published campaigns readable by users"
ON public.campaigns
FOR SELECT
USING (
  status = 'PUBLISHED'
  AND COALESCE(published_at, NOW()) <= NOW()
  AND (expires_at IS NULL OR expires_at > NOW())
  OR public.is_admin()
);

CREATE POLICY "Admins manage campaigns"
ON public.campaigns
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Published results readable by users"
ON public.results
FOR SELECT
USING (
  published_at IS NOT NULL
  OR public.is_admin()
);

CREATE POLICY "Admins manage results"
ON public.results
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users manage own notifications"
ON public.notifications
FOR SELECT
USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
)
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Users manage own device tokens"
ON public.device_tokens
FOR ALL
USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
)
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Users manage own tickets"
ON public.tickets
FOR SELECT
USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR assigned_to IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Users create own tickets"
ON public.tickets
FOR INSERT
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Users or admins update tickets"
ON public.tickets
FOR UPDATE
USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR assigned_to IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
)
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR assigned_to IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Users read ticket messages for own tickets"
ON public.ticket_messages
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM public.tickets
    WHERE user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
       OR assigned_to IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  )
  OR public.is_admin()
);

CREATE POLICY "Users insert own ticket messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  sender_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Users manage own media assets"
ON public.media_assets
FOR ALL
USING (
  owner_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
)
WITH CHECK (
  owner_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Admins manage whatsapp messages"
ON public.whatsapp_messages
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins read audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Super admins manage app settings"
ON public.app_settings
FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

COMMIT;
