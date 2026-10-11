import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSchema, User, Post, Story, Conversation, Group, Message } from './types.ts';

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NOW_REGION
);

const SOURCE_DB_FILE = path.resolve(process.cwd(), 'data', 'naijaconnect.json');
const DB_FILE = isServerless ? path.resolve('/tmp', 'naijaconnect.json') : SOURCE_DB_FILE;

// Ensure data directory exists if possible
try {
  const dataDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch {
  // Read-only filesystem fallback
}

let dbCache: DatabaseSchema | null = null;

function getInitialData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('Password123!', salt);
  const now = new Date().toISOString();

  // ONLY Genuine Platform Administrator (No fake users)
  const seedUsers: User[] = [
    {
      id: 'usr_admin',
      fullName: 'NaijaConnect Admin',
      username: 'admin',
      email: 'admin@naijaconnect.ng',
      passwordHash: adminPasswordHash,
      dob: '1990-01-01',
      state: 'FCT - Abuja',
      city: 'Maitama, Abuja',
      bio: 'Official Administrator of NaijaConnect. Welcome to Nigeria’s digital town square! Connect, chat, and share across all 36 states and the FCT.',
      avatarUrl: '/nigeria-flag-circle.svg',
      coverUrl: '/nigeria-flag-banner.svg',
      occupation: 'Platform Administrator',
      interests: ['Community', 'Tech', 'Governance', 'Nigeria'],
      role: 'admin',
      isVerified: true,
      isSuspended: false,
      createdAt: now,
      lastActiveAt: now,
      privacy: { postsVisibility: 'public', showOnlineStatus: true, showLastActive: true }
    }
  ];

  // Official platform welcome post
  const seedPosts: Post[] = [
    {
      id: 'post_welcome',
      authorId: 'usr_admin',
      content: 'Welcome to NaijaConnect — Nigeria’s premier digital town square! 🇳🇬 Connect with friends across all 36 states and the FCT, share your hustle, join communities, and chat in real time. We are proud of our heritage, culture, and innovation. Connect. Chat. Share. Belong!',
      mediaUrls: [
        '/nigeria-flag.svg'
      ],
      feeling: 'Feeling patriotic in Abuja, FCT',
      locationState: 'FCT - Abuja',
      likes: [],
      reactions: {},
      shares: [],
      isEdited: false,
      createdAt: now,
      updatedAt: now
    }
  ];

  // Public National Town Square chat for all real registered users
  const seedConversations: Conversation[] = [
    {
      id: 'conv_public_lounge',
      type: 'group',
      name: 'Naija National Town Square 🇳🇬',
      memberIds: ['usr_admin'],
      creatorId: 'usr_admin',
      avatarUrl: '/nigeria-flag-circle.svg',
      updatedAt: now,
      lastMessage: {
        text: 'Welcome to NaijaConnect Town Square! 🇳🇬',
        senderId: 'usr_admin',
        createdAt: now
      }
    }
  ];

  const seedMessages: Message[] = [
    {
      id: 'msg_welcome',
      conversationId: 'conv_public_lounge',
      senderId: 'usr_admin',
      text: 'Welcome to NaijaConnect Town Square! 🇳🇬 Introduce yourself and let everyone know which state you are connecting from.',
      readBy: ['usr_admin'],
      createdAt: now
    }
  ];

  // Authentic Nigerian community hubs for real registered users to join
  const seedGroups: Group[] = [
    {
      id: 'grp_tech',
      name: 'Tech & Developers Nigeria',
      description: 'Network for Nigerian software engineers, product designers, data experts, founders, and tech enthusiasts.',
      category: 'Tech & Innovation',
      avatarUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&auto=format&fit=crop&q=80',
      creatorId: 'usr_admin',
      memberIds: ['usr_admin'],
      stateLocation: 'All Nigeria',
      createdAt: now
    },
    {
      id: 'grp_food',
      name: 'Naija Foodies & Jollof Hub',
      description: 'Celebrating Nigerian cuisine from smoky party Jollof to Afang soup, Amala with Gbegiri, Suya, and Kilishi.',
      category: 'Food & Lifestyle',
      avatarUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop&q=80',
      creatorId: 'usr_admin',
      memberIds: ['usr_admin'],
      stateLocation: 'All Nigeria',
      createdAt: now
    },
    {
      id: 'grp_lagos',
      name: 'Lagos Connect & Hustle',
      description: 'Networking and business collaboration for residents, creators, and entrepreneurs in Lagos State.',
      category: 'Business & Networking',
      avatarUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=400&auto=format&fit=crop&q=80',
      creatorId: 'usr_admin',
      memberIds: ['usr_admin'],
      stateLocation: 'Lagos',
      createdAt: now
    },
    {
      id: 'grp_abuja',
      name: 'Abuja & FCT Network',
      description: 'Connecting professionals, creatives, and residents across the Federal Capital Territory and northern regions.',
      category: 'Community & Culture',
      avatarUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&auto=format&fit=crop&q=80',
      creatorId: 'usr_admin',
      memberIds: ['usr_admin'],
      stateLocation: 'FCT - Abuja',
      createdAt: now
    },
    {
      id: 'grp_music',
      name: 'Naija Music, Comedy & Afrobeats',
      description: 'Discussing the freshest Afrobeats bangers, skits, Nollywood releases, and entertainment updates.',
      category: 'Entertainment',
      avatarUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
      creatorId: 'usr_admin',
      memberIds: ['usr_admin'],
      stateLocation: 'All Nigeria',
      createdAt: now
    },
    {
      id: 'grp_sports',
      name: 'Super Eagles & Naija Sports',
      description: 'Passionate football banter, Premier League analysis, and unwavering support for Nigeria’s national teams.',
      category: 'Sports',
      avatarUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&auto=format&fit=crop&q=80',
      creatorId: 'usr_admin',
      memberIds: ['usr_admin'],
      stateLocation: 'All Nigeria',
      createdAt: now
    }
  ];

  const seedAnnouncements = [
    {
      id: 'ann_welcome',
      title: 'Welcome to NaijaConnect',
      message: 'Connect. Chat. Share. Belong. Welcome to Nigeria’s premier social network across all 36 states and the FCT.',
      active: true,
      createdAt: now
    }
  ];

  return {
    users: seedUsers,
    friendships: [],
    posts: seedPosts,
    comments: [],
    stories: [],
    conversations: seedConversations,
    messages: seedMessages,
    notifications: [],
    reports: [],
    groups: seedGroups,
    announcements: seedAnnouncements
  };
}

export function getDb(): DatabaseSchema {
  if (dbCache) return dbCache;

  // 1. Try reading from active DB_FILE
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(content) as DatabaseSchema;
      ensureSchemaArrays(dbCache);
      return dbCache;
    } catch (e) {
      console.error('Failed reading DB_FILE, attempting fallback:', e);
    }
  }

  // 2. If running on serverless and /tmp is not yet populated, check SOURCE_DB_FILE
  if (isServerless && fs.existsSync(SOURCE_DB_FILE)) {
    try {
      const content = fs.readFileSync(SOURCE_DB_FILE, 'utf-8');
      dbCache = JSON.parse(content) as DatabaseSchema;
      ensureSchemaArrays(dbCache);
      saveDb(dbCache);
      return dbCache;
    } catch (e) {
      console.error('Failed reading SOURCE_DB_FILE:', e);
    }
  }

  // 3. Fallback to fresh initial data
  const initial = getInitialData();
  dbCache = initial;
  saveDb(initial);
  return dbCache;
}

function ensureSchemaArrays(db: DatabaseSchema) {
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.friendships)) db.friendships = [];
  if (!Array.isArray(db.posts)) db.posts = [];
  if (!Array.isArray(db.comments)) db.comments = [];
  if (!Array.isArray(db.stories)) db.stories = [];
  if (!Array.isArray(db.conversations)) db.conversations = [];
  if (!Array.isArray(db.messages)) db.messages = [];
  if (!Array.isArray(db.notifications)) db.notifications = [];
  if (!Array.isArray(db.reports)) db.reports = [];
  if (!Array.isArray(db.groups)) db.groups = [];
  if (!Array.isArray(db.announcements)) db.announcements = [];
}

export function saveDb(data: DatabaseSchema): void {
  dbCache = data;
  try {
    const activeDir = path.dirname(DB_FILE);
    if (!fs.existsSync(activeDir)) {
      fs.mkdirSync(activeDir, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (directErr) {
      // In serverless environments, retain in-memory state without crashing
      console.warn('Filesystem write failed, keeping database state in memory:', directErr);
    }
  }
}
