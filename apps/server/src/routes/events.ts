import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware.js';
import { isValidSlotRange } from '@ctr-cms/shared';

const router = Router();

function mapEvent(row: any) {
  return {
    id: row.id,
    year: row.year,
    title: row.title,
    description: row.description,
    venue: row.venue,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    publishAt: row.publish_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', async (_req, res) => {
  const rows = await query<any>(
    `SELECT * FROM public.events
     ORDER BY year ASC, start_at ASC`,
  );
  return res.json({ events: rows.map(mapEvent) });
});

router.get('/:id', async (req, res) => {
  const row = await queryOne<any>('SELECT * FROM public.events WHERE id = $1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Event not found' });
  return res.json({ event: mapEvent(row) });
});

router.post('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  const { year, title, description, venue, startAt, endAt, status, publishAt } = req.body || {};
  if (!year || !title || !startAt || !endAt) {
    return res.status(400).json({ error: 'year, title, startAt, endAt are required' });
  }
  if (!isValidSlotRange(startAt, endAt)) {
    return res.status(400).json({ error: 'startAt must be before endAt' });
  }

  const row = await queryOne<any>(
    `INSERT INTO public.events (year, title, description, venue, start_at, end_at, status, publish_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [year, title, description || null, venue || null, startAt, endAt, status || 'DRAFT', publishAt || null, req.userId],
  );
  return res.status(201).json({ event: mapEvent(row) });
});

router.put('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const existing = await queryOne<any>('SELECT * FROM public.events WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const b = req.body || {};
  const row = await queryOne<any>(
    `UPDATE public.events SET
       year = COALESCE($2, year),
       title = COALESCE($3, title),
       description = COALESCE($4, description),
       venue = COALESCE($5, venue),
       start_at = COALESCE($6, start_at),
       end_at = COALESCE($7, end_at),
       status = COALESCE($8, status),
       publish_at = COALESCE($9, publish_at)
     WHERE id = $1
     RETURNING *`,
    [req.params.id, b.year, b.title, b.description, b.venue, b.startAt, b.endAt, b.status, b.publishAt],
  );
  return res.json({ event: mapEvent(row) });
});

router.delete('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const existing = await queryOne<any>('SELECT id FROM public.events WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const programs = await queryOne<any>('SELECT id FROM public.programs WHERE event_id = $1 LIMIT 1', [req.params.id]);
  if (programs) {
    return res.status(409).json({ error: 'Cannot delete this event while it has associated programs. Remove its programs first.' });
  }

  await query('DELETE FROM public.events WHERE id = $1', [req.params.id]);
  return res.status(204).end();
});

export default router;
