import { Router } from 'express';
import { getDb, saveDb } from '../db.ts';
import { requireAuth, sanitizeUser, type AuthenticatedRequest } from '../auth.ts';

const router = Router();

router.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const db = getDb();

  const notifs = db.notifications
    .filter(n => n.userId === currentUserId)
    .map(n => {
      const sender = db.users.find(u => u.id === n.senderId);
      return {
        ...n,
        sender: sender ? sanitizeUser(sender) : null
      };
    });

  notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json(notifs);
});

router.put('/mark-read', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.body;
  const db = getDb();

  if (id) {
    const notif = db.notifications.find(n => n.id === id && n.userId === currentUserId);
    if (notif) notif.isRead = true;
  } else {
    db.notifications.forEach(n => {
      if (n.userId === currentUserId) n.isRead = true;
    });
  }

  saveDb(db);
  return res.json({ message: 'Notifications updated.' });
});

router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;
  const db = getDb();

  const idx = db.notifications.findIndex(n => n.id === id && n.userId === currentUserId);
  if (idx !== -1) {
    db.notifications.splice(idx, 1);
    saveDb(db);
  }
  return res.json({ message: 'Notification removed.' });
});

export default router;
