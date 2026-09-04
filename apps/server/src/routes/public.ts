import { Router } from 'express';
import { query, queryOne } from '../db.js';

const router = Router();

router.get('/feed', async (req, res) => {
  const events = await query<any>(
    `SELECT * FROM public.events
     WHERE status IN ('PUBLISHED', 'ACTIVE')
     ORDER BY start_at ASC`,
  );
  const programs = await query<any>(
    `SELECT * FROM public.programs
     WHERE status IN ('PUBLISHED', 'ACTIVE')
     ORDER BY created_at DESC`,
  );

  const eventMap = new Map(
    events.map((e) => [
      e.id,
      {
        id: e.id,
        year: e.year,
        title: e.title,
        description: e.description,
        venue: e.venue,
        startAt: e.start_at,
        endAt: e.end_at,
        status: e.status,
      },
    ]),
  );

  return res.json({
    events: [...eventMap.values()],
    programs: programs.map((p) => ({
      id: p.id,
      eventId: p.event_id,
      name: p.name,
      description: p.description,
      rules: p.rules,
      maxParticipants: p.max_participants,
      nominationOpenAt: p.nomination_open_at,
      nominationCloseAt: p.nomination_close_at,
      status: p.status,
      event: eventMap.get(p.event_id) || null,
    })),
  });
});

router.get('/settings', async (_req, res) => {
  const rows = await query<any>('SELECT key, value_json, updated_at FROM public.app_settings');
  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    settings[row.key] = row.value_json?.value ?? row.value_json;
  }
  return res.json({ settings });
});

router.get('/health', async (_req, res) => {
  const db = await queryOne<any>('SELECT 1 AS ok');
  return res.json({ status: 'ok', db: db ? true : false });
});

export default router;
