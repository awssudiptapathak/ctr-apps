import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { queryOne, query } from '../db.js';
import { hashPassword, verifyPassword, signToken, type AuthUser } from '../auth.js';
import { requireAuth, type AuthedRequest } from '../middleware.js';
import { isValidPhoneNumber, isValidFlatNumber } from '@ctr-cms/shared';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
import {
  generateOtpCode,
  generateOtpSalt,
  hashOtpCode,
  verifyOtpHash,
  isOtpUsable,
  canResendOtp,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
} from '../otp.js';
import { deliverOtp } from '../otpDelivery.js';

const router = Router();

router.post('/recover-super-admin', async (req, res) => {
  const configuredToken = process.env.SUPER_ADMIN_RECOVERY_TOKEN;
  const suppliedToken = req.header('x-super-admin-recovery-token');
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!configuredToken || !suppliedToken || !emailPattern.test(email)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const configured = Buffer.from(configuredToken);
  const supplied = Buffer.from(suppliedToken);
  if (configured.length !== supplied.length || !timingSafeEqual(configured, supplied)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const row = await queryOne<{ id: string; email: string }>(
    `UPDATE public.profiles
        SET role = 'SUPER_ADMIN', status = 'ACTIVE'
      WHERE lower(email) = $1
      RETURNING id, email`,
    [email],
  );
  if (!row) {
    return res.status(404).json({ error: 'Account not found' });
  }

  return res.json({ ok: true, email: row.email });
});

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

  if (!fullName || !phone || !email || !flatNo) {
    return res.status(400).json({ error: 'fullName, email, phone and flatNo are required' });
  }
  if (!isValidPhoneNumber(phone)) {
    return res.status(400).json({ error: 'Enter a valid Indian mobile number in +91XXXXXXXXXX format.' });
  }
  if (!emailPattern.test(String(email).trim())) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!isValidFlatNumber(String(flatNo))) {
    return res.status(400).json({ error: 'Flat must use the format 1A/B1 through 6L/B6.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = await queryOne<any>(
    'SELECT id FROM public.profiles WHERE phone = $1 OR lower(email) = lower($2)',
    [phone, email.trim()],
  );
  if (existing) {
    return res.status(409).json({ error: 'A profile already exists for this phone.' });
  }

  const passwordHash = hashPassword(password);
  const row = await queryOne<any>(
    `INSERT INTO public.profiles (full_name, phone, email, flat_no, password_hash, onboarding_completed)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING *`,
    [fullName.trim(), phone.trim(), email.trim().toLowerCase(), flatNo.trim().toUpperCase(), passwordHash],
  );

  const user = toAuthUser(row);
  return res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password || !emailPattern.test(String(email).trim())) {
    return res.status(400).json({ error: 'A valid email and password are required' });
  }

  const row = await queryOne<any>(
    `SELECT * FROM public.profiles
       WHERE lower(email) = lower($1)
       ORDER BY CASE role
         WHEN 'SUPER_ADMIN' THEN 0
         WHEN 'ADMIN' THEN 1
         ELSE 2
       END, created_at DESC
       LIMIT 1`,
    [email.trim()],
  );
  if (!row || !verifyPassword(String(password), row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
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

async function recordOtpDelivery(phone: string, code: string, purpose: string, email?: string): Promise<void> {
  await deliverOtp({ phone, code, purpose, email });
}

router.post('/otp/request', async (req, res) => {
  const { phone, purpose, email } = req.body || {};
  if (!phone || !isValidPhoneNumber(phone)) {
    return res.status(400).json({ error: 'Enter a valid Indian mobile number in +91XXXXXXXXXX format.' });
  }
  const otpPurpose = purpose === 'verify_phone' ? 'verify_phone' : 'password_reset';

  if (otpPurpose === 'password_reset') {
    const exists = await queryOne<any>('SELECT id FROM public.profiles WHERE phone = $1', [phone]);
    if (!exists) {
      return res.status(404).json({ error: 'No account found for this mobile number.' });
    }
  } else {
    const exists = await queryOne<any>('SELECT id FROM public.profiles WHERE phone = $1', [phone]);
    if (exists) {
      return res.status(409).json({ error: 'A profile already exists for this mobile number.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required to verify your phone.' });
    }
  }

  const last = await queryOne<any>(
    `SELECT created_at FROM public.otp_codes WHERE phone = $1 AND purpose = $2 AND verified_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [phone, otpPurpose],
  );
  if (!canResendOtp(last?.created_at ?? null)) {
    return res.status(429).json({
      error: `Please wait before requesting another code (${OTP_RESEND_COOLDOWN_MS / 1000}s).`,
    });
  }

  const code = generateOtpCode();
  const salt = generateOtpSalt();
  const codeHash = hashOtpCode(code, salt);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await query(
    `INSERT INTO public.otp_codes (phone, purpose, code_hash, expires_at, max_attempts)
     VALUES ($1, $2, $3, $4, $5)`,
    [phone, otpPurpose, `${salt}:${codeHash}`, expiresAt, OTP_MAX_ATTEMPTS],
  );

  try {
    await recordOtpDelivery(phone, code, otpPurpose, email);
  } catch (error) {
    console.error('Failed to deliver OTP:', error);
    return res.status(502).json({ error: 'Unable to send verification code. Please try again.' });
  }

  return res.json({
    ok: true,
    expiresIn: Math.floor(OTP_TTL_MS / 1000),
    devOtp: process.env.NODE_ENV === 'production' ? undefined : code,
  });
});

router.post('/otp/verify', async (req, res) => {
  const { phone, purpose, code } = req.body || {};
  if (!phone || !code || !isValidPhoneNumber(phone)) {
    return res.status(400).json({ error: 'Phone and OTP code are required.' });
  }
  const otpPurpose = purpose === 'verify_phone' ? 'verify_phone' : 'password_reset';

  const record = await queryOne<any>(
    `SELECT * FROM public.otp_codes
     WHERE phone = $1 AND purpose = $2 AND verified_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [phone, otpPurpose],
  );
  if (!record) {
    return res.status(404).json({ error: 'No active OTP request found. Request a new code.' });
  }

  if (!isOtpUsable(record.expires_at, record.attempts, record.max_attempts)) {
    await query('UPDATE public.otp_codes SET attempts = attempts + 1 WHERE id = $1', [record.id]).catch(() => {});
    return res.status(410).json({ error: 'This code has expired or too many attempts. Request a new code.' });
  }

  const [salt, expected] = String(record.code_hash).split(':');
  if (!verifyOtpHash(code, salt, expected)) {
    const nextAttempts = record.attempts + 1;
    await query('UPDATE public.otp_codes SET attempts = $2 WHERE id = $1', [record.id, nextAttempts]);
    if (nextAttempts >= record.max_attempts) {
      return res.status(410).json({ error: 'Too many attempts. Request a new code.' });
    }
    return res.status(401).json({ error: 'Invalid OTP code.' });
  }

  await query(
    "UPDATE public.otp_codes SET verified_at = NOW(), attempts = attempts + 1 WHERE id = $1 AND verified_at IS NULL",
    [record.id],
  );

  return res.json({ ok: true, purpose: otpPurpose });
});

router.post('/password-reset', async (req, res) => {
  const { phone, code, newPassword } = req.body || {};
  if (!phone || !code || !isValidPhoneNumber(phone)) {
    return res.status(400).json({ error: 'Phone and OTP code are required.' });
  }
  const password = String(newPassword || '');
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const otpPurpose = 'password_reset';
  const record = await queryOne<any>(
    `SELECT * FROM public.otp_codes
     WHERE phone = $1 AND purpose = $2 AND verified_at IS NOT NULL
     ORDER BY verified_at DESC LIMIT 1`,
    [phone, otpPurpose],
  );
  if (!record || !verifyOtpHash(code, String(record.code_hash).split(':')[0], String(record.code_hash).split(':')[1])) {
    return res.status(400).json({ error: 'Please verify your OTP before resetting the password.' });
  }

  await query(
    'UPDATE public.profiles SET password_hash = $1 WHERE phone = $2',
    [hashPassword(password), phone],
  );

  return res.json({ ok: true });
});

export default router;
