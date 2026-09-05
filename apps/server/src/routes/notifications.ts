import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware.js';

const router = Router();
const REMINDER_TYPES = ['EVENT_REMINDER', 'PROGRAM_DEADLINE', 'NOMINATION_CLOSING', 'SLOT_CONFIRMATION', 'ANNOUNCEMENT'] as const;

function mapNotification(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data,
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<any> {
  const row = await queryOne<any>(
    `INSERT INTO public.notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.userId, input.type, input.title, input.body, input.data ? JSON.stringify(input.data) : '{}'],
  );
  return mapNotification(row);
}

async function notificationRecipients(audience: string, userId?: string) {
  if (userId) return [{ id: userId }];
  if (audience === 'ADMIN') {
    return query<any>("SELECT id FROM public.profiles WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND status = 'ACTIVE'");
  }
  if (audience === 'ALL') {
    return query<any>("SELECT id FROM public.profiles WHERE status = 'ACTIVE'");
  }
  return query<any>("SELECT id FROM public.profiles WHERE role = 'USER' AND status = 'ACTIVE'");
}

async function sendComposedNotification(input: {
  userId?: string;
  audience?: string;
  type?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const recipients = await notificationRecipients(input.audience || 'RESIDENT', input.userId);
  const notifications = [];
  for (const recipient of recipients) {
    notifications.push(await createNotification({
      userId: recipient.id,
      type: input.type || 'ANNOUNCEMENT',
      title: input.title,
      body: input.body,
      data: input.data,
    }));
  }
  return notifications;
}

function mapSchedule(row: any) {
  return {
    id: row.id,
    eventId: row.event_id,
    programId: row.program_id,
    eventTitle: row.event_title,
    programName: row.program_name,
    title: row.title,
    body: row.body,
    type: row.type,
    channel: row.channel,
    audience: row.audience,
    frequency: row.frequency,
    sendAt: row.send_at,
    active: row.active,
    lastSentAt: row.last_sent_at,
  };
}

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const isAdmin = req.role === 'ADMIN' || req.role === 'SUPER_ADMIN';
  const rows = isAdmin
    ? await query<any>('SELECT * FROM public.notifications ORDER BY created_at DESC')
    : await query<any>(
        'SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC',
        [req.userId],
      );
  const unreadCount = rows.filter((row: any) => !row.read_at).length;
  return res.json({
    notifications: rows.map(mapNotification),
    unreadCount,
    total: rows.length,
  });
});

router.post('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { userId, eventId, programId, audience, type, title, body, data } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  if (eventId || programId) {
    if (!eventId || !programId) {
      return res.status(400).json({ error: 'Select a published event and program together.' });
    }
    if (type && !REMINDER_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Unsupported notification type' });
    }
    const context = await queryOne<any>(
      `SELECT e.id AS event_id, e.title AS event_title, e.status AS event_status,
              p.id AS program_id, p.name AS program_name, p.status AS program_status,
              p.nomination_close_at
         FROM public.events e JOIN public.programs p ON p.event_id = e.id
        WHERE e.id = $1 AND p.id = $2`,
      [eventId, programId],
    );
    if (!context) return res.status(404).json({ error: 'Event or program not found' });
    if (context.event_status !== 'PUBLISHED' || context.program_status !== 'PUBLISHED') {
      return res.status(409).json({ error: 'Notifications can only target published events and programs.' });
    }
    if (type === 'NOMINATION_CLOSING' && !context.nomination_close_at) {
      return res.status(409).json({ error: 'The selected program has no nomination closing time.' });
    }
  }

  if (userId) {
    const profile = await queryOne<any>('SELECT id FROM public.profiles WHERE id = $1', [userId]);
    if (!profile) return res.status(404).json({ error: 'User not found' });
  }

  const created = await sendComposedNotification({
    userId,
    audience,
    type,
    title,
    body,
    data: { ...(data || {}), ...(eventId ? { eventId } : {}), ...(programId ? { programId } : {}) },
  });
  if (userId) return res.status(201).json({ notification: created[0] });
  return res.status(201).json({ notifications: created, count: created.length });
});

router.get('/schedules', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (_req, res) => {
  const rows = await query<any>(
    `SELECT s.*, e.title AS event_title, p.name AS program_name
       FROM public.notification_schedules s
       LEFT JOIN public.events e ON e.id = s.event_id
       LEFT JOIN public.programs p ON p.id = s.program_id
      ORDER BY s.send_at ASC`,
  );
  return res.json({ schedules: rows.map(mapSchedule) });
});

router.post('/schedules', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  const { eventId, programId, title, body, type, channel, audience, frequency, sendAt } = req.body || {};
  if (!title || !body || !sendAt) return res.status(400).json({ error: 'title, body and sendAt are required' });
  if (!eventId || !programId) return res.status(400).json({ error: 'Select a published event and program together.' });
  const reminderType = type || 'PROGRAM_DEADLINE';
  if (!REMINDER_TYPES.includes(reminderType)) {
    return res.status(400).json({ error: 'Unsupported reminder type' });
  }
  if (!['AD_HOC', 'WEEKLY', 'DAILY'].includes(frequency || 'AD_HOC')) {
    return res.status(400).json({ error: 'frequency must be AD_HOC, WEEKLY or DAILY' });
  }
  const context = await queryOne<any>(
    `SELECT e.status AS event_status, p.status AS program_status, p.nomination_close_at
       FROM public.programs p JOIN public.events e ON e.id = p.event_id
      WHERE p.id = $1 AND e.id = $2`,
    [programId, eventId],
  );
  if (!context || context.event_status !== 'PUBLISHED' || context.program_status !== 'PUBLISHED') {
    return res.status(409).json({ error: 'Select a published event and program.' });
  }
  if (reminderType === 'NOMINATION_CLOSING' && !context.nomination_close_at) {
    return res.status(409).json({ error: 'The selected program has no nomination closing time.' });
  }
  const row = await queryOne<any>(
    `INSERT INTO public.notification_schedules
      (event_id, program_id, title, body, type, channel, audience, frequency, send_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [eventId || null, programId || null, title.trim(), body.trim(), reminderType,
      channel || 'IN_APP', audience || 'RESIDENT', frequency || 'AD_HOC', sendAt, req.userId],
  );
  return res.status(201).json({ schedule: mapSchedule(row) });
});

router.delete('/schedules/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const row = await queryOne<any>('UPDATE public.notification_schedules SET active = false WHERE id = $1 RETURNING id', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Schedule not found' });
  return res.status(204).end();
});

export async function processDueNotificationSchedules(): Promise<number> {
  const due = await query<any>(
    `SELECT * FROM public.notification_schedules
      WHERE active = true AND send_at <= NOW()
      ORDER BY send_at ASC LIMIT 100`,
  );
  let sent = 0;
  for (const schedule of due) {
    await sendComposedNotification({
      audience: schedule.audience,
      type: schedule.type,
      title: schedule.title,
      body: schedule.body,
      data: { scheduleId: schedule.id, eventId: schedule.event_id, programId: schedule.program_id },
    });
    const recurring = schedule.frequency !== 'AD_HOC';
    await query(
      `UPDATE public.notification_schedules
          SET last_sent_at = NOW(), send_at = CASE WHEN $2 THEN send_at + ($3 || ' days')::interval ELSE send_at END,
              active = CASE WHEN $2 THEN true ELSE false END
        WHERE id = $1`,
      [schedule.id, recurring, schedule.frequency === 'WEEKLY' ? 7 : 1],
    );
    sent += 1;
  }
  return sent;
}

router.post('/schedules/process-due', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (_req, res) => {
  return res.json({ processed: await processDueNotificationSchedules() });
});

router.put('/:id/read', requireAuth, async (req: AuthedRequest, res) => {
  const isAdmin = req.role === 'ADMIN' || req.role === 'SUPER_ADMIN';
  const existing = await queryOne<any>('SELECT * FROM public.notifications WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Notification not found' });
  if (!isAdmin && existing.user_id !== req.userId) {
    return res.status(403).json({ error: 'Not allowed to read this notification' });
  }
  const row = await queryOne<any>(
    `UPDATE public.notifications SET read_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id],
  );
  return res.json({ notification: mapNotification(row) });
});

export default router;
