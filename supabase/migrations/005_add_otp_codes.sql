BEGIN;

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('password_reset', 'verify_phone')),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  verified_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_purpose_created
  ON public.otp_codes (phone, purpose, created_at DESC);

COMMIT;
