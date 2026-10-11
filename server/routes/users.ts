import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, saveDb } from '../db.ts';
import { requireAuth, optionalAuth, sanitizeUser, type AuthenticatedRequest } from '../auth.ts';
import { isUserOnline } from '../socket.ts';

const router = Router();

// Universal search users
router.get('/search', optionalAuth, (req: AuthenticatedRequest, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const stateFilter = req.query.state as string;
  const currentUserId = req.user?.id;

  const db = getDb();
  let matches = db.users.filter(u => !u.isSuspended);

  if (stateFilter && stateFilter !== 'All') {
    matches = matches.filter(u => u.state.toLowerCase() === stateFilter.toLowerCase());
  }

  if (query) {
    matches = matches.filter(
      u =>
        u.fullName.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        u.city.toLowerCase().includes(query) ||
        u.bio.toLowerCase().includes(query)
    );
  }

  // Filter out blocked users if user is logged in
  if (currentUserId) {
    const blockedPairs = db.friendships
      .filter(f => f.status === 'blocked' && (f.requesterId === currentUserId || f.recipientId === currentUserId))
      .map(f => f.requesterId === currentUserId ? f.recipientId : f.requesterId);

    matches = matches.filter(u => !blockedPairs.includes(u.id));
  }

  const result = matches.map(u => {
    const safe = sanitizeUser(u);
    const online = isUserOnline(u.id);
    let friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' = 'none';

    if (currentUserId && currentUserId !== u.id) {
      const friendship = db.friendships.find(
        f =>
          (f.requesterId === currentUserId && f.recipientId === u.id) ||
          (f.requesterId === u.id && f.recipientId === currentUserId)
      );
      if (friendship) {
        if (friendship.status === 'accepted') friendshipStatus = 'friends';
        else if (friendship.status === 'pending') {
          friendshipStatus = friendship.requesterId === currentUserId ? 'pending_sent' : 'pending_received';
        }
      }
    }

    return {
      ...safe,
      isOnline: u.privacy.showOnlineStatus ? online : false,
      lastActiveAt: u.privacy.showLastActive ? u.lastActiveAt : null,
      friendshipStatus
    };
  });

  return res.json(result);
});

// Suggestions for current user
router.get('/suggestions', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const db = getDb();
  const currentUser = req.user!;

  const existingFriendIds = new Set(
    db.friendships
      .filter(f => (f.requesterId === currentUserId || f.recipientId === currentUserId) && (f.status === 'accepted' || f.status === 'pending' || f.status === 'blocked'))
      .map(f => f.requesterId === currentUserId ? f.recipientId : f.requesterId)
  );
  existingFriendIds.add(currentUserId);

  const candidates = db.users
    .filter(u => !u.isSuspended && !existingFriendIds.has(u.id))
    .map(u => {
      // Prioritize same state
      const isSameState = u.state.toLowerCase() === currentUser.state.toLowerCase();
      return {
        ...sanitizeUser(u),
        isOnline: u.privacy.showOnlineStatus ? isUserOnline(u.id) : false,
        isSameState
      };
    })
    .sort((a, b) => (b.isSameState ? 1 : 0) - (a.isSameState ? 1 : 0))
    .slice(0, 10);

  return res.json(candidates);
});

// Get profile by ID or username
router.get('/profile/:identifier', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { identifier } = req.params;
  const currentUserId = req.user?.id;
  const db = getDb();

  const user = db.users.find(u => u.id === identifier || u.username.toLowerCase() === identifier.toLowerCase());
  if (!user || user.isSuspended) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  const postsCount = db.posts.filter(p => p.authorId === user.id).length;
  const friendsCount = db.friendships.filter(
    f => (f.requesterId === user.id || f.recipientId === user.id) && f.status === 'accepted'
  ).length;

  let friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self' | 'blocked' = 'none';

  if (currentUserId === user.id) {
    friendshipStatus = 'self';
  } else if (currentUserId) {
    const friendship = db.friendships.find(
      f =>
        (f.requesterId === currentUserId && f.recipientId === user.id) ||
        (f.requesterId === user.id && f.recipientId === currentUserId)
    );
    if (friendship) {
      if (friendship.status === 'accepted') friendshipStatus = 'friends';
      else if (friendship.status === 'pending') {
        friendshipStatus = friendship.requesterId === currentUserId ? 'pending_sent' : 'pending_received';
      } else if (friendship.status === 'blocked') {
        friendshipStatus = 'blocked';
      }
    }
  }

  const safe = sanitizeUser(user);
  return res.json({
    ...safe,
    postsCount,
    friendsCount,
    friendshipStatus,
    isOnline: user.privacy.showOnlineStatus ? isUserOnline(user.id) : false,
    lastActiveAt: user.privacy.showLastActive ? user.lastActiveAt : null
  });
});

// Update profile
router.put('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { fullName, bio, state, city, occupation, interests, avatarUrl, coverUrl, privacy } = req.body;

  const db = getDb();
  const user = db.users.find(u => u.id === currentUserId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (fullName && typeof fullName === 'string' && fullName.trim().length >= 2) {
    user.fullName = fullName.trim();
  }
  if (typeof bio === 'string') user.bio = bio.trim();
  if (state && typeof state === 'string') user.state = state;
  if (typeof city === 'string') user.city = city.trim();
  if (typeof occupation === 'string') user.occupation = occupation.trim();
  if (Array.isArray(interests)) user.interests = interests;
  if (avatarUrl && typeof avatarUrl === 'string') user.avatarUrl = avatarUrl;
  if (coverUrl && typeof coverUrl === 'string') user.coverUrl = coverUrl;

  if (privacy && typeof privacy === 'object') {
    user.privacy = {
      postsVisibility: privacy.postsVisibility || user.privacy.postsVisibility,
      showOnlineStatus: typeof privacy.showOnlineStatus === 'boolean' ? privacy.showOnlineStatus : user.privacy.showOnlineStatus,
      showLastActive: typeof privacy.showLastActive === 'boolean' ? privacy.showLastActive : user.privacy.showLastActive
    };
  }

  user.lastActiveAt = new Date().toISOString();
  saveDb(db);

  return res.json({
    message: 'Profile updated successfully!',
    user: sanitizeUser(user)
  });
});

// Change password
router.put('/password', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const db = getDb();
  const user = db.users.find(u => u.id === currentUserId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const isValid = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!isValid) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const salt = bcrypt.genSaltSync(10);
  user.passwordHash = bcrypt.hashSync(newPassword, salt);
  saveDb(db);

  return res.json({ message: 'Password updated successfully!' });
});

export default router;
