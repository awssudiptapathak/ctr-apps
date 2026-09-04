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

async function createOpenProgram(title: string): Promise<{ program: any; eventId: string; adminToken: string; residentToken: string }> {
  const admin = await apiFetch('/auth/login', {
    method: 'POST',
    body: { phone: '+919999999999', password: 'Admin@123' },
  });
  const resident = await apiFetch('/auth/login', {
    method: 'POST',
    body: { phone: '+919876543210', password: 'Welcome@123' },
  });

  const created = await apiFetch('/events', {
    method: 'POST',
    token: admin.token,
    body: {
      year: 2026,
      title: `Nom event ${title}`,
      description: 'nom test event',
      venue: 'Test Hall',
      startAt: '2026-11-01T18:00:00+05:30',
      endAt: '2026-11-01T22:00:00+05:30',
      status: 'PUBLISHED',
    },
  });
  const eventId = created.event.id;

  const prog = await apiFetch('/programs', {
    method: 'POST',
    token: admin.token,
    body: {
      eventId,
      name: `Program ${title}`,
      status: 'PUBLISHED',
      nominationOpenAt: '2026-01-01T00:00:00+05:30',
      nominationCloseAt: '2030-12-31T23:59:00+05:30',
      maxParticipants: 10,
    },
  });

  return { program: prog.program, eventId, adminToken: admin.token, residentToken: resident.token };
}

test('Phase 8: resident nomination respects window and duplicate rules end-to-end', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const tag = `${Date.now()}`;
  const { program, eventId, adminToken, residentToken } = await createOpenProgram(tag);

  try {
    const first = await apiFetch('/nominations', {
      method: 'POST',
      token: residentToken,
      body: { programId: program.id, participantName: 'Resident Tester' },
    });
    assert.equal(first.nomination.programId, program.id, 'first nomination succeeds');

    await assert.rejects(
      () =>
        apiFetch('/nominations', {
          method: 'POST',
          token: residentToken,
          body: { programId: program.id, participantName: 'Resident Tester' },
        }),
      (err: Error & { status?: number }) => err.status === 409,
      'duplicate nomination should be rejected',
    );

    const mine = await apiFetch('/nominations', { token: residentToken });
    const mineFiltered = mine.nominations.filter((n: any) => n.programId === program.id);
    assert.equal(mineFiltered.length, 1, 'resident sees exactly one nomination for the program');
  } finally {
    await apiFetch(`/programs/${program.id}`, { method: 'DELETE', token: adminToken }).catch(() => {});
    await apiFetch(`/events/${eventId}`, { method: 'DELETE', token: adminToken }).catch(() => {});
  }
});

test('Phase 8: an event with associated programs cannot be deleted until those programs are removed', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const tag = `${Date.now()}`;
  const { program, eventId, adminToken } = await createOpenProgram(tag);

  try {
    await assert.rejects(
      () => apiFetch(`/events/${eventId}`, { method: 'DELETE', token: adminToken }),
      (err: Error & { status?: number }) => err.status === 409,
      'deleting an event that still has programs should be rejected',
    );

    await apiFetch(`/programs/${program.id}`, { method: 'DELETE', token: adminToken });
    const deleted = await apiFetch(`/events/${eventId}`, { method: 'DELETE', token: adminToken });
    assert.equal(deleted, undefined, 'event deletion succeeds after its programs are removed');
  } finally {
    await apiFetch(`/events/${eventId}`, { method: 'DELETE', token: adminToken }).catch(() => {});
  }
});

test('Phase 8: an admin can review and update a resident nomination status', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const tag = `${Date.now()}`;
  const { program, eventId, adminToken, residentToken } = await createOpenProgram(tag);

  try {
    const submitted = await apiFetch('/nominations', {
      method: 'POST',
      token: residentToken,
      body: { programId: program.id, participantName: 'Resident Tester' },
    });
    const nominationId = submitted.nomination.id;

    const all = await apiFetch('/nominations', { token: adminToken });
    const target = all.nominations.find((n: any) => n.id === nominationId);
    assert.ok(target, 'admin sees the resident nomination in the full list');
    assert.equal(target.status, 'PENDING');

    const decision = await apiFetch(`/nominations/${nominationId}/status`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'APPROVED' },
    });
    assert.equal(decision.nomination.status, 'APPROVED');

    const residentView = await apiFetch('/nominations', { token: residentToken });
    const seen = residentView.nominations.find((n: any) => n.id === nominationId);
    assert.equal(seen.status, 'APPROVED', 'resident sees the updated status');
  } finally {
    await apiFetch(`/programs/${program.id}`, { method: 'DELETE', token: adminToken }).catch(() => {});
    await apiFetch(`/events/${eventId}`, { method: 'DELETE', token: adminToken }).catch(() => {});
  }
});




