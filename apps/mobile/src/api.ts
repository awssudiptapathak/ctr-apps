import { createApiClient } from '@ctr-cms/shared';

let token: string | null = null;

export function setAuthToken(value: string | null) {
  token = value;
}

export function getAuthToken() {
  return token;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4200/api';

export const api = createApiClient({
  baseUrl: API_URL,
  getToken: () => token,
});
