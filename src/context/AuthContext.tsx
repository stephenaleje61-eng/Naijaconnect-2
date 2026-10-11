import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types/index.ts';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api.ts';
import { socketClient } from '../services/socket.ts';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  unreadNotificationsCount: number;
  login: (identifier: string, password: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => void;
  switchUser: (email: string) => Promise<void>;
  updateCurrentUser: (updated: Partial<User>) => void;
  refreshMe: () => Promise<void>;
  decrementUnreadNotifs: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const refreshMe = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setCurrentUser(data.user);
      setUnreadNotificationsCount(data.unreadNotificationsCount || 0);
      socketClient.connect();
    } catch {
      removeStoredToken();
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  // Listen to live socket events for current user
  useEffect(() => {
    if (!currentUser) return;

    const unsubNotif = socketClient.on('notification', () => {
      setUnreadNotificationsCount(prev => prev + 1);
    });

    const unsubReq = socketClient.on('new_friend_request', () => {
      setUnreadNotificationsCount(prev => prev + 1);
    });

    return () => {
      unsubNotif();
      unsubReq();
    };
  }, [currentUser]);

  const login = async (identifier: string, password: string): Promise<User> => {
    const res = await api.login({ identifier, password });
    setStoredToken(res.token);
    setCurrentUser(res.user);
    socketClient.connect();
    return res.user;
  };

  const register = async (data: any): Promise<User> => {
    const res = await api.register(data);
    setStoredToken(res.token);
    setCurrentUser(res.user);
    socketClient.connect();
    return res.user;
  };

  const logout = () => {
    removeStoredToken();
    socketClient.disconnect();
    setCurrentUser(null);
    setUnreadNotificationsCount(0);
  };

  // Quick switch function between demo Nigerian accounts
  const switchUser = async (email: string) => {
    setLoading(true);
    try {
      const res = await api.login({ identifier: email, password: 'Password123!' });
      setStoredToken(res.token);
      setCurrentUser(res.user);
      socketClient.disconnect();
      socketClient.connect();
    } catch (err: any) {
      console.error('Error switching user:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentUser = (updated: Partial<User>) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...updated });
    }
  };

  const decrementUnreadNotifs = () => {
    setUnreadNotificationsCount(0);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        unreadNotificationsCount,
        login,
        register,
        logout,
        switchUser,
        updateCurrentUser,
        refreshMe,
        decrementUnreadNotifs
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
