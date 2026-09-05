-- Notification scheduling and administrator-managed festival gallery.
CREATE TABLE IF NOT EXISTS public.notification_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'PROGRAM_DEADLINE',
  channel text NOT NULL DEFAULT 'IN_APP'
    CHECK (channel IN ('EMAIL', 'SMS', 'WHATSAPP', 'IN_APP')),
  audience text NOT NULL DEFAULT 'RESIDENT'
    CHECK (audience IN ('RESIDENT', 'ADMIN', 'ALL')),
  frequency text NOT NULL DEFAULT 'AD_HOC'
    CHECK (frequency IN ('AD_HOC', 'WEEKLY', 'DAILY')),
  send_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_schedule_program_event_check CHECK (
    program_id IS NULL OR event_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS notification_schedules_due_idx
  ON public.notification_schedules (active, send_at);

CREATE TABLE IF NOT EXISTS public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  caption text,
  image_url text NOT NULL,
  mime_type text NOT NULL DEFAULT 'image/jpeg',
  size_bytes bigint NOT NULL DEFAULT 1 CHECK (size_bytes > 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gallery_images_active_order_idx
  ON public.gallery_images (active, sort_order, created_at);

DROP TRIGGER IF EXISTS notification_schedules_set_updated_at ON public.notification_schedules;
CREATE TRIGGER notification_schedules_set_updated_at
BEFORE UPDATE ON public.notification_schedules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gallery_images_set_updated_at ON public.gallery_images;
CREATE TRIGGER gallery_images_set_updated_at
BEFORE UPDATE ON public.gallery_images
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
