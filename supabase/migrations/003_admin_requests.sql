BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role public.app_role NOT NULL DEFAULT 'ADMIN',
  reason text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  reviewed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_requests_one_pending_unique
ON public.admin_requests (profile_id)
WHERE status = 'PENDING';

DROP TRIGGER IF EXISTS admin_requests_set_updated_at ON public.admin_requests;
CREATE TRIGGER admin_requests_set_updated_at
BEFORE UPDATE ON public.admin_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
