import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware.js';

const router = Router();

function mapRequest(row: any) {
  return {
    id: row.id,
    profileId: row.profile_id,
    requestedRole: row.requested_role,
    reason: row.reason,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    requester: row.requester_full_name
      ? {
          fullName: row.requester_full_name,
          phone: row.requester_phone,
          email: row.requester_email,
          flatNo: row.requester_flat_no,
          role: row.requester_role,
          status: row.requester_status,
        }
      : undefined,
  };
}

router.get('/mine', requireAuth, async (req: AuthedRequest, res) => {
  const rows = await query<any>(
    `SELECT ar.*, p.full_name AS requester_full_name, p.phone AS requester_phone,
            p.email AS requester_email, p.flat_no AS requester_flat_no, p.role AS requester_role, p.status AS requester_status
     FROM public.admin_requests ar
     JOIN public.profiles p ON p.id = ar.profile_id
     WHERE ar.profile_id = $1
     ORDER BY ar.created_at DESC`,
    [req.userId],
  );
  return res.json({ requests: rows.map(mapRequest) });
});

router.get('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const statusClause = status ? 'WHERE ar.status = $1' : '';
  const params = status ? [status] : [];
  const rows = await query<any>(
    `SELECT ar.*, p.full_name AS requester_full_name, p.phone AS requester_phone,
            p.email AS requester_email, p.flat_no AS requester_flat_no, p.role AS requester_role, p.status AS requester_status
     FROM public.admin_requests ar
     JOIN public.profiles p ON p.id = ar.profile_id
     ${statusClause}
     ORDER BY
       CASE WHEN ar.status = 'PENDING' THEN 0 ELSE 1 END,
       ar.created_at DESC`,
    params,
  );
  return res.json({ requests: rows.map(mapRequest) });
});

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

  const profile = await queryOne<any>('SELECT * FROM public.profiles WHERE id = $1', [req.userId]);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  if (profile.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Account is not active.' });
  }
  if (profile.role !== 'USER') {
    return res.status(409).json({ error: 'Only USER accounts can request admin access.' });
  }

  const alreadyRequested = await queryOne<any>(
    `SELECT id FROM public.admin_requests WHERE profile_id = $1 AND status = 'PENDING'`,
    [req.userId],
  );
  if (alreadyRequested) {
    return res.status(409).json({ error: 'You already have a pending admin request.' });
  }

  const row = await queryOne<any>(
    `INSERT INTO public.admin_requests (profile_id, requested_role, reason)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [req.userId, 'ADMIN', reason || null],
  );
  return res.status(201).json({ request: mapRequest(row) });
});

router.post('/:id/approve', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  const record = await queryOne<any>('SELECT * FROM public.admin_requests WHERE id = $1', [req.params.id]);
  if (!record) {
    return res.status(404).json({ error: 'Admin request not found' });
  }
  if (record.status !== 'PENDING') {
    return res.status(409).json({ error: 'This request has already been reviewed.' });
  }

  const profile = await queryOne<any>('SELECT * FROM public.profiles WHERE id = $1', [record.profile_id]);
  if (!profile) {
    return res.status(404).json({ error: 'Requester profile not found' });
  }

  await query('UPDATE public.admin_requests SET status = $2, reviewed_by = $3, reviewed_at = NOW() WHERE id = $1', [
    record.id,
    'APPROVED',
    req.userId,
  ]);
  await query('UPDATE public.profiles SET role = $2 WHERE id = $1', [profile.id, record.requested_role]);

  const updated = await queryOne<any>(
    `SELECT ar.*, p.full_name AS requester_full_name, p.phone AS requester_phone,
            p.email AS requester_email, p.flat_no AS requester_flat_no, p.role AS requester_role, p.status AS requester_status
     FROM public.admin_requests ar
     JOIN public.profiles p ON p.id = ar.profile_id
     WHERE ar.id = $1`,
    [record.id],
  );
  return res.json({ request: mapRequest(updated) });
});

router.post('/:id/reject', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  const record = await queryOne<any>('SELECT * FROM public.admin_requests WHERE id = $1', [req.params.id]);
  if (!record) {
    return res.status(404).json({ error: 'Admin request not found' });
  }
  if (record.status !== 'PENDING') {
    return res.status(409).json({ error: 'This request has already been reviewed.' });
  }

  const updated = await queryOne<any>(
    `UPDATE public.admin_requests SET status = 'REJECTED', reviewed_by = $2, reviewed_at = NOW()
     WHERE id = $1 RETURNING *`,
    [record.id, req.userId],
  );
  return res.json({ request: mapRequest(updated) });
});

export default router;
