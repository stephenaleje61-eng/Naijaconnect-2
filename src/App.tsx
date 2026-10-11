import React, { useState, useEffect } from 'react';
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

function MainApp() {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetChatUserId, setTargetChatUserId] = useState<string | null>(null);

  // System announcement banner
  const [announcement, setAnnouncement] = useState<{ title: string; message: string } | null>(null);

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
    setActiveTab(`profile_${userId}`);
  };

  const handleStartChatWithUser = (userId: string) => {
    setTargetChatUserId(userId);
    setActiveTab('chats');
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
          <button onClick={() => setAnnouncement(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreatePost={() => {
          if (!currentUser) setShowAuthModal(true);
          else setShowCreatePost(true);
        }}
        onOpenAuth={() => setShowAuthModal(true)}
        onSelectUser={handleSelectUser}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'feed' && (
          <FeedView
            onOpenCreatePost={() => {
              if (!currentUser) setShowAuthModal(true);
              else setShowCreatePost(true);
            }}
            onOpenCreateStory={() => {
              if (!currentUser) setShowAuthModal(true);
              else setShowCreateStory(true);
            }}
            onSelectUser={handleSelectUser}
            onStartChatWithUser={handleStartChatWithUser}
            onNavigateCommunities={() => setActiveTab('communities')}
          />
        )}

        {activeTab === 'chats' && (
          <ChatsView
            initialTargetUserId={targetChatUserId}
            onSelectUser={handleSelectUser}
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
            onStartChatWithGroup={() => setActiveTab('chats')}
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
        setActiveTab={setActiveTab}
        onOpenCreatePost={() => {
          if (!currentUser) setShowAuthModal(true);
          else setShowCreatePost(true);
        }}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={() => {
          // If on feed, reloads or state automatically updates
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
        onClose={() => setShowAuthModal(false)}
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
