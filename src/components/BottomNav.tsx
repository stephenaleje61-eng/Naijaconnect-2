import React from 'react';
import { Compass, MessageSquare, Users, Sparkles, User as UserIcon, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreatePost: () => void;
  onOpenAuth: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreatePost,
  onOpenAuth
}) => {
  const { currentUser } = useAuth();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
      <button
        onClick={() => setActiveTab('feed')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
          activeTab === 'feed' ? 'text-emerald-700 font-bold' : 'text-slate-500'
        }`}
      >
        <Compass className={`w-5 h-5 mb-0.5 ${activeTab === 'feed' ? 'stroke-[2.5]' : ''}`} />
        <span>Feed</span>
      </button>

      <button
        onClick={() => setActiveTab('chats')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition cursor-pointer relative ${
          activeTab === 'chats' ? 'text-emerald-700 font-bold' : 'text-slate-500'
        }`}
      >
        <MessageSquare className={`w-5 h-5 mb-0.5 ${activeTab === 'chats' ? 'stroke-[2.5]' : ''}`} />
        <span>Chats</span>
      </button>

      {/* Floating Plus button */}
      <button
        onClick={currentUser ? onOpenCreatePost : onOpenAuth}
        className="flex items-center justify-center w-11 h-11 -mt-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-700/30 active:scale-95 transition cursor-pointer"
        aria-label="Create Post"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      <button
        onClick={() => setActiveTab('friends')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
          activeTab === 'friends' ? 'text-emerald-700 font-bold' : 'text-slate-500'
        }`}
      >
        <Users className={`w-5 h-5 mb-0.5 ${activeTab === 'friends' ? 'stroke-[2.5]' : ''}`} />
        <span>Friends</span>
      </button>

      <button
        onClick={() => {
          if (currentUser) {
            setActiveTab(`profile_${currentUser.id}`);
          } else {
            onOpenAuth();
          }
        }}
        className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
          activeTab.startsWith('profile') ? 'text-emerald-700 font-bold' : 'text-slate-500'
        }`}
      >
        {currentUser ? (
          <img
            src={currentUser.avatarUrl}
            alt=""
            className="w-5 h-5 rounded-full object-cover mb-0.5 ring-1 ring-emerald-500/50"
          />
        ) : (
          <UserIcon className="w-5 h-5 mb-0.5" />
        )}
        <span>Profile</span>
      </button>
    </div>
  );
};
