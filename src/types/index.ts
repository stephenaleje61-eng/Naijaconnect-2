export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  dob: string;
  state: string;
  city: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  occupation: string;
  interests: string[];
  role: 'admin' | 'user';
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
  lastActiveAt?: string | null;
  isOnline?: boolean;
  friendshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self' | 'blocked';
  postsCount?: number;
  friendsCount?: number;
  privacy?: {
    postsVisibility: 'public' | 'friends' | 'private';
    showOnlineStatus: boolean;
    showLastActive: boolean;
  };
}

export interface Post {
  id: string;
  authorId: string;
  author: User;
  content: string;
  mediaUrls: string[];
  feeling?: string;
  locationState?: string;
  likes: string[];
  reactions: Record<string, 'like' | 'love' | 'fire' | 'haha' | 'clap'>;
  shares: string[];
  commentsCount: number;
  totalLikes: number;
  reactionCounts: {
    like: number;
    love: number;
    fire: number;
    haha: number;
    clap: number;
  };
  userReaction?: 'like' | 'love' | 'fire' | 'haha' | 'clap' | null;
  userHasLiked: boolean;
  userHasShared: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  content: string;
  parentCommentId?: string;
  likes: string[];
  likesCount?: number;
  userHasLiked?: boolean;
  createdAt: string;
}

export interface Story {
  id: string;
  authorId: string;
  mediaUrl?: string;
  text: string;
  backgroundGradient: string;
  createdAt: string;
  expiresAt: string;
  views: string[];
  reactions: Record<string, string>;
  isSeen?: boolean;
}

export interface StoryAuthorGroup {
  author: User;
  hasUnseen: boolean;
  stories: Story[];
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  creatorId?: string;
  memberIds: string[];
  updatedAt: string;
  displayTitle: string;
  displayAvatar: string;
  otherUserOnline: boolean;
  members: User[];
  unreadCount: number;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: string;
  } | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User | null;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'file';
  readBy: string[];
  createdAt: string;
  isOutgoing?: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  senderId: string;
  sender?: User | null;
  type: 'friend_request' | 'friend_accepted' | 'post_like' | 'post_comment' | 'post_share' | 'story_reaction' | 'group_invite' | 'system';
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  stateLocation: string;
  category: string;
  creatorId: string;
  creator?: User | null;
  memberIds: string[];
  membersCount: number;
  isMember: boolean;
  isCreator: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporter?: User | null;
  targetType: 'post' | 'user';
  targetId: string;
  target?: any;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  actionTaken?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  active: boolean;
  createdAt: string;
}
