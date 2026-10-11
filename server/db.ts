import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type { DatabaseSchema, User, Post, Story, Conversation, Group } from './types.ts';

const DB_FILE = path.resolve(process.cwd(), 'data', 'naijaconnect.json');

// Ensure data directory exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbCache: DatabaseSchema | null = null;

function getInitialData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('Password123!', salt);
  const now = new Date().toISOString();
  const dayAgo = new Date(Date.now() - 3600 * 1000 * 4).toISOString();
  const twoDaysAgo = new Date(Date.now() - 3600 * 1000 * 30).toISOString();
  const tomorrow = new Date(Date.now() + 3600 * 1000 * 20).toISOString();

  const seedUsers: User[] = [
    {
      id: 'usr_admin',
      fullName: 'NaijaConnect Admin',
      username: 'admin',
      email: 'admin@naijaconnect.ng',
      passwordHash: defaultPasswordHash,
      dob: '1990-01-01',
      state: 'FCT - Abuja',
      city: 'Maitama, Abuja',
      bio: 'Official Administrator of NaijaConnect. Welcome to Nigeria’s digital town square!',
      avatarUrl: '/nigeria-flag-circle.svg',
      coverUrl: '/nigeria-flag-banner.svg',
      occupation: 'Platform Administrator',
      interests: ['Community', 'Tech', 'Governance', 'Nigeria'],
      role: 'admin',
      isVerified: true,
      isSuspended: false,
      createdAt: twoDaysAgo,
      lastActiveAt: now,
      privacy: { postsVisibility: 'public', showOnlineStatus: true, showLastActive: true }
    },
    {
      id: 'usr_1',
      fullName: 'Chidiebere Eze',
      username: 'chidi_tech',
      email: 'chidi@example.com',
      passwordHash: defaultPasswordHash,
      dob: '1996-05-14',
      state: 'Lagos',
      city: 'Yaba, Lagos',
      bio: 'Software Architect & Fintech Enthusiast in Lagos. Proud Igbo boy loving Afrobeats and pounded yam with egusi.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      occupation: 'Lead Engineer @ Fintech Hub',
      interests: ['Coding', 'Fintech', 'Afrobeats', 'Arsenal FC'],
      role: 'user',
      isVerified: true,
      isSuspended: false,
      createdAt: twoDaysAgo,
      lastActiveAt: now,
      privacy: { postsVisibility: 'public', showOnlineStatus: true, showLastActive: true }
    },
    {
      id: 'usr_2',
      fullName: 'Amina Bello',
      username: 'amina_bello',
      email: 'amina@example.com',
      passwordHash: defaultPasswordHash,
      dob: '1998-09-22',
      state: 'Kano',
      city: 'Nassarawa, Kano',
      bio: 'Fashion designer, textile lover & food blogger from Kano. Showcasing northern aesthetics & rich Arewa heritage.',
      avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
      occupation: 'Founder @ Arewa Stitches',
      interests: ['Fashion', 'Textiles', 'Culture', 'Photography'],
      role: 'user',
      isVerified: true,
      isSuspended: false,
      createdAt: twoDaysAgo,
      lastActiveAt: now,
      privacy: { postsVisibility: 'public', showOnlineStatus: true, showLastActive: true }
    },
    {
      id: 'usr_3',
      fullName: 'Olumide Adebayo',
      username: 'olu_adebayo',
      email: 'olumide@example.com',
      passwordHash: defaultPasswordHash,
      dob: '1995-12-03',
      state: 'Oyo',
      city: 'Bodija, Ibadan',
      bio: 'Agribusiness visionary & coffee lover. Building smart sustainable farm solutions in southwestern Nigeria.',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80',
      occupation: 'AgriTech Founder',
      interests: ['Agriculture', 'Green Energy', 'Ibadan Vibes', 'Chelsea FC'],
      role: 'user',
      isVerified: false,
      isSuspended: false,
      createdAt: twoDaysAgo,
      lastActiveAt: dayAgo,
      privacy: { postsVisibility: 'public', showOnlineStatus: true, showLastActive: true }
    },
    {
      id: 'usr_4',
      fullName: 'Dr. Blessing Okoro',
      username: 'blessing_doc',
      email: 'blessing@example.com',
      passwordHash: defaultPasswordHash,
      dob: '1992-03-18',
      state: 'Rivers',
      city: 'Port Harcourt',
      bio: 'Public health physician & wellness advocate in the Garden City. Bole and fish enthusiast.',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80',
      occupation: 'Consultant Epidemiologist',
      interests: ['Health', 'Wellness', 'Bole & Fish', 'Books'],
      role: 'user',
      isVerified: true,
      isSuspended: false,
      createdAt: twoDaysAgo,
      lastActiveAt: now,
      privacy: { postsVisibility: 'public', showOnlineStatus: true, showLastActive: true }
    }
  ];

  const seedPosts: Post[] = [
    {
      id: 'post_1',
      authorId: 'usr_1',
      content: 'Lagos traffic will humble you, but the hustle and energy here has no equal in the world! Just wrapped an awesome hackathon with 40 young developers in Yaba. The future of Nigerian tech is undeniably bright. 🇳🇬🚀',
      mediaUrls: [
        '/nigeria-flag.svg'
      ],
      feeling: 'Feeling excited in Yaba, Lagos',
      locationState: 'Lagos',
      likes: ['usr_2', 'usr_3', 'usr_4'],
      reactions: {
        usr_2: 'fire',
        usr_3: 'like',
        usr_4: 'clap'
      },
      shares: ['usr_3'],
      isEdited: false,
      createdAt: dayAgo,
      updatedAt: dayAgo
    },
    {
      id: 'post_2',
      authorId: 'usr_2',
      content: 'Kano traditional durbar patterns and dyed indigo cotton on display today at our workshop! Preserving centuries of northern craftsmanship while creating sustainable contemporary garments. What do you all think? 👘✨',
      mediaUrls: [
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&auto=format&fit=crop&q=80'
      ],
      feeling: 'Feeling blessed in Kano',
      locationState: 'Kano',
      likes: ['usr_1', 'usr_4'],
      reactions: {
        usr_1: 'love',
        usr_4: 'fire'
      },
      shares: [],
      isEdited: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString()
    },
    {
      id: 'post_3',
      authorId: 'usr_4',
      content: 'Weekend reminder from Port Harcourt: prioritize your mental and physical wellness. Take that walk, drink plenty of water, and enjoy a warm plate of roasted plantain and grilled fish with good friends. Stay healthy, Naija! 🌿🩺',
      mediaUrls: [
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1000&auto=format&fit=crop&q=80'
      ],
      feeling: 'Feeling energized in Port Harcourt',
      locationState: 'Rivers',
      likes: ['usr_1', 'usr_2', 'usr_3'],
      reactions: {
        usr_1: 'like',
        usr_2: 'love',
        usr_3: 'clap'
      },
      shares: ['usr_1'],
      isEdited: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString()
    }
  ];

  const seedStories: Story[] = [
    {
      id: 'story_1',
      authorId: 'usr_1',
      mediaUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
      text: 'Late night sprint at the tech hub! 💡',
      backgroundGradient: 'from-emerald-600 to-teal-800',
      createdAt: now,
      expiresAt: tomorrow,
      views: ['usr_2', 'usr_4'],
      reactions: { usr_2: '🔥' }
    },
    {
      id: 'story_2',
      authorId: 'usr_2',
      mediaUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
      text: 'New fabric drop coming tomorrow! ✨',
      backgroundGradient: 'from-amber-600 to-rose-700',
      createdAt: now,
      expiresAt: tomorrow,
      views: ['usr_1'],
      reactions: { usr_1: '❤️' }
    },
    {
      id: 'story_3',
      authorId: 'usr_4',
      mediaUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
      text: 'Morning serenity in Rivers State 🌊',
      backgroundGradient: 'from-emerald-700 to-cyan-800',
      createdAt: now,
      expiresAt: tomorrow,
      views: ['usr_3'],
      reactions: {}
    }
  ];

  const seedGroups: Group[] = [
    {
      id: 'grp_1',
      name: 'Naija Tech Founders & Devs',
      description: 'The premier community for Nigerian software engineers, startup builders, and tech innovators.',
      avatarUrl: '/nigeria-flag-circle.svg',
      stateLocation: 'Lagos',
      category: 'Tech',
      creatorId: 'usr_1',
      memberIds: ['usr_1', 'usr_2', 'usr_3', 'usr_4'],
      createdAt: twoDaysAgo
    },
    {
      id: 'grp_2',
      name: 'Arewa Creatives & Fashion Guild',
      description: 'Celebrating arts, modern textiles, and cultural craftsmanship from Northern Nigeria.',
      avatarUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80',
      stateLocation: 'Kano',
      category: 'Culture',
      creatorId: 'usr_2',
      memberIds: ['usr_2', 'usr_1', 'usr_4'],
      createdAt: twoDaysAgo
    },
    {
      id: 'grp_3',
      name: 'Nigerian AgriTech Innovations',
      description: 'Modern mechanized agriculture, farm exports, and food security network across Nigeria.',
      avatarUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&auto=format&fit=crop&q=80',
      stateLocation: 'Oyo',
      category: 'Business',
      creatorId: 'usr_3',
      memberIds: ['usr_3', 'usr_1'],
      createdAt: twoDaysAgo
    }
  ];

  const seedFriendships = [
    {
      id: 'fr_1',
      requesterId: 'usr_1',
      recipientId: 'usr_2',
      status: 'accepted' as const,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo
    },
    {
      id: 'fr_2',
      requesterId: 'usr_1',
      recipientId: 'usr_4',
      status: 'accepted' as const,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo
    },
    {
      id: 'fr_3',
      requesterId: 'usr_3',
      recipientId: 'usr_1',
      status: 'pending' as const,
      createdAt: dayAgo,
      updatedAt: dayAgo
    }
  ];

  const seedConversations: Conversation[] = [
    {
      id: 'conv_1',
      type: 'direct',
      memberIds: ['usr_1', 'usr_2'],
      updatedAt: dayAgo,
      lastMessage: {
        text: 'Amina, loved your latest designs! Looking forward to collaborating.',
        senderId: 'usr_1',
        createdAt: dayAgo
      }
    },
    {
      id: 'conv_grp_1',
      type: 'group',
      name: 'Naija Tech Hub Hangout',
      avatarUrl: '/nigeria-flag-circle.svg',
      creatorId: 'usr_1',
      memberIds: ['usr_1', 'usr_2', 'usr_3', 'usr_4'],
      updatedAt: now,
      lastMessage: {
        text: 'Welcome everyone to the official NaijaConnect community chat!',
        senderId: 'usr_1',
        createdAt: now
      }
    }
  ];

  const seedMessages = [
    {
      id: 'msg_1',
      conversationId: 'conv_1',
      senderId: 'usr_2',
      text: 'Hey Chidi! How is Lagos today?',
      readBy: ['usr_1', 'usr_2'],
      createdAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString()
    },
    {
      id: 'msg_2',
      conversationId: 'conv_1',
      senderId: 'usr_1',
      text: 'Amina, loved your latest designs! Looking forward to collaborating.',
      readBy: ['usr_1', 'usr_2'],
      createdAt: dayAgo
    },
    {
      id: 'msg_grp_1',
      conversationId: 'conv_grp_1',
      senderId: 'usr_1',
      text: 'Welcome everyone to the official NaijaConnect community chat!',
      readBy: ['usr_1'],
      createdAt: now
    }
  ];

  const seedNotifications = [
    {
      id: 'notif_1',
      userId: 'usr_1',
      senderId: 'usr_3',
      type: 'friend_request' as const,
      title: 'New Friend Request',
      body: 'Olumide Adebayo sent you a friend request.',
      link: '/friends',
      isRead: false,
      createdAt: dayAgo
    },
    {
      id: 'notif_2',
      userId: 'usr_1',
      senderId: 'usr_2',
      type: 'post_like' as const,
      title: 'Post Liked',
      body: 'Amina Bello reacted to your post about Yaba tech hackathon.',
      link: '/feed',
      isRead: true,
      createdAt: dayAgo
    }
  ];

  const seedAnnouncements = [
    {
      id: 'ann_1',
      title: 'Welcome to NaijaConnect!',
      message: 'Experience the real warmth, hustle, and brotherhood of Nigeria. Connect, chat, share and belong.',
      active: true,
      createdAt: now
    }
  ];

  return {
    users: seedUsers,
    friendships: seedFriendships,
    posts: seedPosts,
    comments: [
      {
        id: 'cm_1',
        postId: 'post_1',
        authorId: 'usr_2',
        content: 'Spot on Chidi! The ingenuity coming out of Yaba and across Nigeria is inspiring.',
        likes: ['usr_1', 'usr_4'],
        createdAt: dayAgo
      },
      {
        id: 'cm_2',
        postId: 'post_1',
        authorId: 'usr_4',
        content: 'Huge congratulations to the participants! Proud of our youth.',
        parentCommentId: 'cm_1',
        likes: ['usr_1'],
        createdAt: dayAgo
      }
    ],
    stories: seedStories,
    conversations: seedConversations,
    messages: seedMessages,
    notifications: seedNotifications,
    reports: [],
    groups: seedGroups,
    announcements: seedAnnouncements
  };
}

export function getDb(): DatabaseSchema {
  if (dbCache) return dbCache;

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(content) as DatabaseSchema;
      // Ensure all arrays exist
      if (!dbCache.users) dbCache.users = [];
      if (!dbCache.friendships) dbCache.friendships = [];
      if (!dbCache.posts) dbCache.posts = [];
      if (!dbCache.comments) dbCache.comments = [];
      if (!dbCache.stories) dbCache.stories = [];
      if (!dbCache.conversations) dbCache.conversations = [];
      if (!dbCache.messages) dbCache.messages = [];
      if (!dbCache.notifications) dbCache.notifications = [];
      if (!dbCache.reports) dbCache.reports = [];
      if (!dbCache.groups) dbCache.groups = [];
      if (!dbCache.announcements) dbCache.announcements = [];
      return dbCache;
    } catch (e) {
      console.error('Failed reading DB file, recreating initial data:', e);
    }
  }

  const initial = getInitialData();
  saveDb(initial);
  dbCache = initial;
  return dbCache;
}

export function saveDb(data: DatabaseSchema): void {
  dbCache = data;
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to save DB atomically:', err);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (directErr) {
      console.error('Direct write also failed:', directErr);
    }
  }
}
