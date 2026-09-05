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
  const livePrograms = await query<any>(
    `SELECT p.*, e.title AS event_title, e.start_at AS event_start_at, e.end_at AS event_end_at
       FROM public.programs p JOIN public.events e ON e.id = p.event_id
      WHERE p.status IN ('PUBLISHED', 'ACTIVE') AND e.status = 'ACTIVE'
        AND e.start_at <= NOW() AND e.end_at >= NOW()
      ORDER BY e.start_at ASC, p.created_at DESC`,
  );
  const upcomingPrograms = await query<any>(
    `SELECT p.*, e.title AS event_title, e.start_at AS event_start_at, e.end_at AS event_end_at
       FROM public.programs p JOIN public.events e ON e.id = p.event_id
      WHERE p.status IN ('PUBLISHED', 'ACTIVE') AND e.start_at > NOW()
      ORDER BY e.start_at ASC, p.created_at DESC`,
  );
  const openPrograms = await query<any>(
    `SELECT p.*, e.title AS event_title, e.start_at AS event_start_at, e.end_at AS event_end_at
       FROM public.programs p JOIN public.events e ON e.id = p.event_id
      WHERE p.status = 'PUBLISHED' AND e.status IN ('PUBLISHED', 'ACTIVE')
        AND p.nomination_open_at <= NOW() AND p.nomination_close_at >= NOW()
      ORDER BY p.nomination_close_at ASC`,
  );
  const todaySchedule = await query<any>(
    `SELECT ts.id, ts.start_at, ts.end_at, ts.venue, ts.status,
            p.id AS program_id, p.name AS program_name, e.id AS event_id, e.title AS event_title
       FROM public.time_slots ts
       JOIN public.programs p ON p.id = ts.program_id
       JOIN public.events e ON e.id = p.event_id
      WHERE timezone('Asia/Kolkata', ts.start_at)::date = timezone('Asia/Kolkata', NOW())::date
      ORDER BY ts.start_at ASC`,
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
    livePrograms: livePrograms.map(mapFeedProgram),
    upcomingPrograms: upcomingPrograms.map(mapFeedProgram),
    openPrograms: openPrograms.map(mapFeedProgram),
    todaySchedule: todaySchedule.map((row) => ({
      id: row.id, startAt: row.start_at, endAt: row.end_at, venue: row.venue, status: row.status,
      programId: row.program_id, programName: row.program_name, eventId: row.event_id, eventTitle: row.event_title,
    })),
  });
});

function mapFeedProgram(p: any) {
  return {
    id: p.id,
    eventId: p.event_id,
    name: p.name,
    description: p.description,
    rules: p.rules,
    maxParticipants: p.max_participants,
    nominationOpenAt: p.nomination_open_at,
    nominationCloseAt: p.nomination_close_at,
    status: p.status,
    event: p.event_title ? {
      id: p.event_id, title: p.event_title, startAt: p.event_start_at, endAt: p.event_end_at,
    } : null,
  };
}

router.get('/settings', async (_req, res) => {
  const rows = await query<any>('SELECT key, value_json, updated_at FROM public.app_settings');
  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    settings[row.key] = row.value_json?.value ?? row.value_json;
  }
  return res.json({ settings });
});

router.get('/gallery', async (_req, res) => {
  const rows = await query<any>(
    `SELECT id, title, caption, image_url, mime_type, size_bytes, sort_order, created_at
       FROM public.gallery_images WHERE active = true
      ORDER BY sort_order ASC, created_at DESC`,
  );
  return res.json({ images: rows.map((row) => ({
    id: row.id, title: row.title, caption: row.caption, imageUrl: row.image_url,
    mimeType: row.mime_type, sizeBytes: Number(row.size_bytes), sortOrder: row.sort_order, createdAt: row.created_at,
  })) });
});

router.get('/health', async (_req, res) => {
  const db = await queryOne<any>('SELECT 1 AS ok');
  return res.json({ status: 'ok', db: db ? true : false });
});

export default router;
