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
      title: `Phase11 event ${title}`,
      description: 'phase11 notification event',
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

test('Phase 11: slot allocation auto-notifies the resident and appears unread', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const tag = `${Date.now()}`;
  const { program, eventId, adminToken, residentToken } = await createOpenProgram(tag);

  try {
    const submitted = await apiFetch('/nominations', {
      method: 'POST',
      token: residentToken,
      body: { programId: program.id, participantName: 'Notify Resident' },
    });
    const nominationId = submitted.nomination.id;
    const residentUserId = submitted.nomination.userId;

    await apiFetch(`/nominations/${nominationId}/status`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'APPROVED' },
    });
    const allocated = await apiFetch(`/nominations/${nominationId}/slot`, {
      method: 'POST',
      token: adminToken,
      body: { startAt: '2026-11-01T18:30:00+05:30', endAt: '2026-11-01T19:00:00+05:30', venue: 'Stage A' },
    });
    assert.equal(allocated.nomination.status, 'SLOT_ALLOCATED');

    const residentInbox = await apiFetch('/notifications', { token: residentToken });
    assert.ok(residentInbox.unreadCount >= 1, 'resident has at least one unread notification');
    const slotNote = residentInbox.notifications.find((n: any) => n.type === 'SLOT_ALLOCATED');
    assert.ok(slotNote, 'resident received a SLOT_ALLOCATED notification');
    assert.equal(slotNote.readAt, null, 'notification starts unread');

    const marked = await apiFetch(`/notifications/${slotNote.id}/read`, { method: 'PUT', token: residentToken });
    assert.ok(marked.notification.readAt, 'notification becomes read after marking');

    const afterRead = await apiFetch('/notifications', { token: residentToken });
    const readSlotNote = afterRead.notifications.find((n: any) => n.id === slotNote.id);
    assert.ok(readSlotNote.readAt, 'resident sees the notification as read');
  } finally {
    await apiFetch(`/programs/${program.id}`, { method: 'DELETE', token: adminToken }).catch(() => {});
    await apiFetch(`/events/${eventId}`, { method: 'DELETE', token: adminToken }).catch(() => {});
  }
});

test('Phase 11: an admin can send a notification to a specific resident', async (t) => {
  if (!(await serverIsReachable())) return t.skip('API server not reachable');

  const tag = `${Date.now()}`;
  const { program, eventId, adminToken, residentToken } = await createOpenProgram(tag);

  try {
    const submitted = await apiFetch('/nominations', {
      method: 'POST',
      token: residentToken,
      body: { programId: program.id, participantName: 'Notify Resident 2' },
    });
    const residentUserId = submitted.nomination.userId;

    const sent = await apiFetch('/notifications', {
      method: 'POST',
      token: adminToken,
      body: { userId: residentUserId, type: 'ANNOUNCEMENT', title: 'Cultural Evening', body: 'Join us at the main hall.' },
    });
    assert.equal(sent.notification.userId, residentUserId);
    assert.equal(sent.notification.title, 'Cultural Evening');

    const inbox = await apiFetch('/notifications', { token: residentToken });
    const found = inbox.notifications.find((n: any) => n.id === sent.notification.id);
    assert.ok(found, 'resident receives the admin-sent notification');
  } finally {
    await apiFetch(`/programs/${program.id}`, { method: 'DELETE', token: adminToken }).catch(() => {});
    await apiFetch(`/events/${eventId}`, { method: 'DELETE', token: adminToken }).catch(() => {});
  }
});
