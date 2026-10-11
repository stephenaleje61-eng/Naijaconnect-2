import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Flame,
  Compass,
  Users,
  MapPin,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  Smile,
  UserPlus,
  Check
} from 'lucide-react';
import type { Post, StoryAuthorGroup } from '../types/index.ts';
import { PostCard } from './PostCard.tsx';
import { StoryViewerModal } from './StoryViewerModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { NIGERIAN_STATES } from '../utils/constants.ts';

interface FeedViewProps {
  onOpenCreatePost: () => void;
  onOpenCreateStory: () => void;
  onSelectUser: (userId: string) => void;
  onStartChatWithUser: (userId: string) => void;
  onNavigateCommunities: () => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  onOpenCreatePost,
  onOpenCreateStory,
  onSelectUser,
  onStartChatWithUser,
  onNavigateCommunities
}) => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [feedFilter, setFeedFilter] = useState<'all' | 'friends' | 'state' | 'trending'>('all');
  const [selectedState, setSelectedState] = useState<string>(currentUser?.state || 'Lagos');

  // Stories
  const [storyGroups, setStoryGroups] = useState<StoryAuthorGroup[]>([]);
  const [activeStoryGroupIdx, setActiveStoryGroupIdx] = useState<number | null>(null);

  // Suggested friends
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [requestedFriendIds, setRequestedFriendIds] = useState<Set<string>>(new Set());

  // Load feed posts
  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const data = await api.getPosts(
        feedFilter,
        feedFilter === 'state' ? selectedState : undefined
      );
      setPosts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPosts(false);
    }
  }, [feedFilter, selectedState]);

  // Load stories
  const loadStories = useCallback(async () => {
    try {
      const data = await api.getStories();
      setStoryGroups(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load suggestions
  const loadSuggestions = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.getSuggestions();
      setSuggestions(data.slice(0, 5));
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    loadStories();
    loadSuggestions();
  }, [loadStories, loadSuggestions]);

  // Handle send friend request from sidebar
  const handleAddFriend = async (targetId: string) => {
    try {
      await api.sendFriendRequest(targetId);
      setRequestedFriendIds(prev => new Set(prev).add(targetId));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostUpdated = (updated: Post) => {
    setPosts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Feed Column */}
        <div className="lg:col-span-8 space-y-5">
          {/* Stories Horizontal Reel */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
              {/* Add Story Button for current user */}
              <button
                onClick={onOpenCreateStory}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
              >
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl sm:rounded-3xl p-0.5 bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-xs">
                  <div className="w-full h-full rounded-[14px] sm:rounded-[22px] bg-emerald-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Plus className="w-7 h-7 text-emerald-700 stroke-[2.5]" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white">
                    +
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-800 tracking-tight">Your Story</span>
              </button>

              {/* Story cards from other users across Nigeria */}
              {storyGroups.map((group, idx) => {
                const latestStory = group.stories[0];
                return (
                  <button
                    key={group.author.id}
                    onClick={() => setActiveStoryGroupIdx(idx)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
                  >
                    <div
                      className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl sm:rounded-3xl p-[2.5px] transition-transform group-hover:scale-105 ${
                        group.hasUnseen
                          ? 'bg-gradient-to-tr from-amber-400 via-emerald-500 to-green-600 ring-2 ring-emerald-500/30'
                          : 'bg-slate-200'
                      }`}
                    >
                      <img
                        src={group.author.avatarUrl}
                        alt={group.author.fullName}
                        className="w-full h-full rounded-[13px] sm:rounded-[21px] object-cover ring-2 ring-white"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 max-w-[68px] truncate">
                      {group.author.fullName.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create Post Banner Box */}
          {currentUser && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-3">
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/20"
                />
                <button
                  onClick={onOpenCreatePost}
                  className="flex-1 text-left px-4 py-3 bg-slate-100/90 hover:bg-slate-100 rounded-full text-slate-500 text-xs sm:text-sm font-medium transition cursor-pointer"
                >
                  What is happening in your area today, {currentUser.fullName.split(' ')[0]}?
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-600">
                <button
                  onClick={onOpenCreatePost}
                  className="flex items-center gap-2 p-1.5 px-3 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 font-semibold transition cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>Photo / Video</span>
                </button>

                <button
                  onClick={onOpenCreatePost}
                  className="flex items-center gap-2 p-1.5 px-3 rounded-xl hover:bg-amber-50 hover:text-amber-700 font-semibold transition cursor-pointer"
                >
                  <Smile className="w-4 h-4 text-amber-500" />
                  <span>Naija Mood</span>
                </button>

                <button
                  onClick={onOpenCreatePost}
                  className="flex items-center gap-2 p-1.5 px-3 rounded-xl hover:bg-teal-50 hover:text-teal-700 font-semibold transition cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <span>State Tag</span>
                </button>
              </div>
            </div>
          )}

          {/* Feed Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setFeedFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  feedFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>All Nigeria</span>
              </button>

              <button
                onClick={() => setFeedFilter('friends')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  feedFilter === 'friends'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Friends Only</span>
              </button>

              <button
                onClick={() => setFeedFilter('trending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  feedFilter === 'trending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Trending 🔥</span>
              </button>

              <button
                onClick={() => setFeedFilter('state')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  feedFilter === 'state'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>By State</span>
              </button>
            </div>

            {/* State Dropdown when filter is 'state' */}
            {feedFilter === 'state' && (
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="text-xs font-bold p-1.5 px-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 outline-none"
              >
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            <button
              onClick={loadPosts}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Refresh feed"
            >
              <RefreshCw className={`w-4 h-4 ${loadingPosts ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Posts List */}
          {loadingPosts ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs font-medium text-slate-500">Connecting to Nigerian feed...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-bold">
                🇳🇬
              </div>
              <h3 className="font-heading font-extrabold text-base text-slate-900">No posts in this feed yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Be the trendsetter! Share an update, business hustle, or greeting with the Naija community.
              </p>
              {currentUser && (
                <button
                  onClick={onOpenCreatePost}
                  className="mt-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-emerald-700 cursor-pointer"
                >
                  Create First Post
                </button>
              )}
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
                onSelectUser={onSelectUser}
              />
            ))
          )}
        </div>

        {/* Right Sidebar: Trends, Suggested Friends & Community Spotlight */}
        <div className="hidden lg:block lg:col-span-4 space-y-5 sticky top-20">
          {/* Pulse of Nigeria: Trending Topics */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="font-heading font-extrabold text-sm text-slate-900">
                Pulse of Nigeria
              </h3>
            </div>

            <div className="space-y-3">
              {[
                { tag: '#LagosTechWeek', posts: '1.4k posts', category: 'Technology · Lagos' },
                { tag: '#AfconQualifiers', posts: '3.2k posts', category: 'Sports · Super Eagles' },
                { tag: '#NaijaJollofDebate', posts: '980 posts', category: 'Culture & Food' },
                { tag: '#AbujaCreatives', posts: '640 posts', category: 'Arts & Media · FCT' },
                { tag: '#ArewaFashion2026', posts: '510 posts', category: 'Fashion · Northern Nigeria' }
              ].map((item, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <p className="text-[10px] text-slate-400 font-medium">{item.category}</p>
                  <p className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition">
                    {item.tag}
                  </p>
                  <p className="text-[10px] text-slate-400">{item.posts}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Friends */}
          {suggestions.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-extrabold text-sm text-slate-900">
                  People You May Know
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Nigeria
                </span>
              </div>

              <div className="space-y-3">
                {suggestions.map((u) => {
                  const hasRequested = requestedFriendIds.has(u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectUser(u.id)}
                        className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
                      >
                        <img
                          src={u.avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate hover:text-emerald-700">
                            {u.fullName}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {u.state} · @{u.username}
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleAddFriend(u.id)}
                        disabled={hasRequested}
                        className={`p-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer ${
                          hasRequested
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {hasRequested ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Sent</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Communities Spotlight Card */}
          <div className="bg-gradient-to-br from-emerald-800 to-green-950 rounded-3xl p-5 text-white shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-heading font-extrabold text-xs tracking-wider uppercase text-emerald-300">
                Explore Communities
              </span>
            </div>
            <h4 className="font-heading font-extrabold text-base leading-tight mb-2">
              Join Nigeria's Vibrant Hubs & Guilds
            </h4>
            <p className="text-xs text-emerald-100/90 leading-relaxed mb-4">
              Connect with fellow developers in Yaba, creative designers in Kano, or agri-innovators in Ibadan.
            </p>
            <button
              onClick={onNavigateCommunities}
              className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Browse Nigerian Groups
            </button>
          </div>
        </div>
      </div>

      {/* Story Viewer Modal */}
      {activeStoryGroupIdx !== null && (
        <StoryViewerModal
          groups={storyGroups}
          initialGroupIndex={activeStoryGroupIdx}
          isOpen={true}
          onClose={() => setActiveStoryGroupIdx(null)}
          onStartChatWithUser={onStartChatWithUser}
        />
      )}
    </div>
  );
};
