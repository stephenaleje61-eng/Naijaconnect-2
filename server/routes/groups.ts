import { Router } from 'express';
import { getDb, saveDb } from '../db.ts';
import { requireAuth, optionalAuth, sanitizeUser, type AuthenticatedRequest } from '../auth.ts';
import type { Group } from '../types.ts';

const router = Router();

// List public groups
router.get('/', optionalAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user?.id;
  const category = req.query.category as string;
  const state = req.query.state as string;
  const search = (req.query.q as string || '').toLowerCase().trim();

  const db = getDb();
  let list = db.groups.slice();

  if (category && category !== 'All') {
    list = list.filter(g => g.category.toLowerCase() === category.toLowerCase());
  }

  if (state && state !== 'All') {
    list = list.filter(g => g.stateLocation.toLowerCase() === state.toLowerCase());
  }

  if (search) {
    list = list.filter(g => g.name.toLowerCase().includes(search) || g.description.toLowerCase().includes(search));
  }

  const result = list.map(g => {
    const creator = db.users.find(u => u.id === g.creatorId);
    return {
      ...g,
      creator: creator ? sanitizeUser(creator) : null,
      membersCount: g.memberIds.length,
      isMember: currentUserId ? g.memberIds.includes(currentUserId) : false,
      isCreator: currentUserId ? g.creatorId === currentUserId : false
    };
  });

  return res.json(result);
});

// Create community group
router.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { name, description, avatarUrl, stateLocation, category } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required.' });
  }

  const db = getDb();
  const newGroup: Group = {
    id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    description: (description || '').trim(),
    avatarUrl: avatarUrl || '/nigeria-flag-circle.svg',
    stateLocation: stateLocation || req.user!.state,
    category: category || 'General',
    creatorId: currentUserId,
    memberIds: [currentUserId],
    createdAt: new Date().toISOString()
  };

  db.groups.push(newGroup);

  // Also create group conversation in chat
  db.conversations.push({
    id: `conv_${newGroup.id}`,
    type: 'group',
    name: newGroup.name,
    avatarUrl: newGroup.avatarUrl,
    creatorId: currentUserId,
    memberIds: [currentUserId],
    updatedAt: new Date().toISOString(),
    lastMessage: {
      text: `${req.user!.fullName} created the community group "${newGroup.name}"`,
      senderId: currentUserId,
      createdAt: new Date().toISOString()
    }
  });

  saveDb(db);

  return res.status(201).json({
    message: 'Community group created successfully!',
    group: {
      ...newGroup,
      creator: sanitizeUser(req.user!),
      membersCount: 1,
      isMember: true,
      isCreator: true
    }
  });
});

// Join group
router.post('/:id/join', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;

  const db = getDb();
  const group = db.groups.find(g => g.id === id);
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  if (!group.memberIds.includes(currentUserId)) {
    group.memberIds.push(currentUserId);

    // Also add to chat conversation
    const conv = db.conversations.find(c => c.id === `conv_${group.id}`);
    if (conv && !conv.memberIds.includes(currentUserId)) {
      conv.memberIds.push(currentUserId);
    }

    saveDb(db);
  }

  return res.json({ message: `You have joined ${group.name}!` });
});

// Leave group
router.post('/:id/leave', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;

  const db = getDb();
  const group = db.groups.find(g => g.id === id);
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  group.memberIds = group.memberIds.filter(uid => uid !== currentUserId);

  const conv = db.conversations.find(c => c.id === `conv_${group.id}`);
  if (conv) {
    conv.memberIds = conv.memberIds.filter(uid => uid !== currentUserId);
  }

  saveDb(db);
  return res.json({ message: `You have left ${group.name}.` });
});

export default router;
