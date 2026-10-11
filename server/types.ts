export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
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
  lastActiveAt: string;
  privacy: {
    postsVisibility: 'public' | 'friends' | 'private';
    showOnlineStatus: boolean;
    showLastActive: boolean;
  };
}

export interface Friendship {
  id: string;
  requesterId: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  feeling?: string;
  locationState?: string;
  likes: string[];
  reactions: Record<string, 'like' | 'love' | 'fire' | 'haha' | 'clap'>;
  shares: string[];
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentCommentId?: string;
  likes: string[];
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
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  creatorId?: string;
  memberIds: string[];
  updatedAt: string;
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
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'file';
  readBy: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  senderId: string;
  type: 'friend_request' | 'friend_accepted' | 'post_like' | 'post_comment' | 'post_share' | 'story_reaction' | 'group_invite' | 'system';
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'post' | 'user';
  targetId: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  actionTaken?: string;
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
  memberIds: string[];
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  active: boolean;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  friendships: Friendship[];
  posts: Post[];
  comments: Comment[];
  stories: Story[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  reports: Report[];
  groups: Group[];
  announcements: Announcement[];
}
