import { Router } from 'express';
import { queryOne, query } from '../db.js';
import { hashPassword, verifyPassword, signToken, type AuthUser } from '../auth.js';
import { requireAuth, type AuthedRequest } from '../middleware.js';
import { isValidPhoneNumber } from '@ctr-cms/shared';

const router = Router();

function toAuthUser(row: any): AuthUser {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    flatNo: row.flat_no,
    role: row.role,
    status: row.status,
    onboardingCompleted: row.onboarding_completed,
  };
}

router.post('/register', async (req, res) => {
  const { fullName, phone, email, flatNo } = req.body || {};
  const password = String(req.body?.password || '');

  if (!fullName || !phone) {
    return res.status(400).json({ error: 'fullName and phone are required' });
  }
  if (!isValidPhoneNumber(phone)) {
    return res.status(400).json({ error: 'Enter a valid mobile number in E.164 format.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = await queryOne<any>(
    'SELECT id FROM public.profiles WHERE phone = $1',
    [phone],
  );
  if (existing) {
    return res.status(409).json({ error: 'A profile already exists for this phone.' });
  }

  const passwordHash = hashPassword(password);
  const row = await queryOne<any>(
    `INSERT INTO public.profiles (full_name, phone, email, flat_no, password_hash, onboarding_completed)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING *`,
    [fullName, phone, email || null, flatNo || null, passwordHash],
  );

  const user = toAuthUser(row);
  return res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const { phone, password } = req.body || {};

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password are required' });
  }

  const row = await queryOne<any>(
    'SELECT * FROM public.profiles WHERE phone = $1',
    [phone],
  );
  if (!row || !verifyPassword(String(password), row.password_hash)) {
    return res.status(401).json({ error: 'Invalid phone or password.' });
  }
  if (row.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Account is not active.' });
  }

  const user = toAuthUser(row);
  return res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const row = await queryOne<any>(
    'SELECT * FROM public.profiles WHERE id = $1',
    [req.userId],
  );
  if (!row) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  return res.json({ user: toAuthUser(row) });
});

router.get('/profiles', requireAuth, async (_req: AuthedRequest, res) => {
  const rows = await query<any>(
    'SELECT id, full_name, phone, email, flat_no, role, status FROM public.profiles ORDER BY created_at DESC',
  );
  return res.json({ users: rows.map(toAuthUser) });
});

export default router;
