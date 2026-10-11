import { Router } from 'express';
import { getDb, saveDb } from '../db.ts';
import { requireAuth, sanitizeUser, type AuthenticatedRequest } from '../auth.ts';
import { broadcastToConversationMembers, broadcastToUser, isUserOnline } from '../socket.ts';
import type { Conversation, Message } from '../types.ts';

const router = Router();

// Get conversation list for current user
// Get users available to start a chat with
router.get('/users', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const db = getDb();
  const availableUsers = db.users
    .filter(u => u.id !== currentUserId && !u.isSuspended)
    .map(u => ({
      ...sanitizeUser(u),
      isOnline: isUserOnline(u.id)
    }));
  return res.json(availableUsers);
});

// Get conversation list for current user
router.get('/conversations', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const db = getDb();

  // Ensure the open national town square exists
  let lounge = db.conversations.find(c => c.id === 'conv_public_lounge');
  const now = new Date().toISOString();

  if (!lounge) {
    lounge = {
      id: 'conv_public_lounge',
      type: 'group',
      name: '🇳🇬 Naija National Town Square (Open Chat)',
      avatarUrl: '/nigeria-flag-circle.svg',
      creatorId: 'usr_admin',
      memberIds: [currentUserId, ...db.users.map(u => u.id)],
      updatedAt: now,
      lastMessage: {
        text: 'Welcome to the open Nigerian Chatting Space! Say hello to everyone across Nigeria.',
        senderId: 'usr_admin',
        createdAt: now
      }
    };
    db.conversations.unshift(lounge);

    // Seed welcoming messages
    db.messages.push(
      {
        id: 'msg_lounge_1',
        conversationId: 'conv_public_lounge',
        senderId: 'usr_admin',
        text: 'Welcome to NaijaConnect National Town Square! 🇳🇬 Connect with friends from Lagos to Maiduguri, Kano to Port Harcourt. Drop your greeting, location, or hustle here!',
        readBy: ['usr_admin'],
        createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString()
      },
      {
        id: 'msg_lounge_2',
        conversationId: 'conv_public_lounge',
        senderId: 'usr_1',
        text: 'Great to see everyone here! Greetings from Yaba, Lagos. 🚀 Any fellow devs or creators online right now?',
        readBy: ['usr_1'],
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString()
      },
      {
        id: 'msg_lounge_3',
        conversationId: 'conv_public_lounge',
        senderId: 'usr_2',
        text: 'Sannu da zuwa from Kano! 👘 Proudly showcasing Northern fashion & arts. Loving the real-time vibe here!',
        readBy: ['usr_2'],
        createdAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString()
      },
      {
        id: 'msg_lounge_4',
        conversationId: 'conv_public_lounge',
        senderId: 'usr_4',
        text: 'Hello from the Garden City, Port Harcourt! 🌿 Bole and fish vibes today. Wishing everyone a blessed week!',
        readBy: ['usr_4'],
        createdAt: new Date(Date.now() - 1800 * 1000).toISOString()
      }
    );
    saveDb(db);
  } else if (!lounge.memberIds.includes(currentUserId)) {
    lounge.memberIds.push(currentUserId);
    saveDb(db);
  }

  const convs = db.conversations
    .filter(c => c.id === 'conv_public_lounge' || c.memberIds.includes(currentUserId))
    .map(c => {
      // Find other members
      const members = c.memberIds
        .map(id => {
          const u = db.users.find(user => user.id === id);
          return u ? { ...sanitizeUser(u), isOnline: isUserOnline(u.id) } : null;
        })
        .filter(Boolean);

      // Unread messages count
      const unreadCount = db.messages.filter(
        m => m.conversationId === c.id && m.senderId !== currentUserId && !m.readBy.includes(currentUserId)
      ).length;

      // In direct chats, title and avatar are other participant's
      let displayTitle = c.name;
      let displayAvatar = c.avatarUrl;
      let otherUserOnline = false;

      if (c.type === 'direct') {
        const otherMember = members.find(m => m?.id !== currentUserId);
        if (otherMember) {
          displayTitle = otherMember.fullName;
          displayAvatar = otherMember.avatarUrl;
          otherUserOnline = otherMember.isOnline;
        }
      }

      return {
        ...c,
        displayTitle: displayTitle || 'Chat',
        displayAvatar: displayAvatar || '',
        otherUserOnline,
        members,
        unreadCount
      };
    });

  // Sort: pin conv_public_lounge at top, then by updatedAt
  convs.sort((a, b) => {
    if (a.id === 'conv_public_lounge') return -1;
    if (b.id === 'conv_public_lounge') return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return res.json(convs);
});

// Create or get direct conversation with user
router.post('/conversations/direct/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { userId } = req.params;

  if (currentUserId === userId) {
    return res.status(400).json({ error: 'Cannot start conversation with yourself.' });
  }

  const db = getDb();
  const targetUser = db.users.find(u => u.id === userId && !u.isSuspended);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  let conv = db.conversations.find(
    c => c.type === 'direct' && c.memberIds.includes(currentUserId) && c.memberIds.includes(userId)
  );

  const now = new Date().toISOString();
  if (!conv) {
    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'direct',
      memberIds: [currentUserId, userId],
      updatedAt: now,
      lastMessage: null
    };
    db.conversations.push(newConv);
    conv = newConv;
    saveDb(db);
  }

  return res.json({
    ...conv,
    displayTitle: targetUser.fullName,
    displayAvatar: targetUser.avatarUrl,
    otherUserOnline: isUserOnline(targetUser.id),
    members: [sanitizeUser(req.user!), sanitizeUser(targetUser)],
    unreadCount: 0
  });
});

// Create group chat
router.post('/conversations/group', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { name, memberIds, avatarUrl } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required.' });
  }

  const db = getDb();
  const allMembers = Array.from(new Set([currentUserId, ...(Array.isArray(memberIds) ? memberIds : [])]));

  if (allMembers.length < 2) {
    return res.status(400).json({ error: 'Please select at least one friend to join the group.' });
  }

  const now = new Date().toISOString();
  const newConv: Conversation = {
    id: `conv_grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'group',
    name: name.trim(),
    avatarUrl: avatarUrl || '/nigeria-flag-circle.svg',
    creatorId: currentUserId,
    memberIds: allMembers,
    updatedAt: now,
    lastMessage: {
      text: `${req.user!.fullName} created group "${name.trim()}"`,
      senderId: currentUserId,
      createdAt: now
    }
  };

  db.conversations.push(newConv);

  // Add system message
  const msg: Message = {
    id: `msg_${Date.now()}`,
    conversationId: newConv.id,
    senderId: currentUserId,
    text: `Group created by ${req.user!.fullName}`,
    readBy: [currentUserId],
    createdAt: now
  };
  db.messages.push(msg);

  saveDb(db);

  allMembers.forEach(mId => {
    if (mId !== currentUserId) {
      broadcastToUser(mId, {
        type: 'new_group_created',
        conversation: newConv
      });
    }
  });

  return res.status(201).json(newConv);
});

// Update group settings (name, avatar, add members)
router.put('/conversations/group/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;
  const { name, avatarUrl, addMemberIds, removeMemberId } = req.body;

  const db = getDb();
  const conv = db.conversations.find(c => c.id === id && c.type === 'group');
  if (!conv) return res.status(404).json({ error: 'Group conversation not found.' });

  if (!conv.memberIds.includes(currentUserId)) {
    return res.status(403).json({ error: 'You are not a member of this group.' });
  }

  if (name && typeof name === 'string') conv.name = name.trim();
  if (avatarUrl && typeof avatarUrl === 'string') conv.avatarUrl = avatarUrl;

  if (Array.isArray(addMemberIds)) {
    addMemberIds.forEach(mId => {
      if (!conv.memberIds.includes(mId)) {
        conv.memberIds.push(mId);
      }
    });
  }

  if (removeMemberId) {
    if (conv.creatorId === currentUserId || removeMemberId === currentUserId) {
      conv.memberIds = conv.memberIds.filter(m => m !== removeMemberId);
    }
  }

  conv.updatedAt = new Date().toISOString();
  saveDb(db);

  broadcastToConversationMembers(conv.id, null, {
    type: 'group_updated',
    conversation: conv
  });

  return res.json({ message: 'Group updated successfully.', conversation: conv });
});

// Get messages for a conversation
router.get('/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;
  const search = (req.query.q as string || '').toLowerCase().trim();

  const db = getDb();
  const conv = db.conversations.find(c => c.id === id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

  if (!conv.memberIds.includes(currentUserId)) {
    if (conv.id === 'conv_public_lounge') {
      conv.memberIds.push(currentUserId);
      saveDb(db);
    } else {
      return res.status(403).json({ error: 'You do not have permission to view messages in this conversation.' });
    }
  }

  let msgs = db.messages.filter(m => m.conversationId === id);

  if (search) {
    msgs = msgs.filter(m => m.text.toLowerCase().includes(search));
  }

  // Mark all unread messages as read by current user
  let markedRead = false;
  msgs.forEach(m => {
    if (!m.readBy.includes(currentUserId)) {
      m.readBy.push(currentUserId);
      markedRead = true;
    }
  });

  if (markedRead) {
    saveDb(db);
    broadcastToConversationMembers(id, currentUserId, {
      type: 'messages_read',
      conversationId: id,
      userId: currentUserId
    });
  }

  const enriched = msgs.map(m => {
    const sender = db.users.find(u => u.id === m.senderId);
    return {
      ...m,
      sender: sender ? sanitizeUser(sender) : null,
      isOutgoing: m.senderId === currentUserId,
      isDelivered: true,
      isRead: m.readBy.filter(uid => uid !== m.senderId).length > 0
    };
  });

  return res.json(enriched);
});

// Send message
router.post('/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;
  const { text, mediaUrl, mediaType } = req.body;

  if ((!text || !text.trim()) && !mediaUrl) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const db = getDb();
  const conv = db.conversations.find(c => c.id === id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

  if (!conv.memberIds.includes(currentUserId)) {
    if (conv.id === 'conv_public_lounge') {
      conv.memberIds.push(currentUserId);
      saveDb(db);
    } else {
      return res.status(403).json({ error: 'You are not a member of this conversation.' });
    }
  }

  const now = new Date().toISOString();
  const newMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId: id,
    senderId: currentUserId,
    text: (text || '').trim(),
    mediaUrl: mediaUrl || undefined,
    mediaType: mediaType || undefined,
    readBy: [currentUserId],
    createdAt: now
  };

  db.messages.push(newMessage);

  // Update conversation
  conv.updatedAt = now;
  conv.lastMessage = {
    text: text ? text.trim().slice(0, 80) : (mediaType === 'audio' ? '🎤 Voice note' : '📷 Image'),
    senderId: currentUserId,
    createdAt: now
  };

  saveDb(db);

  const payload = {
    ...newMessage,
    sender: sanitizeUser(req.user!),
    isOutgoing: false,
    isDelivered: true,
    isRead: false
  };

  // Broadcast to other conversation members
  broadcastToConversationMembers(id, currentUserId, {
    type: 'new_message',
    conversationId: id,
    message: payload
  });

  return res.status(201).json({
    ...payload,
    isOutgoing: true
  });
});

export default router;
