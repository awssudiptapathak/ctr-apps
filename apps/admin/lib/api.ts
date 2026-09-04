import { createApiClient } from '@ctr-cms/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4200/api';

const TOKEN_KEY = 'ctr_token';
const USER_KEY = 'ctr_user';

export const api = createApiClient({
  baseUrl: API_URL,
  getToken: () => (typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null),
});

export function setAdminToken(token: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getAdminToken(): string | null {
  return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
}

export interface AdminUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  flatNo: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: string;
}

export function setAdminUser(user: AdminUser) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function clearAdminAuth() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }
}

