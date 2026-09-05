import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireRole } from '../middleware.js';

const router = Router();

function mapProgram(row: any) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    description: row.description,
    rules: row.rules,
    maxParticipants: row.max_participants,
    nominationOpenAt: row.nomination_open_at,
    nominationCloseAt: row.nomination_close_at,
    status: row.status,
    category: row.category || 'PERFORMANCE',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', async (req, res) => {
  const eventId = req.query.eventId as string | undefined;
  const rows = eventId
    ? await query<any>('SELECT * FROM public.programs WHERE event_id = $1 ORDER BY created_at DESC', [eventId])
    : await query<any>('SELECT * FROM public.programs ORDER BY created_at DESC');
  return res.json({ programs: rows.map(mapProgram) });
});

router.get('/:id', async (req, res) => {
  const row = await queryOne<any>('SELECT * FROM public.programs WHERE id = $1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Program not found' });
  return res.json({ program: mapProgram(row) });
});

router.post('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { eventId, name, description, rules, maxParticipants, nominationOpenAt, nominationCloseAt, status, category } = req.body || {};
    if (!eventId || !name) {
      return res.status(400).json({ error: 'eventId and name are required' });
    }
    const row = await queryOne<any>(
      `INSERT INTO public.programs (event_id, name, description, rules, max_participants, nomination_open_at, nomination_close_at, status, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [eventId, name, description, rules || null, maxParticipants ?? 1, nominationOpenAt || null, nominationCloseAt || null, status || 'DRAFT', category === 'COMPETITION' ? 'COMPETITION' : 'PERFORMANCE'],
    );
    return res.status(201).json({ program: mapProgram(row) });
  } catch (error) {
    console.error('Failed to create program:', error);
    return res.status(500).json({ error: 'Failed to create program' });
  }
});

router.put('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const existing = await queryOne<any>('SELECT * FROM public.programs WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Program not found' });
  const b = req.body || {};
  const row = await queryOne<any>(
    `UPDATE public.programs SET
       event_id = COALESCE($2, event_id),
       name = COALESCE($3, name),
       description = COALESCE($4, description),
       rules = COALESCE($5, rules),
       max_participants = COALESCE($6, max_participants),
       nomination_open_at = COALESCE($7, nomination_open_at),
       nomination_close_at = COALESCE($8, nomination_close_at),
       status = COALESCE($9, status)
      ,category = COALESCE($10, category)
     WHERE id = $1 RETURNING *`,
    [req.params.id, b.eventId, b.name, b.description, b.rules, b.maxParticipants, b.nominationOpenAt, b.nominationCloseAt, b.status, b.category === 'COMPETITION' ? 'COMPETITION' : b.category === 'PERFORMANCE' ? 'PERFORMANCE' : null],
  );
  return res.json({ program: mapProgram(row) });
});

router.delete('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  await query('DELETE FROM public.programs WHERE id = $1', [req.params.id]);
  return res.status(204).end();
});

export default router;
