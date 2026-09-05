import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { runMigrations } from './migrate.js';
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import programsRoutes from './routes/programs.js';
import nominationsRoutes from './routes/nominations.js';
import notificationsRoutes, { processDueNotificationSchedules } from './routes/notifications.js';
import usersRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import publicRoutes from './routes/public.js';
import galleryRoutes from './routes/gallery.js';

const app = express();

if (config.isProduction && config.jwtSecret === 'ctr-cms-dev-secret-change-me') {
  console.error('FATAL: JWT_SECRET must be set in production.');
  process.exit(1);
}

const corsOrigin = config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((origin) => origin.trim());
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '5mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/programs', programsRoutes);
app.use('/api/nominations', nominationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', publicRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, async () => {
  console.log(`CTR-CMS API listening on http://localhost:${config.port}`);
  try {
    await runMigrations();
  } catch (e: any) {
    console.error('Migration error:', e.message);
  }
  const processReminders = async () => {
    try {
      const processed = await processDueNotificationSchedules();
      if (processed > 0) console.log(`Processed ${processed} scheduled notification(s).`);
    } catch (error) {
      console.error('Failed to process scheduled notifications:', error);
    }
  };
  await processReminders();
  setInterval(processReminders, 60_000);
});
