import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { FeedView } from './components/FeedView.tsx';
import { ChatsView } from './components/ChatsView.tsx';
import { FriendsView } from './components/FriendsView.tsx';
import { CommunitiesView } from './components/CommunitiesView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { AdminView } from './components/AdminView.tsx';
import { CreatePostModal } from './components/CreatePostModal.tsx';
import { CreateStoryModal } from './components/CreateStoryModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { PWAInstallBanner } from './components/PWAInstallBanner.tsx';
import { Megaphone, X } from 'lucide-react';

function getInitialRouteState() {
  const path = window.location.pathname.toLowerCase();
  if (path === '/login') {
    return { tab: 'feed', authOpen: true, authMode: 'login' as const };
  }
  if (path === '/register') {
    return { tab: 'feed', authOpen: true, authMode: 'register' as const };
  }
  if (path === '/forgot-password' || path === '/recover') {
    return { tab: 'feed', authOpen: true, authMode: 'recover' as const };
  }
  if (path === '/chats') {
    return { tab: 'chats', authOpen: false, authMode: 'login' as const };
  }
  if (path === '/friends') {
    return { tab: 'friends', authOpen: false, authMode: 'login' as const };
  }
  if (path === '/communities') {
    return { tab: 'communities', authOpen: false, authMode: 'login' as const };
  }
  if (path === '/admin') {
    return { tab: 'admin', authOpen: false, authMode: 'login' as const };
  }
  if (path.startsWith('/profile/')) {
    const userId = window.location.pathname.substring(9);
    return { tab: `profile_${userId}`, authOpen: false, authMode: 'login' as const };
  }
  return { tab: 'feed', authOpen: false, authMode: 'login' as const };
}

function MainApp() {
  const { currentUser } = useAuth();
  const initial = getInitialRouteState();
  const [activeTab, setActiveTab] = useState<string>(initial.tab);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(initial.authOpen);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'recover'>(initial.authMode);
  const [targetChatUserId, setTargetChatUserId] = useState<string | null>(null);

  // System announcement banner
  const [announcement, setAnnouncement] = useState<{ title: string; message: string } | null>(null);

  const navigateTo = useCallback((tab: string, pushHistory = true) => {
    setActiveTab(tab);
    if (pushHistory) {
      let targetPath = '/';
      if (tab === 'feed') targetPath = '/feed';
      else if (tab === 'chats') targetPath = '/chats';
      else if (tab === 'friends') targetPath = '/friends';
      else if (tab === 'communities') targetPath = '/communities';
      else if (tab === 'admin') targetPath = '/admin';
      else if (tab.startsWith('profile_')) targetPath = `/profile/${tab.replace('profile_', '')}`;

      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, []);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const state = getInitialRouteState();
      setActiveTab(state.tab);
      setShowAuthModal(state.authOpen);
      if (state.authOpen) {
        setAuthModalMode(state.authMode);
      }
    };

    const handleOpenAuthEvent = (e: any) => {
      const mode = e.detail?.mode || 'login';
      setAuthModalMode(mode);
      setShowAuthModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('open_auth', handleOpenAuthEvent);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('open_auth', handleOpenAuthEvent);
    };
  }, []);

  useEffect(() => {
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAnnouncement(data[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectUser = (userId: string) => {
    navigateTo(`profile_${userId}`);
  };

  const handleStartChatWithUser = (userId: string) => {
    setTargetChatUserId(userId);
    navigateTo('chats');
  };

  const handleOpenAuthModal = (mode: 'login' | 'register' | 'recover' = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
    const targetPath = mode === 'register' ? '/register' : mode === 'recover' ? '/forgot-password' : '/login';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
    // Reset path back to current tab route if we were on an auth route
    const current = window.location.pathname;
    if (current === '/login' || current === '/register' || current === '/forgot-password' || current === '/recover') {
      let fallbackPath = '/';
      if (activeTab === 'chats') fallbackPath = '/chats';
      else if (activeTab === 'friends') fallbackPath = '/friends';
      else if (activeTab === 'communities') fallbackPath = '/communities';
      else if (activeTab === 'admin') fallbackPath = '/admin';
      else if (activeTab.startsWith('profile_')) fallbackPath = `/profile/${activeTab.replace('profile_', '')}`;
      window.history.pushState(null, '', fallbackPath);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans pb-16 md:pb-0">
      {/* Top Announcement Bar if active */}
      {announcement && (
        <div className="bg-emerald-950 text-emerald-200 px-4 py-2 text-xs flex items-center justify-between z-50">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold text-white">{announcement.title}:</span>
            <span className="truncate">{announcement.message}</span>
          </div>
          <button onClick={() => setAnnouncement(null)} className="text-emerald-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => navigateTo(tab)}
        onOpenCreatePost={() => {
          if (!currentUser) handleOpenAuthModal('login');
          else setShowCreatePost(true);
        }}
        onOpenAuth={() => handleOpenAuthModal('login')}
        onSelectUser={handleSelectUser}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'feed' && (
          <FeedView
            onOpenCreatePost={() => {
              if (!currentUser) handleOpenAuthModal('login');
              else setShowCreatePost(true);
            }}
            onOpenCreateStory={() => {
              if (!currentUser) handleOpenAuthModal('login');
              else setShowCreateStory(true);
            }}
            onSelectUser={handleSelectUser}
            onStartChatWithUser={handleStartChatWithUser}
            onNavigateCommunities={() => navigateTo('communities')}
          />
        )}

        {activeTab === 'chats' && (
          <ChatsView
            initialTargetUserId={targetChatUserId}
            onSelectUser={handleSelectUser}
            onOpenAuth={() => handleOpenAuthModal('login')}
          />
        )}

        {activeTab === 'friends' && (
          <FriendsView
            onSelectUser={handleSelectUser}
            onStartChatWithUser={handleStartChatWithUser}
          />
        )}

        {activeTab === 'communities' && (
          <CommunitiesView
            onStartChatWithGroup={() => navigateTo('chats')}
          />
        )}

        {activeTab.startsWith('profile_') && (
          <ProfileView
            userId={activeTab.replace('profile_', '')}
            onStartChatWithUser={handleStartChatWithUser}
            onSelectUser={handleSelectUser}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView />
        )}
      </main>

      {/* Mobile Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => navigateTo(tab)}
        onOpenCreatePost={() => {
          if (!currentUser) handleOpenAuthModal('login');
          else setShowCreatePost(true);
        }}
        onOpenAuth={() => handleOpenAuthModal('login')}
      />

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={() => {
          // Post created
        }}
      />

      <CreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={() => {
          // Story created
        }}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuthModal}
        initialMode={authModalMode}
      />

      {/* PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
