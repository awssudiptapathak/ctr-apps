import test from 'node:test';
import assert from 'node:assert/strict';

import { createApiClient, type ApiClient } from '../packages/shared/src/index';

type FetchArg = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

function installFetchStub(respond: (url: FetchArg, init?: FetchInit) => Promise<{ status: number; body?: unknown }>) {
  const calls: Array<{ url: string; init?: FetchInit }> = [];
  const originalFetch = globalThis.fetch;

  (globalThis as any).fetch = async (url: FetchArg, init?: FetchInit) => {
    calls.push({ url: String(url), init });
    const res = await respond(url, init);
    const body = res.body === undefined ? '' : JSON.stringify(res.body);
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      json: async () => JSON.parse(body),
      text: async () => body,
    } as Response;
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

test('Phase 7: GET requests send an Authorization Bearer header when a token is available', async () => {
  const stub = installFetchStub(async () => ({ status: 200, body: { ok: true } }));
  try {
    const client = createApiClient({ baseUrl: 'http://localhost:4200/api', getToken: () => 'abc123' });
    await client.get('/events');
    assert.equal(stub.calls[0].init?.headers?.Authorization, 'Bearer abc123');
  } finally {
    stub.restore();
  }
});

test('Phase 7: GET omits Authorization header when no token is provided', async () => {
  const stub = installFetchStub(async () => ({ status: 200, body: { ok: true } }));
  try {
    const client = createApiClient({ baseUrl: 'http://localhost:4200/api', getToken: () => null });
    await client.get('/events');
    const headers = stub.calls[0].init?.headers as Record<string, string> | undefined;
    assert.equal(headers?.Authorization, undefined);
  } finally {
    stub.restore();
  }
});

test('Phase 7: base URL trailing slash and path are joined correctly', async () => {
  const stub = installFetchStub(async () => ({ status: 200, body: { ok: true } }));
  try {
    const client = createApiClient({ baseUrl: 'http://localhost:4200/api/' });
    await client.get('/events/evt-1');
    assert.equal(stub.calls[0].url, 'http://localhost:4200/api/events/evt-1');
  } finally {
    stub.restore();
  }
});

test('Phase 7: POST sends JSON body with a content-type header', async () => {
  const stub = installFetchStub(async () => ({ status: 201, body: { id: 'evt-1' } }));
  try {
    const client = createApiClient({ baseUrl: 'http://localhost:4200/api' });
    await client.post('/events', { title: 'Holi' });
    const init = stub.calls[0].init!;
    assert.equal(init.method, 'POST');
    assert.equal(init.body, JSON.stringify({ title: 'Holi' }));
    assert.equal((init.headers as Record<string, string>)['Content-Type'], 'application/json');
  } finally {
    stub.restore();
  }
});

test('Phase 7: DELETE sends the DELETE verb', async () => {
  const stub = installFetchStub(async () => ({ status: 204, body: undefined }));
  try {
    const client = createApiClient({ baseUrl: 'http://localhost:4200/api' });
    await client.delete('/events/evt-1');
    assert.equal(stub.calls[0].init?.method, 'DELETE');
  } finally {
    stub.restore();
  }
});

test('Phase 7: a 204 response resolves to undefined', async () => {
  const stub = installFetchStub(async () => ({ status: 204, body: undefined }));
  try {
    const client = createApiClient({ baseUrl: 'http://localhost:4200/api' });
    const result = await client.delete('/events/evt-1');
    assert.equal(result, undefined);
  } finally {
    stub.restore();
  }
});

test('Phase 7: error responses throw with the server error message and status', async () => {
  const stub = installFetchStub(async () => ({ status: 401, body: { error: 'Unauthorized' } }));
  try {
    const client = createApiClient({ baseUrl: 'http://localhost:4200/api' });
    await assert.rejects(
      () => client.get('/auth/me'),
      (err: Error & { status?: number }) => {
        assert.equal(err.message, 'Unauthorized');
        assert.equal(err.status, 401);
        return true;
      },
    );
  } finally {
    stub.restore();
  }
});

test('Phase 7: error responses without a parsed body still expose the status code', async () => {
  const stub = installFetchStub(async () => ({ status: 500, body: undefined }));
  try {
    const client = createApiClient({ baseUrl: 'http://localhost:4200/api' });
    await assert.rejects(
      () => client.get('/events'),
      (err: Error & { status?: number }) => {
        assert.equal(err.status, 500);
        assert.equal(/Request failed/.test(err.message), true);
        return true;
      },
    );
  } finally {
    stub.restore();
  }
});
