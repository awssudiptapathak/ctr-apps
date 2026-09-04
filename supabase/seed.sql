-- Custom-auth compatible seed for CTR-CMS.
-- Provides an admin + demo resident and sample events/programs.

INSERT INTO public.app_settings (key, value_json, updated_by)
VALUES
  ('timezone', '{"value": "Asia/Kolkata"}', NULL),
  ('default_reminder_hours', '{"value": 10}', NULL)
ON CONFLICT (key) DO NOTHING;

-- password_hash below: Admin@123 (bcrypt)
INSERT INTO public.profiles (id, full_name, phone, email, flat_no, role, status, onboarding_completed, password_hash)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Sudipta Pathak', '+919883614680', 'sudip241281@gmail.com', 'A-101', 'SUPER_ADMIN', 'ACTIVE', true, '$2a$10$DxWtISxoyVf/mxSbFNFhFOyVzVNh3pgUNZ5HzHOaifNN8MX3m5pIK'),
  -- Welcome@123 (bcrypt)
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Jhimli Pathak', '+919874229187', 'jhimlig@gmail.com', 'B-204', 'USER', 'ACTIVE', true, '$2a$10$V/QldN.zWdD7ngEDxWV7GuwJVD2HcUVuvBgluZbEj9keCRqGgZlUq'),
  -- Test@123 (bcrypt)
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Sudipta Pathak', '+918777742683', 'sudipta@clubtown.com', 'B-101', 'USER', 'ACTIVE', true, '$2a$10$vjsdh1C3dYnVPVBnHU/kW.PJFa1BVY8XLYcH.geYPa4aNe4hzdF2q')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (id, year, title, description, venue, start_at, end_at, status, publish_at)
VALUES
  ('11111111-1111-4111-8111-111111111111', 2026, 'Durga Puja 2026', 'Community cultural festival', 'Clubtown Main Hall', '2026-10-05T18:00:00+05:30', '2026-10-10T22:00:00+05:30', 'PUBLISHED', '2026-09-01T00:00:00+05:30'),
  ('22222222-2222-4222-8222-222222222222', 2026, 'Winter Music Week', 'Open community performances', 'Clubtown Community Stage', '2026-12-10T17:00:00+05:30', '2026-12-15T21:30:00+05:30', 'DRAFT', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.programs (id, event_id, name, description, rules, max_participants, nomination_open_at, nomination_close_at, status)
VALUES
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'Singing Competition', 'Solo and duet vocal performances', 'Open to residents above age 12', 20, '2026-09-01T00:00:00+05:30', '2026-09-20T23:59:00+05:30', 'PUBLISHED'),
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'Dance Competition', 'Group dance and classical fusion', 'Teams of 2-8', 16, '2026-09-02T00:00:00+05:30', '2026-09-25T23:59:00+05:30', 'PUBLISHED')
ON CONFLICT (id) DO NOTHING;
