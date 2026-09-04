import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import programsRoutes from './routes/programs.js';
import nominationsRoutes from './routes/nominations.js';
import notificationsRoutes from './routes/notifications.js';
import publicRoutes from './routes/public.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/programs', programsRoutes);
app.use('/api/nominations', nominationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', publicRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, () => {
  console.log(`CTR-CMS API listening on http://localhost:${config.port}`);
});
