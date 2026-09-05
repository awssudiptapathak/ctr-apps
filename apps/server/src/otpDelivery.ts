import { query } from './db.js';
import { OTP_TTL_MS } from './otp.js';
import nodemailer from 'nodemailer';

export type OtpProvider = 'mock' | 'msg91' | 'email';

export interface DeliverOtpInput {
  phone: string;
  code: string;
  purpose: string;
  email?: string;
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

export interface EmailSendResult {
  sent: boolean;
  providerMessageId?: string;
  email?: string;
  error?: string;
}

interface GmailTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GmailSendResponse {
  id?: string;
  error?: { message?: string };
}

export async function resolveProfileEmail(phone: string): Promise<string | null> {
  const rows = await query<{ email: string | null }>(
    'SELECT email FROM public.profiles WHERE phone = $1',
    [phone],
  );
  return rows[0]?.email || null;
}

function getGmailConfig(): {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sender: string;
} | null {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || '';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN || '';
  const sender = process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || '';
  if (!clientId || !clientSecret || !refreshToken || !sender) {
    return null;
  }
  return { clientId, clientSecret, refreshToken, sender };
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function sendViaGmail(
  input: DeliverOtpInput,
  fetchImpl: typeof fetch = fetch,
): Promise<EmailSendResult> {
  const config = getGmailConfig();
  if (!config) {
    return { sent: false, error: 'Gmail API credentials are not configured' };
  }

  const recipient = input.email || (await resolveProfileEmail(input.phone));
  if (!recipient) {
    return { sent: false, error: 'No email on file for this phone' };
  }

  try {
    const tokenResponse = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const tokenBody = (await tokenResponse.json()) as GmailTokenResponse;
    if (!tokenResponse.ok || !tokenBody.access_token) {
      return {
        sent: false,
        error: tokenBody.error_description || tokenBody.error || `Gmail token request failed (${tokenResponse.status})`,
      };
    }

    const text = `Your CTR-CMS OTP is ${input.code}. It is valid for ${Math.floor(OTP_TTL_MS / 60000)} minutes.`;
    const rawMessage = [
      `From: ${config.sender}`,
      `To: ${recipient}`,
      'Subject: Your CTR-CMS verification code',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      text,
    ].join('\r\n');
    const sendResponse = await fetchImpl('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenBody.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ raw: encodeBase64Url(rawMessage) }),
    });
    const sendBody = (await sendResponse.json()) as GmailSendResponse;
    if (!sendResponse.ok || !sendBody.id) {
      return {
        sent: false,
        error: sendBody.error?.message || `Gmail send failed (${sendResponse.status})`,
      };
    }
    return { sent: true, providerMessageId: sendBody.id, email: recipient };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : 'Gmail API request failed' };
  }
}

export async function sendViaEmail(input: DeliverOtpInput): Promise<EmailSendResult> {
  if (getGmailConfig()) {
    return sendViaGmail(input);
  }

  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.EMAIL_FROM || user;
  if (!user || !pass) {
    return { sent: false, error: 'SMTP_USER / SMTP_PASS not configured' };
  }

  const recipient = input.email || (await resolveProfileEmail(input.phone));
  if (!recipient) {
    return { sent: false, error: 'No email on file for this phone' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject: 'Your CTR-CMS verification code',
      text: `Your CTR-CMS OTP is ${input.code}. It is valid for ${Math.floor(OTP_TTL_MS / 60000)} minutes.`,
      html: `<p>Your CTR-CMS verification code is <strong>${input.code}</strong>.</p><p>It is valid for ${Math.floor(OTP_TTL_MS / 60000)} minutes.</p>`,
    });
    return { sent: true, providerMessageId: info.messageId, email: recipient };
  } catch (e: any) {
    return { sent: false, error: e?.message || 'SMTP send failed' };
  }
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
    if (!result.sent) {
      throw new Error(result.error || 'MSG91 delivery failed');
    }
    return;
  }

  if (provider === 'email') {
    const result = await sendViaEmail(input);
    await query(
      `INSERT INTO public.whatsapp_messages (provider, idempotency_key, status, provider_message_id, error)
       VALUES ('email', $1, $2, $3, $4)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        idempotencyKey,
        result.sent ? 'SENT' : 'FAILED',
        result.providerMessageId || null,
        result.sent ? null : result.error || null,
      ],
    ).catch(() => {});
    if (!result.sent) {
      throw new Error(result.error || 'Email delivery failed');
    }
    return;
  }

  await query(
    `INSERT INTO public.whatsapp_messages (provider, idempotency_key, status, error)
     VALUES ('mock', $1, 'SENT', $2)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [idempotencyKey, `OTP ${input.code} for ${input.phone} (mock provider)`],
  ).catch(() => {});
}
