import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import programsRoutes from './routes/programs.js';
import nominationsRoutes from './routes/nominations.js';
import notificationsRoutes from './routes/notifications.js';
import adminRequestsRoutes from './routes/adminRequests.js';
import publicRoutes from './routes/public.js';

const app = express();

if (config.isProduction && config.jwtSecret === 'ctr-cms-dev-secret-change-me') {
  console.error('FATAL: JWT_SECRET must be set in production.');
  process.exit(1);
}

const corsOrigin = config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((origin) => origin.trim());
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/programs', programsRoutes);
app.use('/api/nominations', nominationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin-requests', adminRequestsRoutes);
app.use('/api', publicRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, () => {
  console.log(`CTR-CMS API listening on http://localhost:${config.port}`);
});
