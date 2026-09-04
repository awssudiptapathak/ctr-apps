import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware.js';
import { checkNominationEligibility } from '@ctr-cms/shared';
import { createNotification } from './notifications.js';

const router = Router();

function mapSlot(row: any) {
  if (!row || !row.slot_id) return null;
  return {
    id: row.slot_id,
    programId: row.slot_program_id ?? row.program_id,
    nominationId: row.slot_nomination_id ?? row.nomination_id,
    startAt: row.slot_start_at,
    endAt: row.slot_end_at,
    venue: row.slot_venue,
    status: row.slot_status,
  };
}

function mapNomination(row: any) {
  return {
    id: row.id,
    programId: row.program_id,
    userId: row.user_id,
    participantName: row.participant_name,
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    allocatedSlot: mapSlot(row),
  };
}

function ownProfileClause(userId: string) {
  return `user_id = '${userId}'`;
}

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const isAdmin = req.role === 'ADMIN' || req.role === 'SUPER_ADMIN';
  const rows = isAdmin
    ? await query<any>(
        `SELECT n.*, ts.id AS slot_id, ts.program_id AS slot_program_id, ts.nomination_id AS slot_nomination_id,
                ts.start_at AS slot_start_at, ts.end_at AS slot_end_at, ts.venue AS slot_venue, ts.status AS slot_status
         FROM public.nominations n
         LEFT JOIN public.time_slots ts ON ts.nomination_id = n.id
         ORDER BY n.created_at DESC`,
      )
    : await query<any>(
        `SELECT n.*, ts.id AS slot_id, ts.program_id AS slot_program_id, ts.nomination_id AS slot_nomination_id,
                ts.start_at AS slot_start_at, ts.end_at AS slot_end_at, ts.venue AS slot_venue, ts.status AS slot_status
         FROM public.nominations n
         LEFT JOIN public.time_slots ts ON ts.nomination_id = n.id
         WHERE n.user_id = $1
         ORDER BY n.created_at DESC`,
        [req.userId],
      );
  return res.json({ nominations: rows.map(mapNomination) });
});

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const { programId, participantName } = req.body || {};
  if (!programId || !participantName) {
    return res.status(400).json({ error: 'programId and participantName are required' });
  }

  const program = await queryOne<any>('SELECT * FROM public.programs WHERE id = $1', [programId]);
  if (!program) {
    return res.status(404).json({ error: 'Program not found' });
  }

  const existingRows = await query<any>(
    'SELECT id, program_id, status FROM public.nominations WHERE user_id = $1',
    [req.userId],
  );

  const eligibility = checkNominationEligibility({
    program: {
      id: program.id,
      status: program.status,
      nominationOpenAt: program.nomination_open_at,
      nominationCloseAt: program.nomination_close_at,
    },
    existingNominations: existingRows.map((row: any) => ({ programId: row.program_id, status: row.status })),
  });

  if (!eligibility.ok) {
    const message =
      eligibility.reason === 'NOT_PUBLISHED'
        ? 'Nominations are not open for this program.'
        : eligibility.reason === 'WINDOW_CLOSED'
          ? 'The nomination window for this program is closed.'
          : 'You already have an active nomination for this program.';
    return res.status(409).json({ error: message });
  }

  const row = await queryOne<any>(
    `INSERT INTO public.nominations (program_id, user_id, participant_name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [programId, req.userId, participantName],
  );
  return res.status(201).json({ nomination: mapNomination(row) });
});

router.put('/:id/status', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status is required' });
  const row = await queryOne<any>(
    `UPDATE public.nominations SET status = $2 WHERE id = $1 RETURNING *`,
    [req.params.id, status],
  );
  if (!row) return res.status(404).json({ error: 'Nomination not found' });
  const withSlot = await queryOne<any>(
    `SELECT n.*, ts.id AS slot_id, ts.program_id AS slot_program_id, ts.nomination_id AS slot_nomination_id,
            ts.start_at AS slot_start_at, ts.end_at AS slot_end_at, ts.venue AS slot_venue, ts.status AS slot_status
     FROM public.nominations n
     LEFT JOIN public.time_slots ts ON ts.nomination_id = n.id
     WHERE n.id = $1`,
    [req.params.id],
  );
  return res.json({ nomination: mapNomination(withSlot ?? row) });
});

router.post('/:id/slot', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { startAt, endAt, venue } = req.body || {};
  if (!startAt || !endAt || !venue) {
    return res.status(400).json({ error: 'startAt, endAt and venue are required' });
  }

  const nomination = await queryOne<any>('SELECT * FROM public.nominations WHERE id = $1', [req.params.id]);
  if (!nomination) return res.status(404).json({ error: 'Nomination not found' });

  if (nomination.status === 'REJECTED' || nomination.status === 'CANCELLED') {
    return res.status(409).json({ error: 'A slot cannot be allocated to a declined nomination.' });
  }

  const existing = await queryOne<any>('SELECT * FROM public.time_slots WHERE nomination_id = $1', [nomination.id]);
  const slotRow = existing
    ? await queryOne<any>(
        `UPDATE public.time_slots SET start_at = $2, end_at = $3, venue = $4, status = 'CONFIRMED'
         WHERE id = $1 RETURNING *`,
        [existing.id, startAt, endAt, venue],
      )
    : await queryOne<any>(
        `INSERT INTO public.time_slots (program_id, nomination_id, start_at, end_at, venue, status)
         VALUES ($1, $2, $3, $4, $5, 'CONFIRMED')
         RETURNING *`,
        [nomination.program_id, nomination.id, startAt, endAt, venue],
      );

  const updated = nomination.status === 'SLOT_ALLOCATED'
    ? nomination
    : await queryOne<any>(
        `UPDATE public.nominations SET status = 'SLOT_ALLOCATED' WHERE id = $1 RETURNING *`,
        [nomination.id],
      );

  await createNotification({
    userId: nomination.user_id,
    type: 'SLOT_ALLOCATED',
    title: 'Your slot has been allocated',
    body: `Your time slot for has been confirmed`,
    data: {
      nominationId: nomination.id,
      programId: nomination.program_id,
      startAt,
      endAt,
      venue,
    },
  });

  const withSlot = await queryOne<any>(
    `SELECT n.*, ts.id AS slot_id, ts.program_id AS slot_program_id, ts.nomination_id AS slot_nomination_id,
            ts.start_at AS slot_start_at, ts.end_at AS slot_end_at, ts.venue AS slot_venue, ts.status AS slot_status
     FROM public.nominations n
     LEFT JOIN public.time_slots ts ON ts.nomination_id = n.id
     WHERE n.id = $1`,
    [nomination.id],
  );
  return res.status(existing ? 200 : 201).json({ nomination: mapNomination(withSlot ?? updated), slot: mapSlot(withSlot ?? updated) });
});

export default router;
