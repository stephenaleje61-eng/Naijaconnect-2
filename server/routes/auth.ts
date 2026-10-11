import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, saveDb } from '../db.ts';
import { generateToken, sanitizeUser, requireAuth, type AuthenticatedRequest } from '../auth.ts';
import type { User } from '../types.ts';

const router = Router();

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

router.post('/register', (req, res) => {
  try {
    const { fullName, username, email, password, dob, state, city } = req.body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your real full name (at least 2 characters).' });
    }

    if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      return res.status(400).json({ error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (!state || !NIGERIAN_STATES.includes(state)) {
      return res.status(400).json({ error: 'Please select a valid Nigerian state or FCT Abuja.' });
    }

    const db = getDb();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    const existingEmail = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const existingUsername = db.users.find(u => u.username.toLowerCase() === cleanUsername);
    if (existingUsername) {
      return res.status(409).json({ error: 'This username is already taken. Please pick another one.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    const defaultAvatars = [
      '/nigeria-flag-circle.svg',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'
    ];
    const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      dob: dob || '2000-01-01',
      state,
      city: (city && city.trim()) || `${state} City`,
      bio: `Proudly connecting from ${state}, Nigeria! 🇳🇬`,
      avatarUrl: randomAvatar,
      coverUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&auto=format&fit=crop&q=80',
      occupation: 'Member @ NaijaConnect',
      interests: ['Networking', 'Nigeria', 'Culture'],
      role: 'user',
      isVerified: false,
      isSuspended: false,
      createdAt: now,
      lastActiveAt: now,
      privacy: {
        postsVisibility: 'public',
        showOnlineStatus: true,
        showLastActive: true
      }
    };

    db.users.push(newUser);

    // Create a welcome notification
    db.notifications.push({
      id: `notif_${Date.now()}`,
      userId: newUser.id,
      senderId: 'usr_admin',
      type: 'system',
      title: 'Welcome to NaijaConnect!',
      body: 'Welcome to Nigeria’s premier social network! Update your profile and say hello to friends across all 36 states.',
      link: '/feed',
      isRead: false,
      createdAt: now
    });

    saveDb(db);

    const token = generateToken(newUser);
    return res.status(201).json({
      message: 'Account registered successfully!',
      user: sanitizeUser(newUser),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to complete registration. Please try again.' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter your email/username and password.' });
    }

    const db = getDb();
    const cleanIdentifier = identifier.trim().toLowerCase();

    const user = db.users.find(
      u => u.email.toLowerCase() === cleanIdentifier || u.username.toLowerCase() === cleanIdentifier
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password. Please verify and try again.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'This account has been suspended for violating community guidelines. Contact support.' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email/username or password. Please verify and try again.' });
    }

    user.lastActiveAt = new Date().toISOString();
    saveDb(db);

    const token = generateToken(user);
    return res.json({
      message: 'Welcome back!',
      user: sanitizeUser(user),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Unable to log in at this moment. Please try again.' });
  }
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  const db = getDb();
  const unreadNotifs = db.notifications.filter(n => n.userId === req.user!.id && !n.isRead).length;

  return res.json({
    user: sanitizeUser(req.user),
    unreadNotificationsCount: unreadNotifs
  });
});

router.post('/recover-password', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid registered email address.' });
  }

  const db = getDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user) {
    return res.status(404).json({ error: 'No account was found with this email address.' });
  }

  // Generate secure temporary recovery reset
  const tempPass = 'Naija' + Math.floor(100000 + Math.random() * 900000) + '!';
  const salt = bcrypt.genSaltSync(10);
  user.passwordHash = bcrypt.hashSync(tempPass, salt);
  saveDb(db);

  return res.json({
    message: 'Password reset link and temporary passcode generated!',
    tempPasscode: tempPass,
    email: user.email,
    instructions: `For security testing, your temporary passcode is: ${tempPass}. You can log in with this passcode and update your password in Profile Settings.`
  });
});

export default router;
