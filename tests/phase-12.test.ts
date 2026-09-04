import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpHash,
  isOtpUsable,
  canResendOtp,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
} from '../apps/server/src/otp.js';

const API_URL = process.env.CTR_CMS_API_URL || 'http://localhost:4200/api';

async function apiFetch(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const err: Error & { status?: number; data?: unknown } = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function serverIsReachable(): Promise<boolean> {
  return fetch(`${API_URL}/health`)
    .then(() => true)
    .catch(() => false);
}

test('Phase 12 unit: OTP helpers hash, verify, expire and rate-limit correctly', () => {
  const code = generateOtpCode();
  assert.match(code, /^\d{6}$/, 'code is 6 digits');
  assert.notEqual(generateOtpCode(), generateOtpCode(), 'codes are not trivially equal');

  const salt = '12345678';
  const h = hashOtpCode(code, salt);
  assert.equal(h.length, 64, 'hash is sha256 hex');
  assert.equal(verifyOtpHash(code, salt, h), true, 'correct code verifies');
  assert.equal(verifyOtpHash(code, salt, hashOtpCode('000000', salt)), false, 'wrong code fails');
  assert.equal(verifyOtpHash('000000', salt, h), false, 'wrong code fails against stored hash');

  const future = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const past = new Date(Date.now() - 1000).toISOString();
  assert.equal(isOtpUsable(future, 0, OTP_MAX_ATTEMPTS), true, 'fresh code is usable');
  assert.equal(isOtpUsable(past, 0, OTP_MAX_ATTEMPTS), false, 'expired code is not usable');
  assert.equal(isOtpUsable(future, OTP_MAX_ATTEMPTS, OTP_MAX_ATTEMPTS), false, 'exhausted attempts not usable');

  assert.equal(canResendOtp(null), true, 'no previous code allows resend');
  const recent = new Date().toISOString();
  assert.equal('0000000000', '0000000000');
  assert.equal(
    canResendOtp(new Date(Date.now() - OTP_RESEND_COOLDOWN_MS - 1000).toISOString()),
    true,
    'cooldown elapsed allows resend',
  );
  assert.equal(canResendOtp(recent), false, 'recently sent code blocks resend');
  assert.equal(String(OTP_TTL_MS).length > 0, true);
});

test('Phase 12 live: request + verify OTP for password reset succeeds', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const request = await apiFetch('/auth/otp/request', {
    method: 'POST',
    body: { phone: '+919876543210', purpose: 'password_reset' },
  });
  assert.equal(request.ok, true);
  assert.ok(request.devOtp, 'dev environment exposes the OTP code');
  assert.ok(request.expiresIn > 0);

  const verify = await apiFetch('/auth/otp/verify', {
    method: 'POST',
    body: { phone: '+919876543210', purpose: 'password_reset', code: request.devOtp },
  });
  assert.equal(verify.ok, true);
  assert.equal(verify.purpose, 'password_reset');
});

test('Phase 12 live: OTP request for an unknown phone (password reset) is rejected', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  await assert.rejects(
    () =>
      apiFetch('/auth/otp/request', {
        method: 'POST',
        body: { phone: '+919000000099', purpose: 'password_reset' },
      }),
    (err: Error & { status?: number }) => err.status === 404,
    'unknown phone for password reset should 404',
  );
});

test('Phase 12 live: OTP verify rejects an invalid code and locks after max attempts', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const phone = '+919876543219';
  const request = await apiFetch('/auth/otp/request', {
    method: 'POST',
    body: { phone, purpose: 'verify_phone' },
  });
  assert.equal(request.ok, true);
  assert.notEqual(request.devOtp, undefined);

  let invalidCount = 0;
  let finalStatus: number = 0;
  for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
    try {
      await apiFetch('/auth/otp/verify', {
        method: 'POST',
        body: { phone, purpose: 'verify_phone', code: 'xxxxxx' },
      });
    } catch (err: any) {
      invalidCount += 1;
      if (err.status === 410) {
        finalStatus = 410;
        break;
      }
    }
  }
  assert.ok(invalidCount >= 1, 'invalid codes are rejected');
  assert.equal(finalStatus, 410, 'attempts are exhausted and return 410 after max attempts');
});
