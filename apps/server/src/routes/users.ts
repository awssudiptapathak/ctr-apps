import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware.js';
import { hashPassword } from '../auth.js';
import { isValidPhoneNumber } from '@ctr-cms/shared';

const router = Router();

function mapUser(row: any) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    flatNo: row.flat_no,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

router.get('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  let sql = 'SELECT id, full_name, phone, email, flat_no, role, status, created_at FROM public.profiles';
  const params: any[] = [];

  if (search) {
    sql += ` WHERE full_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR flat_no ILIKE $1`;
    params.push(`%${search}%`);
  }

  sql += ' ORDER BY created_at DESC';
  const rows = await query<any>(sql, params);
  return res.json({ users: rows.map(mapUser) });
});

router.post('/', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  const { fullName, phone, email, flatNo, role, password } = req.body || {};

  if (!fullName || !phone) {
    return res.status(400).json({ error: 'fullName and phone are required' });
  }
  if (!isValidPhoneNumber(phone)) {
    return res.status(400).json({ error: 'Enter a valid mobile number in E.164 format.' });
  }
  const userRole = ['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role) ? role : 'USER';
  const pw = String(password || 'Welcome@123');
  if (pw.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = await queryOne<any>('SELECT id FROM public.profiles WHERE phone = $1', [phone]);
  if (existing) {
    return res.status(409).json({ error: 'A profile already exists for this phone.' });
  }

  const row = await queryOne<any>(
    `INSERT INTO public.profiles (full_name, phone, email, flat_no, role, password_hash, onboarding_completed)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING *`,
    [fullName, phone, email || null, flatNo || null, userRole, hashPassword(pw)],
  );
  return res.status(201).json({ user: mapUser(row) });
});

router.patch('/:id/role', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  const { role } = req.body || {};
  if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  const row = await queryOne<any>(
    'UPDATE public.profiles SET role = $2 WHERE id = $1 RETURNING id, full_name, phone, email, flat_no, role, status, created_at',
    [req.params.id, role],
  );
  if (!row) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: mapUser(row) });
});

router.patch('/:id/status', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  const { status } = req.body || {};
  if (!['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  const row = await queryOne<any>(
    'UPDATE public.profiles SET status = $2 WHERE id = $1 RETURNING id, full_name, phone, email, flat_no, role, status, created_at',
    [req.params.id, status],
  );
  if (!row) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: mapUser(row) });
});

router.delete('/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  const row = await queryOne<any>('DELETE FROM public.profiles WHERE id = $1 RETURNING id', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'User not found' });
  return res.json({ ok: true });
});

export default router;
