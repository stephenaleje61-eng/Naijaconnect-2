import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { getDb, saveDb } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'naijaconnect_super_secret_jwt_key_2026_secured';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
}

const activeClients = new Map<string, Set<WebSocket>>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    let currentUserId: string | null = null;

    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');

      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        currentUserId = decoded.id;

        if (!activeClients.has(currentUserId)) {
          activeClients.set(currentUserId, new Set());
        }
        activeClients.get(currentUserId)!.add(ws);

        // Update lastActiveAt in database
        const db = getDb();
        const user = db.users.find(u => u.id === currentUserId);
        if (user) {
          user.lastActiveAt = new Date().toISOString();
          saveDb(db);
        }

        // Broadcast presence
        broadcastPresence(currentUserId, true);
      }
    } catch {
      // Allow unauthenticated connection or handle failure gracefully
    }

    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'auth' && payload.token) {
          const decoded = jwt.verify(payload.token, JWT_SECRET) as { id: string };
          currentUserId = decoded.id;
          if (!activeClients.has(currentUserId)) {
            activeClients.set(currentUserId, new Set());
          }
          activeClients.get(currentUserId)!.add(ws);
          broadcastPresence(currentUserId, true);
          ws.send(JSON.stringify({ type: 'auth_success', userId: currentUserId }));
          return;
        }

        if (payload.type === 'typing' && currentUserId && payload.conversationId) {
          broadcastToConversationMembers(payload.conversationId, currentUserId, {
            type: 'typing',
            conversationId: payload.conversationId,
            userId: currentUserId,
            isTyping: !!payload.isTyping
          });
        }

        if (payload.type === 'mark_read' && currentUserId && payload.conversationId) {
          const db = getDb();
          let changed = false;
          db.messages.forEach(m => {
            if (m.conversationId === payload.conversationId && !m.readBy.includes(currentUserId!)) {
              m.readBy.push(currentUserId!);
              changed = true;
            }
          });
          if (changed) saveDb(db);

          broadcastToConversationMembers(payload.conversationId, currentUserId, {
            type: 'messages_read',
            conversationId: payload.conversationId,
            userId: currentUserId
          });
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      if (currentUserId && activeClients.has(currentUserId)) {
        const clientSet = activeClients.get(currentUserId)!;
        clientSet.delete(ws);
        if (clientSet.size === 0) {
          activeClients.delete(currentUserId);
          broadcastPresence(currentUserId, false);

          const db = getDb();
          const user = db.users.find(u => u.id === currentUserId);
          if (user) {
            user.lastActiveAt = new Date().toISOString();
            saveDb(db);
          }
        }
      }
    });
  });

  return wss;
}

export function isUserOnline(userId: string): boolean {
  return activeClients.has(userId) && (activeClients.get(userId)?.size ?? 0) > 0;
}

export function getOnlineUserIds(): string[] {
  return Array.from(activeClients.keys());
}

export function broadcastToUser(userId: string, data: unknown) {
  const sockets = activeClients.get(userId);
  if (sockets) {
    const payload = JSON.stringify(data);
    sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }
}

export function broadcastToConversationMembers(
  conversationId: string,
  excludeUserId: string | null,
  data: unknown
) {
  const db = getDb();
  const conv = db.conversations.find(c => c.id === conversationId);
  if (!conv) return;

  const payload = JSON.stringify(data);

  // If public lounge, broadcast to every active user
  if (conversationId === 'conv_public_lounge') {
    activeClients.forEach((sockets, uid) => {
      if (uid !== excludeUserId) {
        sockets.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
          }
        });
      }
    });
    return;
  }

  conv.memberIds.forEach(memberId => {
    if (memberId !== excludeUserId) {
      const sockets = activeClients.get(memberId);
      if (sockets) {
        sockets.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
          }
        });
      }
    }
  });
}

function broadcastPresence(userId: string, isOnline: boolean) {
  const payload = JSON.stringify({
    type: 'presence',
    userId,
    isOnline,
    lastActiveAt: new Date().toISOString()
  });

  activeClients.forEach((sockets) => {
    sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  });
}
