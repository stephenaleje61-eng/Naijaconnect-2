import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { setupWebSocket } from './server/socket.ts';
import authRoutes from './server/routes/auth.ts';
import usersRoutes from './server/routes/users.ts';
import postsRoutes from './server/routes/posts.ts';
import storiesRoutes from './server/routes/stories.ts';
import chatsRoutes from './server/routes/chats.ts';
import friendsRoutes from './server/routes/friends.ts';
import notificationsRoutes from './server/routes/notifications.ts';
import groupsRoutes from './server/routes/groups.ts';
import adminRoutes from './server/routes/admin.ts';
import uploadRoutes from './server/routes/upload.ts';
import { getDb } from './server/db.ts';

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Initialize DB
  getDb();

  // Middleware
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Static uploads
  const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Public announcements endpoint (accessible to all users without 401/403)
  app.get('/api/announcements', (_req, res) => {
    const db = getDb();
    const active = db.announcements.filter(a => a.active);
    res.json(active);
  });

  // API Routes
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

  // Setup WebSocket on the same HTTP server
  setupWebSocket(server);

  if (!isProduction) {
    // Mount Vite dev middleware with permissive host policy
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        host: '0.0.0.0'
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[NaijaConnect] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
