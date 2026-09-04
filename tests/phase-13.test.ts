import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMobile,
  buildMsg91SendUrl,
  sendViaMsg91,
  deliverOtp,
} from '../apps/server/src/otpDelivery.js';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ctrcms',
  user: 'ctrcms',
  password: 'ctrcms123',
});

function makeFetchResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

test('Phase 13 unit: normalizeMobile strips + and non-digits', () => {
  assert.equal(normalizeMobile('+919876543210'), '919876543210');
  assert.equal(normalizeMobile('91 98765 43210'), '919876543210');
  assert.equal(normalizeMobile('919876543210'), '919876543210');
});

test('Phase 13 unit: buildMsg91SendUrl includes authkey, template, mobile, otp, expiry', () => {
  const url = buildMsg91SendUrl({
    authKey: 'key123',
    templateId: 'tpl456',
    mobile: '919876543210',
    code: '123456',
    expiry: 10,
  });
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, 'https://control.msg91.com/api/v5/otp');
  assert.equal(parsed.searchParams.get('authkey'), 'key123');
  assert.equal(parsed.searchParams.get('template_id'), 'tpl456');
  assert.equal(parsed.searchParams.get('mobile'), '919876543210');
  assert.equal(parsed.searchParams.get('otp'), '123456');
  assert.equal(parsed.searchParams.get('otp_expiry'), '10');
});

test('Phase 13 unit: sendViaMsg91 returns success with provider id on 2xx success', async () => {
  const prevKey = process.env.MSG91_AUTH_KEY;
  const prevTpl = process.env.MSG91_OTP_TEMPLATE_ID;
  process.env.MSG91_AUTH_KEY = 'key123';
  process.env.MSG91_OTP_TEMPLATE_ID = 'tpl456';
  try {
    const fetchImpl: any = async () => makeFetchResponse(200, { type: 'success', request_id: 'req-1' });
    const result = await sendViaMsg91({ phone: '+919876543210', code: '123456', purpose: 'password_reset' }, fetchImpl);
    assert.equal(result.sent, true);
    assert.equal(result.providerMessageId, 'req-1');
  } finally {
    if (prevKey) process.env.MSG91_AUTH_KEY = prevKey;
    if (prevTpl) process.env.MSG91_OTP_TEMPLATE_ID = prevTpl;
  }
});

test('Phase 13 unit: sendViaMsg91 reports failure on non-success response', async () => {
  const prevKey = process.env.MSG91_AUTH_KEY;
  const prevTpl = process.env.MSG91_OTP_TEMPLATE_ID;
  process.env.MSG91_AUTH_KEY = 'key123';
  process.env.MSG91_OTP_TEMPLATE_ID = 'tpl456';
  try {
    const fetchImpl: any = async () => makeFetchResponse(200, { type: 'failure', message: 'Invalid auth key' });
    const result = await sendViaMsg91({ phone: '+919876543210', code: '123456', purpose: 'password_reset' }, fetchImpl);
    assert.equal(result.sent, false);
    assert.match(String(result.error), /Invalid auth key/);
  } finally {
    if (prevKey) process.env.MSG91_AUTH_KEY = prevKey;
    if (prevTpl) process.env.MSG91_OTP_TEMPLATE_ID = prevTpl;
  }
});

test('Phase 13 unit: sendViaMsg91 reports failure when env is not configured', async () => {
  const prevKey = process.env.MSG91_AUTH_KEY;
  const prevTpl = process.env.MSG91_OTP_TEMPLATE_ID;
  delete process.env.MSG91_AUTH_KEY;
  delete process.env.MSG91_OTP_TEMPLATE_ID;
  try {
    const result = await sendViaMsg91({ phone: '+919876543210', code: '123456', purpose: 'password_reset' }, fetch as any);
    assert.equal(result.sent, false);
    assert.match(String(result.error), /not configured/);
  } finally {
    if (prevKey) process.env.MSG91_AUTH_KEY = prevKey;
    if (prevTpl) process.env.MSG91_OTP_TEMPLATE_ID = prevTpl;
  }
});

test('Phase 13 live: deliverOtp with mock provider records a whatsapp_messages row', async (t) => {
  let dbOk = true;
  try {
    await pool.query('SELECT 1');
  } catch {
    dbOk = false;
  }
  if (!dbOk) {
    await pool.end();
    return t.skip('Database not reachable');
  }
  const prevProvider = process.env.SMS_PROVIDER;
  delete process.env.SMS_PROVIDER; // default = mock
  try {
    const phone = '+919876543333';
    const code = '654321';
    await deliverOtp({ phone, code, purpose: 'password_reset' });
    const rows = await pool.query(
      "SELECT provider, status, error FROM public.whatsapp_messages WHERE provider = 'mock' AND error = $1 ORDER BY created_at DESC LIMIT 1",
      [`OTP ${code} for ${phone} (mock provider)`],
    );
    assert.ok(rows.rows.length >= 1, 'a mock delivery row was written');
    assert.equal(rows.rows[0].provider, 'mock');
    assert.equal(rows.rows[0].status, 'SENT');
  } finally {
    if (prevProvider) process.env.SMS_PROVIDER = prevProvider;
    await pool.end();
  }
});
