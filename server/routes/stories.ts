import { Router } from 'express';
import { getDb, saveDb } from '../db.ts';
import { requireAuth, optionalAuth, sanitizeUser, type AuthenticatedRequest } from '../auth.ts';
import { broadcastToUser } from '../socket.ts';
import type { Story, Notification } from '../types.ts';

const router = Router();

// Get active stories
router.get('/', optionalAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user?.id;
  const db = getDb();
  const now = new Date().toISOString();

  // Filter unexpired stories
  const activeStories = db.stories.filter(s => new Date(s.expiresAt).getTime() > new Date(now).getTime());

  // Group by author
  const authorMap = new Map<string, {
    author: ReturnType<typeof sanitizeUser>;
    hasUnseen: boolean;
    stories: Array<Story & { isSeen: boolean }>;
  }>();

  activeStories.forEach(story => {
    const author = db.users.find(u => u.id === story.authorId);
    if (!author || author.isSuspended) return;

    if (!authorMap.has(story.authorId)) {
      authorMap.set(story.authorId, {
        author: sanitizeUser(author),
        hasUnseen: false,
        stories: []
      });
    }

    const isSeen = currentUserId ? (story.views && story.views.includes(currentUserId)) : false;
    const authorGroup = authorMap.get(story.authorId)!;

    if (!isSeen && currentUserId !== story.authorId) {
      authorGroup.hasUnseen = true;
    }

    authorGroup.stories.push({
      ...story,
      isSeen
    });
  });

  const result = Array.from(authorMap.values());
  // Sort: current user first if they have stories, then unseen stories, then seen
  result.sort((a, b) => {
    if (currentUserId && a.author.id === currentUserId) return -1;
    if (currentUserId && b.author.id === currentUserId) return 1;
    if (a.hasUnseen && !b.hasUnseen) return -1;
    if (!a.hasUnseen && b.hasUnseen) return 1;
    return 0;
  });

  return res.json(result);
});

// Create story
router.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { text, mediaUrl, backgroundGradient } = req.body;

  if (!text && !mediaUrl) {
    return res.status(400).json({ error: 'Please enter a caption or upload a media item.' });
  }

  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const gradients = [
    'from-emerald-600 to-teal-800',
    'from-green-600 to-emerald-900',
    'from-amber-600 to-rose-700',
    'from-emerald-700 to-cyan-800',
    'from-purple-700 to-indigo-900'
  ];
  const chosenGradient = backgroundGradient || gradients[Math.floor(Math.random() * gradients.length)];

  const newStory: Story = {
    id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    authorId: currentUserId,
    text: (text || '').trim(),
    mediaUrl: mediaUrl || undefined,
    backgroundGradient: chosenGradient,
    createdAt: now.toISOString(),
    expiresAt,
    views: [],
    reactions: {}
  };

  db.stories.push(newStory);
  saveDb(db);

  return res.status(201).json({
    message: 'Story shared! It will be visible for 24 hours.',
    story: newStory
  });
});

// View story
router.post('/:id/view', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;

  const db = getDb();
  const story = db.stories.find(s => s.id === id);
  if (!story) return res.status(404).json({ error: 'Story not found.' });

  if (!story.views) story.views = [];
  if (!story.views.includes(currentUserId)) {
    story.views.push(currentUserId);
    saveDb(db);
  }

  return res.json({ success: true, viewsCount: story.views.length });
});

// React to story
router.post('/:id/react', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;
  const { reaction } = req.body;

  if (!reaction) return res.status(400).json({ error: 'Reaction is required.' });

  const db = getDb();
  const story = db.stories.find(s => s.id === id);
  if (!story) return res.status(404).json({ error: 'Story not found.' });

  if (!story.reactions) story.reactions = {};
  story.reactions[currentUserId] = reaction;

  if (story.authorId !== currentUserId) {
    const notif: Notification = {
      id: `notif_${Date.now()}`,
      userId: story.authorId,
      senderId: currentUserId,
      type: 'story_reaction',
      title: 'Story Reaction',
      body: `${req.user!.fullName} reacted ${reaction} to your story.`,
      link: '/stories',
      isRead: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.push(notif);
    broadcastToUser(story.authorId, {
      type: 'notification',
      notification: notif
    });
  }

  saveDb(db);
  return res.json({ message: 'Reaction sent!', reaction });
});

// Delete story
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;

  const db = getDb();
  const idx = db.stories.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Story not found.' });

  const story = db.stories[idx];
  if (story.authorId !== currentUserId && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'You cannot delete this story.' });
  }

  db.stories.splice(idx, 1);
  saveDb(db);
  return res.json({ message: 'Story deleted.' });
});

export default router;
