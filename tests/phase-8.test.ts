import test from 'node:test';
import assert from 'node:assert/strict';

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

const unique = () => `Phase8 ${Date.now()}`;

test('Phase 8: admin can log in and receive a JWT + user record', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: { phone: '+919999999999', password: 'Admin@123' },
  });
  assert.ok(data.token, 'should return a token');
  assert.ok(data.user, 'should return a user');
  assert.equal(data.user.phone, '+919999999999');
});

test('Phase 8: an authenticated admin can complete full event CRUD', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const { token } = await apiFetch('/auth/login', {
    method: 'POST',
    body: { phone: '+919999999999', password: 'Admin@123' },
  });

  const title = unique();
  const startAt = '2026-12-01T18:00:00+05:30';
  const endAt = '2026-12-01T22:00:00+05:30';

  const created = await apiFetch('/events', {
    method: 'POST',
    token,
    body: { year: 2026, title, description: 'Integration test event', venue: 'Test Hall', startAt, endAt, status: 'DRAFT' },
  });
  assert.equal(created.event.title, title);
  assert.ok(created.event.id, 'created event has an id');
  const eventId = created.event.id;

  try {
    const fetched = await apiFetch(`/events/${eventId}`, { token });
    assert.equal(fetched.event.id, eventId);
    assert.equal(fetched.event.title, title);

    const updated = await apiFetch(`/events/${eventId}`, {
      method: 'PUT',
      token,
      body: { title: `${title} (updated)` },
    });
    assert.equal(updated.event.title, `${title} (updated)`);

    const list = await apiFetch('/events', { token });
    const found = list.events.some((e: any) => e.id === eventId);
    assert.equal(found, true, 'created event should appear in the list');
  } finally {
    await apiFetch(`/events/${eventId}`, { method: 'DELETE', token });
  }

  const afterDelete = await apiFetch('/events', { token });
  const stillThere = afterDelete.events.some((e: any) => e.id === eventId);
  assert.equal(stillThere, false, 'event should be removed after delete');
});

test('Phase 8: unauthenticated write attempts to events are rejected', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  await assert.rejects(
    () =>
      apiFetch('/events', {
        method: 'POST',
        body: { year: 2026, title: 'nope', startAt: '2026-01-01T10:00:00Z', endAt: '2026-01-01T11:00:00Z' },
      }),
    (err: Error & { status?: number }) => err.status === 401 || err.status === 403,
  );
});
