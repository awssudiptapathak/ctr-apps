ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_email_format_check
  CHECK (email IS NULL OR email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

ALTER TABLE public.nominations
  ADD COLUMN IF NOT EXISTS participant_age integer,
  ADD COLUMN IF NOT EXISTS performance_mode text,
  ADD COLUMN IF NOT EXISTS performance_type text,
  ADD COLUMN IF NOT EXISTS probable_time_minutes integer,
  ADD COLUMN IF NOT EXISTS performance_summary text,
  ADD COLUMN IF NOT EXISTS photo_data text;

ALTER TABLE public.nominations
  ADD CONSTRAINT nominations_participant_age_check
  CHECK (participant_age IS NULL OR participant_age BETWEEN 1 AND 120);

ALTER TABLE public.nominations
  ADD CONSTRAINT nominations_performance_mode_check
  CHECK (performance_mode IS NULL OR performance_mode IN ('SOLO', 'GROUP'));

ALTER TABLE public.nominations
  ADD CONSTRAINT nominations_performance_type_check
  CHECK (performance_type IS NULL OR performance_type IN ('DANCE', 'SINGING', 'DRAMA', 'RECITATION', 'INSTRUMENT'));

ALTER TABLE public.nominations
  ADD CONSTRAINT nominations_time_check
  CHECK (
    probable_time_minutes IS NULL
    OR probable_time_minutes BETWEEN 1 AND CASE WHEN performance_mode = 'GROUP' THEN 20 ELSE 10 END
  );
