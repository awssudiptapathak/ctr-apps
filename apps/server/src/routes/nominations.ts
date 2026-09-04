import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware.js';
import { checkNominationEligibility } from '@ctr-cms/shared';

const router = Router();

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
  };
}

function ownProfileClause(userId: string) {
  return `user_id = '${userId}'`;
}

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const isAdmin = req.role === 'ADMIN' || req.role === 'SUPER_ADMIN';
  const rows = isAdmin
    ? await query<any>('SELECT * FROM public.nominations ORDER BY created_at DESC')
    : await query<any>(`SELECT * FROM public.nominations WHERE user_id = $1 ORDER BY created_at DESC`, [req.userId]);
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
  return res.json({ nomination: mapNomination(row) });
});

export default router;
