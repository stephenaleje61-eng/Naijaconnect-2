import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Calendar,
  Briefcase,
  Edit3,
  MessageSquare,
  UserPlus,
  Check,
  Shield,
  Camera,
  Settings,
  X,
  Share2
} from 'lucide-react';
import type { User, Post } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { PostCard } from './PostCard.tsx';
import { NIGERIAN_STATES } from '../utils/constants.ts';

interface ProfileViewProps {
  userId: string;
  onStartChatWithUser: (userId: string) => void;
  onSelectUser: (userId: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userId,
  onStartChatWithUser,
  onSelectUser
}) => {
  const { currentUser, updateCurrentUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editState, setEditState] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editInterests, setEditInterests] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editShowOnline, setEditShowOnline] = useState(true);
  const [editShowLastActive, setEditShowLastActive] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const isSelf = currentUser?.id === userId;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProfile(userId);
      setProfile(data);

      // Load user's posts
      const userPosts = await api.getPosts('all', undefined, userId);
      setPosts(userPosts);

      // Initialize edit fields
      if (isSelf) {
        setEditFullName(data.fullName);
        setEditBio(data.bio || '');
        setEditState(data.state || 'Lagos');
        setEditCity(data.city || '');
        setEditOccupation(data.occupation || '');
        setEditInterests((data.interests || []).join(', '));
        setEditAvatarUrl(data.avatarUrl);
        setEditCoverUrl(data.coverUrl);
        setEditShowOnline(data.privacy?.showOnlineStatus ?? true);
        setEditShowLastActive(data.privacy?.showLastActive ?? true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, isSelf]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await api.updateProfile({
        fullName: editFullName,
        bio: editBio,
        state: editState,
        city: editCity,
        occupation: editOccupation,
        interests: editInterests.split(',').map(s => s.trim()).filter(Boolean),
        avatarUrl: editAvatarUrl,
        coverUrl: editCoverUrl,
        privacy: {
          showOnlineStatus: editShowOnline,
          showLastActive: editShowLastActive
        }
      });
      setProfile(prev => ({ ...prev!, ...updated.user }));
      updateCurrentUser(updated.user);
      setShowEditModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!profile) return;
    try {
      await api.sendFriendRequest(profile.id);
      setProfile(prev => ({ ...prev!, friendshipStatus: 'pending_sent' }));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading user profile...</div>;
  }

  if (!profile) {
    return <div className="py-20 text-center text-xs text-slate-400">Profile not found.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Cover and Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Cover image */}
        <div className="h-44 sm:h-64 bg-emerald-900 relative">
          <img
            src={profile.coverUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        </div>

        {/* Profile info block */}
        <div className="p-5 sm:p-6 sm:pb-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar */}
            <div className="relative">
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-white shadow-md bg-white"
              />
              {profile.isOnline && (
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {isSelf ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onStartChatWithUser(profile.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>

                  {profile.friendshipStatus === 'friends' ? (
                    <span className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Friends</span>
                    </span>
                  ) : profile.friendshipStatus === 'pending_sent' ? (
                    <span className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs">
                      Request Pending
                    </span>
                  ) : (
                    <button
                      onClick={handleSendFriendRequest}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Add Friend</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* User Names & Badges */}
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900">
                {profile.fullName}
              </h1>
              {profile.isVerified && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                  VERIFIED NIGERIAN
                </span>
              )}
              {profile.role === 'admin' && (
                <span className="bg-red-100 text-red-800 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">@{profile.username}</p>

            {/* Bio */}
            <p className="text-xs sm:text-sm text-slate-700 mt-2.5 max-w-2xl leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>

            {/* Meta tags */}
            <div className="flex items-center justify-center sm:justify-start gap-4 flex-wrap text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {profile.city ? `${profile.city}, ` : ''}{profile.state}, Nigeria
              </span>

              {profile.occupation && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {profile.occupation}
                </span>
              )}

              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-center sm:justify-start gap-6 mt-4">
              <div>
                <span className="font-extrabold text-sm text-slate-900">{profile.friendsCount || 0}</span>
                <span className="text-xs text-slate-500 ml-1">Friends</span>
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900">{profile.postsCount || posts.length}</span>
                <span className="text-xs text-slate-500 ml-1">Posts</span>
              </div>
            </div>

            {/* Interests chips */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap mt-3">
                {profile.interests.map((it, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full"
                  >
                    #{it}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 border-t border-slate-100 px-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition cursor-pointer ${
              activeTab === 'posts'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Posts ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition cursor-pointer ${
              activeTab === 'about'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            About & Security
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'posts' ? (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500">No posts published yet by {profile.fullName}.</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onSelectUser={onSelectUser}
              />
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-heading font-extrabold text-base text-slate-900">
            About {profile.fullName}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block mb-0.5">Location</span>
              <span className="font-bold text-slate-800">{profile.city || profile.state}, Nigeria</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block mb-0.5">Occupation</span>
              <span className="font-bold text-slate-800">{profile.occupation || 'Member'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block mb-0.5">Online Status</span>
              <span className="font-bold text-emerald-700">
                {profile.privacy?.showOnlineStatus ? (profile.isOnline ? 'Online now' : 'Active recently') : 'Hidden'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block mb-0.5">Account Status</span>
              <span className="font-bold text-slate-800">Verified Nigerian Citizen</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-heading font-extrabold text-base text-slate-900">
                Edit Profile
              </span>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name:</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bio:</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">State:</label>
                  <select
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    {NIGERIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City/Town:</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Occupation:</label>
                <input
                  type="text"
                  value={editOccupation}
                  onChange={(e) => setEditOccupation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Interests (comma separated):</label>
                <input
                  type="text"
                  placeholder="Tech, Afrobeats, Jollof, Football"
                  value={editInterests}
                  onChange={(e) => setEditInterests(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Avatar Image URL:</label>
                <input
                  type="text"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Privacy toggles */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                <span className="text-xs font-bold text-emerald-900 block">Privacy Controls:</span>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editShowOnline}
                    onChange={(e) => setEditShowOnline(e.target.checked)}
                    className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Show when I am online</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editShowLastActive}
                    onChange={(e) => setEditShowLastActive(e.target.checked)}
                    className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Show my last active time</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
