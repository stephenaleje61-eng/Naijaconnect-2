import { Router } from 'express';
import { getDb, saveDb } from '../db.ts';
import { requireAuth, optionalAuth, sanitizeUser, type AuthenticatedRequest } from '../auth.ts';
import { broadcastToUser } from '../socket.ts';
import type { Post, Comment, Report, Notification } from '../types.ts';

const router = Router();

// Feed endpoint
router.get('/', optionalAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user?.id;
  const filter = (req.query.filter as string) || 'all'; // 'all' | 'friends' | 'state' | 'trending'
  const stateFilter = req.query.state as string;
  const authorId = req.query.authorId as string;

  const db = getDb();
  let list = db.posts.slice();

  // Exclude posts from blocked users if logged in
  if (currentUserId) {
    const blockedUserIds = new Set(
      db.friendships
        .filter(f => f.status === 'blocked' && (f.requesterId === currentUserId || f.recipientId === currentUserId))
        .map(f => f.requesterId === currentUserId ? f.recipientId : f.requesterId)
    );
    list = list.filter(p => !blockedUserIds.has(p.authorId));
  }

  if (authorId) {
    list = list.filter(p => p.authorId === authorId);
  } else if (filter === 'friends' && currentUserId) {
    const friendIds = new Set(
      db.friendships
        .filter(f => f.status === 'accepted' && (f.requesterId === currentUserId || f.recipientId === currentUserId))
        .map(f => f.requesterId === currentUserId ? f.recipientId : f.requesterId)
    );
    friendIds.add(currentUserId);
    list = list.filter(p => friendIds.has(p.authorId));
  } else if (filter === 'state' && (stateFilter || req.user?.state)) {
    const targetState = stateFilter || req.user?.state;
    list = list.filter(p => {
      const author = db.users.find(u => u.id === p.authorId);
      return p.locationState === targetState || author?.state === targetState;
    });
  }

  // Format posts with author info, comments count, reactions
  const enriched = list
    .map(p => {
      const author = db.users.find(u => u.id === p.authorId);
      if (!author || author.isSuspended) return null;

      const commentsCount = db.comments.filter(c => c.postId === p.id).length;
      const userReaction = currentUserId ? (p.reactions?.[currentUserId] || (p.likes?.includes(currentUserId) ? 'like' : null)) : null;

      const reactionCounts = {
        like: 0,
        love: 0,
        fire: 0,
        haha: 0,
        clap: 0
      };

      if (p.reactions) {
        Object.values(p.reactions).forEach(r => {
          if (r && reactionCounts[r] !== undefined) {
            reactionCounts[r]++;
          }
        });
      }

      const totalLikes = (p.likes?.length || 0);

      return {
        ...p,
        author: sanitizeUser(author),
        commentsCount,
        totalLikes,
        reactionCounts,
        userReaction,
        userHasLiked: currentUserId ? p.likes?.includes(currentUserId) : false,
        userHasShared: currentUserId ? p.shares?.includes(currentUserId) : false
      };
    })
    .filter(Boolean);

  // Sorting
  if (filter === 'trending') {
    enriched.sort((a, b) => {
      const scoreA = (a!.totalLikes * 2) + (a!.commentsCount * 3) + (a!.shares.length * 4);
      const scoreB = (b!.totalLikes * 2) + (b!.commentsCount * 3) + (b!.shares.length * 4);
      return scoreB - scoreA;
    });
  } else {
    // Newest first
    enriched.sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());
  }

  return res.json(enriched);
});

// Create post
router.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { content, mediaUrls, feeling, locationState } = req.body;

  if ((!content || !content.trim()) && (!mediaUrls || mediaUrls.length === 0)) {
    return res.status(400).json({ error: 'Post must contain text content or media.' });
  }

  const db = getDb();
  const now = new Date().toISOString();

  const newPost: Post = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    authorId: currentUserId,
    content: (content || '').trim(),
    mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
    feeling: feeling ? feeling.trim() : undefined,
    locationState: locationState || req.user!.state,
    likes: [],
    reactions: {},
    shares: [],
    isEdited: false,
    createdAt: now,
    updatedAt: now
  };

  db.posts.unshift(newPost);
  saveDb(db);

  return res.status(201).json({
    message: 'Post published!',
    post: {
      ...newPost,
      author: sanitizeUser(req.user!),
      commentsCount: 0,
      totalLikes: 0,
      reactionCounts: { like: 0, love: 0, fire: 0, haha: 0, clap: 0 },
      userReaction: null,
      userHasLiked: false,
      userHasShared: false
    }
  });
});

// Edit post
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;
  const { content, feeling, locationState } = req.body;

  const db = getDb();
  const post = db.posts.find(p => p.id === id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  if (post.authorId !== currentUserId && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'You are not authorized to edit this post.' });
  }

  if (content !== undefined) post.content = content.trim();
  if (feeling !== undefined) post.feeling = feeling.trim();
  if (locationState !== undefined) post.locationState = locationState;
  post.isEdited = true;
  post.updatedAt = new Date().toISOString();

  saveDb(db);
  return res.json({ message: 'Post updated successfully.', post });
});

// Delete post
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;

  const db = getDb();
  const postIdx = db.posts.findIndex(p => p.id === id);
  if (postIdx === -1) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  const post = db.posts[postIdx];
  if (post.authorId !== currentUserId && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'You cannot delete this post.' });
  }

  db.posts.splice(postIdx, 1);
  // Also clean up comments
  db.comments = db.comments.filter(c => c.postId !== id);
  saveDb(db);

  return res.json({ message: 'Post deleted successfully.' });
});

// React / like post
router.post('/:id/react', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;
  const reactionType = (req.body.reaction as 'like' | 'love' | 'fire' | 'haha' | 'clap') || 'like';

  const db = getDb();
  const post = db.posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  if (!post.reactions) post.reactions = {};
  if (!post.likes) post.likes = [];

  const previousReaction = post.reactions[currentUserId];

  if (previousReaction === reactionType) {
    // Toggle off
    delete post.reactions[currentUserId];
    post.likes = post.likes.filter(uid => uid !== currentUserId);
  } else {
    // Add/Update reaction
    post.reactions[currentUserId] = reactionType;
    if (!post.likes.includes(currentUserId)) {
      post.likes.push(currentUserId);
    }

    // Send notification if not author
    if (post.authorId !== currentUserId) {
      const notif: Notification = {
        id: `notif_${Date.now()}`,
        userId: post.authorId,
        senderId: currentUserId,
        type: 'post_like',
        title: 'New Reaction',
        body: `${req.user!.fullName} reacted ${reactionType.toUpperCase()} to your post.`,
        link: `/feed`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      db.notifications.push(notif);
      broadcastToUser(post.authorId, {
        type: 'notification',
        notification: notif
      });
    }
  }

  saveDb(db);

  const reactionCounts = { like: 0, love: 0, fire: 0, haha: 0, clap: 0 };
  Object.values(post.reactions).forEach(r => {
    if (r && reactionCounts[r] !== undefined) reactionCounts[r]++;
  });

  return res.json({
    totalLikes: post.likes.length,
    reactionCounts,
    userReaction: post.reactions[currentUserId] || null
  });
});

// Share post
router.post('/:id/share', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;

  const db = getDb();
  const post = db.posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  if (!post.shares) post.shares = [];
  if (!post.shares.includes(currentUserId)) {
    post.shares.push(currentUserId);
  }

  if (post.authorId !== currentUserId) {
    db.notifications.push({
      id: `notif_${Date.now()}`,
      userId: post.authorId,
      senderId: currentUserId,
      type: 'post_share',
      title: 'Post Shared',
      body: `${req.user!.fullName} shared your post to their circle.`,
      link: '/feed',
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  saveDb(db);
  return res.json({ message: 'Post shared to your network!', sharesCount: post.shares.length });
});

// Comments
router.get('/:id/comments', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;
  const db = getDb();

  const comments = db.comments
    .filter(c => c.postId === id)
    .map(c => {
      const author = db.users.find(u => u.id === c.authorId);
      return {
        ...c,
        author: author ? sanitizeUser(author) : null,
        likesCount: c.likes?.length || 0,
        userHasLiked: currentUserId ? c.likes?.includes(currentUserId) : false
      };
    })
    .filter(c => c.author !== null);

  comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return res.json(comments);
});

router.post('/:id/comments', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;
  const { content, parentCommentId } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment cannot be blank.' });
  }

  const db = getDb();
  const post = db.posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const now = new Date().toISOString();
  const newComment: Comment = {
    id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    postId: id,
    authorId: currentUserId,
    content: content.trim(),
    parentCommentId: parentCommentId || undefined,
    likes: [],
    createdAt: now
  };

  db.comments.push(newComment);

  // Notify post author
  if (post.authorId !== currentUserId) {
    const notif: Notification = {
      id: `notif_${Date.now()}`,
      userId: post.authorId,
      senderId: currentUserId,
      type: 'post_comment',
      title: 'New Comment',
      body: `${req.user!.fullName} commented on your post: "${content.trim().slice(0, 50)}..."`,
      link: '/feed',
      isRead: false,
      createdAt: now
    };
    db.notifications.push(notif);
    broadcastToUser(post.authorId, {
      type: 'notification',
      notification: notif
    });
  }

  saveDb(db);

  return res.status(201).json({
    message: 'Comment posted!',
    comment: {
      ...newComment,
      author: sanitizeUser(req.user!),
      likesCount: 0,
      userHasLiked: false
    }
  });
});

router.delete('/:id/comments/:commentId', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { commentId } = req.params;

  const db = getDb();
  const idx = db.comments.findIndex(c => c.id === commentId);
  if (idx === -1) return res.status(404).json({ error: 'Comment not found.' });

  const comment = db.comments[idx];
  if (comment.authorId !== currentUserId && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'You cannot delete this comment.' });
  }

  db.comments.splice(idx, 1);
  saveDb(db);
  return res.json({ message: 'Comment deleted.' });
});

// Report post
router.post('/:id/report', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user!.id;
  const { id } = req.params;
  const { reason, details } = req.body;

  if (!reason) return res.status(400).json({ error: 'Please choose a reason for reporting.' });

  const db = getDb();
  const report: Report = {
    id: `rep_${Date.now()}`,
    reporterId: currentUserId,
    targetType: 'post',
    targetId: id,
    reason,
    details: details || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.reports.push(report);
  saveDb(db);

  return res.json({ message: 'Report submitted. Our moderation team will review this shortly.' });
});

export default router;
