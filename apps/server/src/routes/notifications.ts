import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware.js';

const router = Router();

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

router.post('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { userId, type, title, body, data } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  if (userId) {
    const profile = await queryOne<any>('SELECT id FROM public.profiles WHERE id = $1', [userId]);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    const notification = await createNotification({
      userId,
      type: type || 'ANNOUNCEMENT',
      title,
      body,
      data: data || {},
    });
    return res.status(201).json({ notification });
  }

  const residents = await query<any>(
    "SELECT id FROM public.profiles WHERE role = 'USER' AND status = 'ACTIVE'",
  );
  const created: any[] = [];
  for (const resident of residents) {
    created.push(
      await createNotification({
        userId: resident.id,
        type: type || 'ANNOUNCEMENT',
        title,
        body,
        data: data || {},
      }),
    );
  }
  return res.status(201).json({ notifications: created, count: created.length });
});

export default router;
