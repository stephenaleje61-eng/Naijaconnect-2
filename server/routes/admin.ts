import { Router } from 'express';
import { getDb, saveDb } from '../db.ts';
import { requireAdmin, sanitizeUser, type AuthenticatedRequest } from '../auth.ts';
import type { Announcement } from '../types.ts';

const router = Router();

// Get admin stats & dashboard overview
router.get('/overview', requireAdmin, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const totalUsers = db.users.length;
  const activeToday = db.users.filter(u => new Date(u.lastActiveAt).getTime() > dayAgo).length;
  const totalPosts = db.posts.length;
  const totalMessages = db.messages.length;
  const pendingReports = db.reports.filter(r => r.status === 'pending').length;
  const totalGroups = db.groups.length;

  return res.json({
    stats: {
      totalUsers,
      activeToday,
      totalPosts,
      totalMessages,
      pendingReports,
      totalGroups
    },
    recentUsers: db.users.slice(-6).reverse().map(sanitizeUser),
    recentReports: db.reports.slice(-10).reverse(),
    announcements: db.announcements
  });
});

// Manage users (suspend/unsuspend, verify badge, change role)
router.put('/users/:id/action', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'suspend' | 'unsuspend' | 'verify' | 'unverify' | 'make_admin'
  const db = getDb();

  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (action === 'suspend') {
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot suspend an administrator.' });
    user.isSuspended = true;
  } else if (action === 'unsuspend') {
    user.isSuspended = false;
  } else if (action === 'verify') {
    user.isVerified = true;
  } else if (action === 'unverify') {
    user.isVerified = false;
  } else if (action === 'make_admin') {
    user.role = 'admin';
  }

  saveDb(db);
  return res.json({ message: `Action "${action}" applied to user ${user.username}.`, user: sanitizeUser(user) });
});

// Reports management
router.get('/reports', requireAdmin, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const reportsEnriched = db.reports.map(r => {
    const reporter = db.users.find(u => u.id === r.reporterId);
    let target = null;
    if (r.targetType === 'post') {
      const post = db.posts.find(p => p.id === r.targetId);
      const postAuthor = post ? db.users.find(u => u.id === post.authorId) : null;
      target = post ? { ...post, author: postAuthor ? sanitizeUser(postAuthor) : null } : null;
    } else {
      const targetUser = db.users.find(u => u.id === r.targetId);
      target = targetUser ? sanitizeUser(targetUser) : null;
    }

    return {
      ...r,
      reporter: reporter ? sanitizeUser(reporter) : null,
      target
    };
  });

  return res.json(reportsEnriched.reverse());
});

router.put('/reports/:id/resolve', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, actionTaken } = req.body; // status: 'resolved' | 'dismissed'

  const db = getDb();
  const report = db.reports.find(r => r.id === id);
  if (!report) return res.status(404).json({ error: 'Report not found.' });

  report.status = status || 'resolved';
  report.actionTaken = actionTaken || 'Reviewed by admin';

  // If actionTaken involves removing the post, remove it
  if (actionTaken === 'delete_post' && report.targetType === 'post') {
    db.posts = db.posts.filter(p => p.id !== report.targetId);
    db.comments = db.comments.filter(c => c.postId !== report.targetId);
  }

  saveDb(db);
  return res.json({ message: 'Report updated successfully.', report });
});

// Announcements
router.post('/announcements', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required.' });

  const db = getDb();
  const newAnn: Announcement = {
    id: `ann_${Date.now()}`,
    title: title.trim(),
    message: message.trim(),
    active: true,
    createdAt: new Date().toISOString()
  };

  db.announcements.unshift(newAnn);
  saveDb(db);

  return res.status(201).json({ message: 'Announcement created!', announcement: newAnn });
});

router.delete('/announcements/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const db = getDb();
  db.announcements = db.announcements.filter(a => a.id !== id);
  saveDb(db);
  return res.json({ message: 'Announcement deleted.' });
});

export default router;
