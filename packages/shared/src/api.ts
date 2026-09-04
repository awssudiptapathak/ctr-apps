export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null;
}

export interface ApiError {
  error: string;
  status?: number;
}

class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getToken = options.getToken || (() => null);
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const body = (await res.json()) as ApiError;
        if (body?.error) message = body.error;
      } catch {
        /* ignore */
      }
      const err = new Error(message) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }

    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export type { ApiClient };

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}
