ALTER TABLE public.nominations
  ADD COLUMN IF NOT EXISTS participant_phone text,
  ADD COLUMN IF NOT EXISTS participant_flat_no text;

UPDATE public.nominations n
SET participant_phone = p.phone,
    participant_flat_no = p.flat_no
FROM public.profiles p
WHERE p.id = n.user_id
  AND (n.participant_phone IS NULL OR n.participant_flat_no IS NULL);
