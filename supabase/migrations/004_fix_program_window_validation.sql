BEGIN;

CREATE OR REPLACE FUNCTION public.validate_program_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.nomination_open_at IS NOT NULL
     AND NEW.nomination_close_at IS NOT NULL
     AND NEW.nomination_open_at >= NEW.nomination_close_at THEN
    RAISE EXCEPTION 'nomination_open_at must be earlier than nomination_close_at';
  END IF;

  IF NEW.nomination_close_at IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.events e
       WHERE e.id = NEW.event_id
         AND NEW.nomination_close_at > e.start_at
     ) THEN
    RAISE EXCEPTION 'program nomination window must end before the event starts';
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
