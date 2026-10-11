import { Router } from 'express';
import { getDb, saveDb } from '../db.ts';
import { requireAuth, sanitizeUser, type AuthenticatedRequest } from '../auth.ts';
import { broadcastToUser, isUserOnline } from '../socket.ts';
import type { Friendship, Notification, Conversation } from '../types.ts';

const router = Router();

// Get friend lists: friends, incoming requests, outgoing requests
router.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const db = getDb();

  const friendships = db.friendships.filter(
    f => f.requesterId === currentUserId || f.recipientId === currentUserId
  );

  const friendsList: Array<ReturnType<typeof sanitizeUser> & { friendshipId: string; isOnline: boolean }> = [];
  const incomingRequests: Array<ReturnType<typeof sanitizeUser> & { friendshipId: string; createdAt: string }> = [];
  const outgoingRequests: Array<ReturnType<typeof sanitizeUser> & { friendshipId: string; createdAt: string }> = [];
  const blockedUsers: Array<ReturnType<typeof sanitizeUser> & { friendshipId: string }> = [];

  friendships.forEach(f => {
    if (f.status === 'accepted') {
      const friendId = f.requesterId === currentUserId ? f.recipientId : f.requesterId;
      const user = db.users.find(u => u.id === friendId && !u.isSuspended);
      if (user) {
        friendsList.push({
          ...sanitizeUser(user),
          friendshipId: f.id,
          isOnline: user.privacy.showOnlineStatus ? isUserOnline(user.id) : false
        });
      }
    } else if (f.status === 'pending') {
      if (f.recipientId === currentUserId) {
        const requester = db.users.find(u => u.id === f.requesterId && !u.isSuspended);
        if (requester) {
          incomingRequests.push({
            ...sanitizeUser(requester),
            friendshipId: f.id,
            createdAt: f.createdAt
          });
        }
      } else {
        const recipient = db.users.find(u => u.id === f.recipientId && !u.isSuspended);
        if (recipient) {
          outgoingRequests.push({
            ...sanitizeUser(recipient),
            friendshipId: f.id,
            createdAt: f.createdAt
          });
        }
      }
    } else if (f.status === 'blocked' && f.requesterId === currentUserId) {
      const blocked = db.users.find(u => u.id === f.recipientId);
      if (blocked) {
        blockedUsers.push({
          ...sanitizeUser(blocked),
          friendshipId: f.id
        });
      }
    }
  });

  return res.json({
    friends: friendsList,
    incomingRequests,
    outgoingRequests,
    blockedUsers
  });
});

// Send friend request
router.post('/request/:targetId', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { targetId } = req.params;

  if (currentUserId === targetId) {
    return res.status(400).json({ error: 'You cannot send a friend request to yourself.' });
  }

  const db = getDb();
  const targetUser = db.users.find(u => u.id === targetId && !u.isSuspended);
  if (!targetUser) {
    return res.status(404).json({ error: 'User does not exist or has been suspended.' });
  }

  // Check existing relationship
  const existing = db.friendships.find(
    f =>
      (f.requesterId === currentUserId && f.recipientId === targetId) ||
      (f.requesterId === targetId && f.recipientId === currentUserId)
  );

  if (existing) {
    if (existing.status === 'accepted') {
      return res.status(400).json({ error: 'You are already friends with this user.' });
    }
    if (existing.status === 'pending') {
      return res.status(400).json({ error: 'A friend request is already pending between you.' });
    }
    if (existing.status === 'blocked') {
      return res.status(403).json({ error: 'Unable to connect with this user.' });
    }
  }

  const now = new Date().toISOString();
  const newFriendship: Friendship = {
    id: `fr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    requesterId: currentUserId,
    recipientId: targetId,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };

  db.friendships.push(newFriendship);

  // Send notification to target user
  const notif: Notification = {
    id: `notif_${Date.now()}`,
    userId: targetId,
    senderId: currentUserId,
    type: 'friend_request',
    title: 'New Friend Request',
    body: `${req.user!.fullName} sent you a friend request.`,
    link: '/friends',
    isRead: false,
    createdAt: now
  };
  db.notifications.push(notif);
  saveDb(db);

  broadcastToUser(targetId, {
    type: 'new_friend_request',
    requester: sanitizeUser(req.user!),
    friendshipId: newFriendship.id
  });

  return res.status(201).json({
    message: 'Friend request sent successfully!',
    friendship: newFriendship
  });
});

// Accept request
router.post('/accept/:friendshipId', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { friendshipId } = req.params;
  const db = getDb();

  const friendship = db.friendships.find(
    f => f.id === friendshipId && f.recipientId === currentUserId && f.status === 'pending'
  );

  if (!friendship) {
    return res.status(404).json({ error: 'Friend request not found or already processed.' });
  }

  const now = new Date().toISOString();
  friendship.status = 'accepted';
  friendship.updatedAt = now;

  // Add notification to requester
  const notif: Notification = {
    id: `notif_${Date.now()}`,
    userId: friendship.requesterId,
    senderId: currentUserId,
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    body: `${req.user!.fullName} accepted your friend request. Say hello!`,
    link: `/profile/${req.user!.id}`,
    isRead: false,
    createdAt: now
  };
  db.notifications.push(notif);

  // Check or create direct conversation between them
  let conv = db.conversations.find(
    c => c.type === 'direct' && c.memberIds.includes(currentUserId) && c.memberIds.includes(friendship.requesterId)
  );
  if (!conv) {
    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'direct',
      memberIds: [currentUserId, friendship.requesterId],
      updatedAt: now,
      lastMessage: null
    };
    db.conversations.push(newConv);
  }

  saveDb(db);

  broadcastToUser(friendship.requesterId, {
    type: 'friend_request_accepted',
    user: sanitizeUser(req.user!)
  });

  return res.json({ message: 'Friend request accepted!' });
});

// Decline request
router.post('/decline/:friendshipId', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { friendshipId } = req.params;
  const db = getDb();

  const idx = db.friendships.findIndex(
    f => f.id === friendshipId && f.recipientId === currentUserId && f.status === 'pending'
  );

  if (idx === -1) {
    return res.status(404).json({ error: 'Friend request not found.' });
  }

  db.friendships.splice(idx, 1);
  saveDb(db);
  return res.json({ message: 'Friend request declined.' });
});

// Cancel sent request
router.post('/cancel/:friendshipId', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { friendshipId } = req.params;
  const db = getDb();

  const idx = db.friendships.findIndex(
    f => f.id === friendshipId && f.requesterId === currentUserId && f.status === 'pending'
  );

  if (idx === -1) {
    return res.status(404).json({ error: 'Sent friend request not found.' });
  }

  db.friendships.splice(idx, 1);
  saveDb(db);
  return res.json({ message: 'Friend request cancelled.' });
});

// Unfriend user
router.delete('/:targetId', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { targetId } = req.params;
  const db = getDb();

  const idx = db.friendships.findIndex(
    f =>
      f.status === 'accepted' &&
      ((f.requesterId === currentUserId && f.recipientId === targetId) ||
       (f.requesterId === targetId && f.recipientId === currentUserId))
  );

  if (idx === -1) {
    return res.status(404).json({ error: 'Friendship record not found.' });
  }

  db.friendships.splice(idx, 1);
  saveDb(db);
  return res.json({ message: 'User removed from friends.' });
});

// Block user
router.post('/block/:targetId', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { targetId } = req.params;
  if (currentUserId === targetId) return res.status(400).json({ error: 'Cannot block yourself.' });

  const db = getDb();
  // Remove any existing friendship
  db.friendships = db.friendships.filter(
    f => !((f.requesterId === currentUserId && f.recipientId === targetId) ||
           (f.requesterId === targetId && f.recipientId === currentUserId))
  );

  db.friendships.push({
    id: `blk_${Date.now()}`,
    requesterId: currentUserId,
    recipientId: targetId,
    status: 'blocked',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  saveDb(db);
  return res.json({ message: 'User blocked.' });
});

export default router;
