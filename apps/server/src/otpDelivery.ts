import { query } from './db.js';
import { OTP_TTL_MS } from './otp.js';

export type OtpProvider = 'mock' | 'msg91';

export interface DeliverOtpInput {
  phone: string;
  code: string;
  purpose: string;
}

export function normalizeMobile(phone: string): string {
  return phone.replace(/^\+/, '').replace(/[^\d]/g, '');
}

export function buildMsg91SendUrl(opts: {
  authKey: string;
  templateId: string;
  mobile: string;
  code: string;
  expiry?: number;
}): string {
  const p = new URLSearchParams();
  p.set('template_id', opts.templateId);
  p.set('mobile', opts.mobile);
  p.set('authkey', opts.authKey);
  p.set('otp', opts.code);
  p.set('otp_expiry', String(opts.expiry ?? Math.floor(OTP_TTL_MS / 1000)));
  return `https://control.msg91.com/api/v5/otp?${p.toString()}`;
}

export interface Msg91SendResult {
  sent: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function sendViaMsg91(
  input: DeliverOtpInput,
  fetchImpl: typeof fetch = fetch,
): Promise<Msg91SendResult> {
  const authKey = process.env.MSG91_AUTH_KEY || '';
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID || '';
  if (!authKey || !templateId) {
    return { sent: false, error: 'MSG91_AUTH_KEY / MSG91_OTP_TEMPLATE_ID not configured' };
  }
  const url = buildMsg91SendUrl({
    authKey,
    templateId,
    mobile: normalizeMobile(input.phone),
    code: input.code,
  });
  try {
    const res = await fetchImpl(url);
    const body = await res.text();
    let parsed: { type?: string; request_id?: string; message?: string } = {};
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = {};
    }
    if (!res.ok || parsed.type !== 'success') {
      return { sent: false, error: parsed.message || `MSG91 send failed (${res.status})` };
    }
    return { sent: true, providerMessageId: parsed.request_id };
  } catch (e: any) {
    return { sent: false, error: e?.message || 'MSG91 network error' };
  }
}

export async function deliverOtp(
  input: DeliverOtpInput,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<void> {
  const idempotencyKey = `otp:${normalizeMobile(input.phone)}:${Date.now()}`;
  const provider: OtpProvider = (process.env.SMS_PROVIDER as OtpProvider) || 'mock';

  if (provider === 'msg91') {
    const result = await sendViaMsg91(input, opts.fetchImpl);
    await query(
      `INSERT INTO public.whatsapp_messages (provider, idempotency_key, status, provider_message_id, error)
       VALUES ('msg91', $1, $2, $3, $4)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        idempotencyKey,
        result.sent ? 'SENT' : 'FAILED',
        result.providerMessageId || null,
        result.sent ? null : result.error || null,
      ],
    ).catch(() => {});
    return;
  }

  await query(
    `INSERT INTO public.whatsapp_messages (provider, idempotency_key, status, error)
     VALUES ('mock', $1, 'SENT', $2)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [idempotencyKey, `OTP ${input.code} for ${input.phone} (mock provider)`],
  ).catch(() => {});
}
