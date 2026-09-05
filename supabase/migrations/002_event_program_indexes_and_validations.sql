BEGIN;

CREATE INDEX IF NOT EXISTS idx_events_year_status
ON public.events (year, status);

CREATE INDEX IF NOT EXISTS idx_programs_event_status
ON public.programs (event_id, status);

CREATE INDEX IF NOT EXISTS idx_program_eligibility_program_id
ON public.program_eligibility (program_id);

CREATE OR REPLACE FUNCTION public.validate_program_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.nomination_open_at IS NOT NULL AND NEW.nomination_close_at IS NOT NULL
     AND NEW.nomination_open_at >= NEW.nomination_close_at THEN
    RAISE EXCEPTION 'nomination_open_at must be earlier than nomination_close_at';
  END IF;

  IF NEW.nomination_open_at IS NOT NULL OR NEW.nomination_close_at IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = NEW.event_id
        AND COALESCE(NEW.nomination_close_at, e.start_at) > e.start_at
    ) THEN
      RAISE EXCEPTION 'program nomination window must end before the event starts';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_program_window_on_programs ON public.programs;
CREATE TRIGGER validate_program_window_on_programs
BEFORE INSERT OR UPDATE ON public.programs
FOR EACH ROW EXECUTE FUNCTION public.validate_program_window();

COMMIT;
