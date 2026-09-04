import { Router } from 'express';
import { queryOne } from '../db.js';
import { requireAuth, requireRole } from '../middleware.js';

const router = Router();

router.get('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (_req, res) => {
  const [users, events, programs, nominations, tickets, pendingRequests] = await Promise.all([
    queryOne<{ count: string }>("SELECT count(*)::text AS count FROM public.profiles"),
    queryOne<{ count: string }>("SELECT count(*)::text AS count FROM public.events"),
    queryOne<{ count: string }>("SELECT count(*)::text AS count FROM public.programs"),
    queryOne<{ count: string }>("SELECT count(*)::text AS count FROM public.nominations"),
    queryOne<{ count: string }>("SELECT count(*)::text AS count FROM public.tickets"),
    queryOne<{ count: string }>("SELECT count(*)::text AS count FROM public.admin_requests WHERE status = 'PENDING'"),
  ]);

  return res.json({
    residents: parseInt(users?.count || '0'),
    events: parseInt(events?.count || '0'),
    programs: parseInt(programs?.count || '0'),
    nominations: parseInt(nominations?.count || '0'),
    tickets: parseInt(tickets?.count || '0'),
    pendingAdminRequests: parseInt(pendingRequests?.count || '0'),
  });
});

export default router;
