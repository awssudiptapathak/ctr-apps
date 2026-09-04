import { createHash, randomInt } from 'node:crypto';

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashOtpCode(code: string, salt: string): string {
  return createHash('sha256').update(`${code}:${salt}`).digest('hex');
}

export function verifyOtpHash(code: string, salt: string, expected: string): boolean {
  const candidate = hashOtpCode(code, salt);
  return candidate.length === expected.length && candidate === expected;
}

export function isOtpUsable(
  expiresAt: string,
  attempts: number,
  maxAttempts: number,
  at: Date = new Date(),
): boolean {
  const expired = new Date(expiresAt).getTime() - at.getTime() <= 0;
  return !expired && attempts < maxAttempts;
}

export function canResendOtp(
  lastCreatedAt: string | null,
  at: Date = new Date(),
): boolean {
  if (!lastCreatedAt) return true;
  return at.getTime() - new Date(lastCreatedAt).getTime() >= OTP_RESEND_COOLDOWN_MS;
}

export function generateOtpSalt(): string {
  return randomInt(100000000, 1000000000).toString();
}
