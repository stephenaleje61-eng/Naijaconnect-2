import path from 'node:path';
import fs from 'node:fs';
import express, { type Express } from 'express';
import authRoutes from './routes/auth.ts';
import usersRoutes from './routes/users.ts';
import postsRoutes from './routes/posts.ts';
import storiesRoutes from './routes/stories.ts';
import chatsRoutes from './routes/chats.ts';
import friendsRoutes from './routes/friends.ts';
import notificationsRoutes from './routes/notifications.ts';
import groupsRoutes from './routes/groups.ts';
import adminRoutes from './routes/admin.ts';
import uploadRoutes from './routes/upload.ts';
import { getDb } from './db.ts';

export function createApp(): Express {
  const app = express();

  // Initialize DB
  getDb();

  // Middleware
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Static uploads directory (supported locally and in serverless /tmp fallback)
  const uploadsDir = process.env.VERCEL
    ? path.resolve('/tmp', 'uploads')
    : path.resolve(process.cwd(), 'data', 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch {
      // ignore
    }
  }
  app.use(['/uploads', '/api/uploads'], express.static(uploadsDir));
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  // Health check & API root endpoint
  app.get(['/api', '/api/health', '/health'], (_req, res) => {
    res.json({
      status: 'ok',
      service: 'NaijaConnect API',
      environment: process.env.VERCEL ? 'vercel-serverless' : 'node-express',
      time: new Date().toISOString()
    });
  });

  // Public announcements endpoint (doesn't trigger 401/403 for visitors)
  const announcementsHandler = (_req: express.Request, res: express.Response) => {
    try {
      const db = getDb();
      const active = (db.announcements || []).filter(a => a.active);
      res.json(active);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      res.json([]);
    }
  };
  app.get(['/api/announcements', '/announcements'], announcementsHandler);

  // Mount API routes under /api/*
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/posts', postsRoutes);
  app.use('/api/stories', storiesRoutes);
  app.use('/api/chats', chatsRoutes);
  app.use('/api/friends', friendsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/groups', groupsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);

  // Also mount without /api prefix for Vercel rewrites that strip the /api prefix
  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/posts', postsRoutes);
  app.use('/stories', storiesRoutes);
  app.use('/chats', chatsRoutes);
  app.use('/friends', friendsRoutes);
  app.use('/notifications', notificationsRoutes);
  app.use('/groups', groupsRoutes);
  app.use('/admin', adminRoutes);
  app.use('/upload', uploadRoutes);

  // Global API error handler ensuring clean JSON errors
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(err.status || 500).json({
      error: typeof err.message === 'string' ? err.message : 'An unexpected server error occurred.'
    });
  });

  return app;
}

const defaultApp = createApp();
export default defaultApp;
