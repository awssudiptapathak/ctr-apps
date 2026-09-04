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
      title: `Phase10 event ${title}`,
      description: 'phase10 slot test event',
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

test('Phase 10: resident submits a nomination without any slot selection', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const tag = `${Date.now()}`;
  const { program, eventId, adminToken, residentToken } = await createOpenProgram(tag);

  try {
    const submitted = await apiFetch('/nominations', {
      method: 'POST',
      token: residentToken,
      body: { programId: program.id, participantName: 'Slot Resident' },
    });
    assert.equal(submitted.nomination.status, 'PENDING', 'nomination starts as PENDING');
    assert.equal(submitted.nomination.allocatedSlot, null, 'no slot is allocated at submission time');
  } finally {
    await apiFetch(`/programs/${program.id}`, { method: 'DELETE', token: adminToken }).catch(() => {});
    await apiFetch(`/events/${eventId}`, { method: 'DELETE', token: adminToken }).catch(() => {});
  }
});

test('Phase 10: admin allocates a time slot to an approved nomination; resident sees it', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const tag = `${Date.now()}`;
  const { program, eventId, adminToken, residentToken } = await createOpenProgram(tag);

  const slotStartAt = '2026-11-01T18:30:00+05:30';
  const slotEndAt = '2026-11-01T19:00:00+05:30';

  try {
    const submitted = await apiFetch('/nominations', {
      method: 'POST',
      token: residentToken,
      body: { programId: program.id, participantName: 'Slot Resident' },
    });
    const nominationId = submitted.nomination.id;

    await apiFetch(`/nominations/${nominationId}/status`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'APPROVED' },
    });

    const allocated = await apiFetch(`/nominations/${nominationId}/slot`, {
      method: 'POST',
      token: adminToken,
      body: { startAt: slotStartAt, endAt: slotEndAt, venue: 'Stage A' },
    });
    assert.equal(allocated.nomination.status, 'SLOT_ALLOCATED', 'nomination moves to SLOT_ALLOCATED');
    assert.equal(
      new Date(allocated.nomination.allocatedSlot.startAt).getTime(),
      new Date(slotStartAt).getTime(),
      'slot start time matches',
    );
    assert.equal(allocated.nomination.allocatedSlot.venue, 'Stage A');

    const residentView = await apiFetch('/nominations', { token: residentToken });
    const seen = residentView.nominations.find((n: any) => n.id === nominationId);
    assert.equal(
      new Date(seen.allocatedSlot.startAt).getTime(),
      new Date(slotStartAt).getTime(),
      'resident sees allocated slot time',
    );
    assert.equal(seen.allocatedSlot.venue, 'Stage A', 'resident sees allocated slot venue');
  } finally {
    await apiFetch(`/programs/${program.id}`, { method: 'DELETE', token: adminToken }).catch(() => {});
    await apiFetch(`/events/${eventId}`, { method: 'DELETE', token: adminToken }).catch(() => {});
  }
});

test('Phase 10: a declined nomination cannot receive a slot', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const tag = `${Date.now()}`;
  const { program, eventId, adminToken, residentToken } = await createOpenProgram(tag);

  try {
    const submitted = await apiFetch('/nominations', {
      method: 'POST',
      token: residentToken,
      body: { programId: program.id, participantName: 'Rejected Resident' },
    });
    const nominationId = submitted.nomination.id;

    await apiFetch(`/nominations/${nominationId}/status`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'REJECTED' },
    });

    await assert.rejects(
      () =>
        apiFetch(`/nominations/${nominationId}/slot`, {
          method: 'POST',
          token: adminToken,
          body: { startAt: '2026-11-01T20:00:00+05:30', endAt: '2026-11-01T20:30:00+05:30', venue: 'Stage B' },
        }),
      (err: Error & { status?: number }) => err.status === 409,
      'slot allocation to a rejected nomination should be rejected',
    );
  } finally {
    await apiFetch(`/programs/${program.id}`, { method: 'DELETE', token: adminToken }).catch(() => {});
    await apiFetch(`/events/${eventId}`, { method: 'DELETE', token: adminToken }).catch(() => {});
  }
});
