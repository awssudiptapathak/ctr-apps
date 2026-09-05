ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'PERFORMANCE';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programs_category_check') THEN
    ALTER TABLE public.programs ADD CONSTRAINT programs_category_check
      CHECK (category IN ('COMPETITION', 'PERFORMANCE'));
  END IF;
END $$;

ALTER TABLE public.nominations
  ADD COLUMN IF NOT EXISTS judge_score numeric(6,2),
  ADD COLUMN IF NOT EXISTS judge_1 numeric(6,2),
  ADD COLUMN IF NOT EXISTS judge_2 numeric(6,2),
  ADD COLUMN IF NOT EXISTS judge_3 numeric(6,2);
