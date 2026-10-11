import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  MapPin,
  Check,
  X,
  MessageSquare,
  ShieldBan,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { NIGERIAN_STATES } from '../utils/constants.ts';
import type { User } from '../types/index.ts';

interface FriendsViewProps {
  onSelectUser: (userId: string) => void;
  onStartChatWithUser: (userId: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  onSelectUser,
  onStartChatWithUser
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'incoming' | 'outgoing' | 'discover'>('friends');

  const [friends, setFriends] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Discover / Search
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverState, setDiscoverState] = useState('All');
  const [discoverResults, setDiscoverResults] = useState<User[]>([]);
  const [searchingDiscover, setSearchingDiscover] = useState(false);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  const loadFriendData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFriends();
      setFriends(data.friends || []);
      setIncomingRequests(data.incomingRequests || []);
      setOutgoingRequests(data.outgoingRequests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchDiscoverUsers = useCallback(async () => {
    setSearchingDiscover(true);
    try {
      const results = await api.searchUsers(discoverQuery, discoverState);
      setDiscoverResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingDiscover(false);
    }
  }, [discoverQuery, discoverState]);

  useEffect(() => {
    loadFriendData();
  }, [loadFriendData]);

  useEffect(() => {
    if (activeTab === 'discover') {
      searchDiscoverUsers();
    }
  }, [activeTab, searchDiscoverUsers]);

  // Actions
  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await api.acceptFriendRequest(friendshipId);
      loadFriendData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      await api.declineFriendRequest(friendshipId);
      setIncomingRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelRequest = async (friendshipId: string) => {
    try {
      await api.cancelFriendRequest(friendshipId);
      setOutgoingRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnfriend = async (targetId: string) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await api.unfriend(targetId);
      setFriends(prev => prev.filter(f => f.id !== targetId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendRequest = async (targetId: string) => {
    try {
      await api.sendFriendRequest(targetId);
      setRequestedIds(prev => new Set(prev).add(targetId));
      loadFriendData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-900 rounded-3xl p-6 text-white shadow-md flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🇳🇬</span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Connections Network
            </span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight">
            Naija Friends & Family
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
            Build meaningful friendships across all 36 Nigerian states and the FCT.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('discover')}
          className="px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4 text-emerald-700" />
          <span>Find People by State</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'friends'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All Friends ({friends.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'incoming'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Received Requests ({incomingRequests.length})</span>
          {incomingRequests.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] flex items-center justify-center font-black">
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'outgoing'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Sent Requests ({outgoingRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('discover')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'discover'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Discover Nigerians</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl">
                🤝
              </div>
              <h3 className="font-heading font-extrabold text-base text-slate-900">
                You haven't added any friends yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore the Discover tab to connect with software devs, traders, students, and professionals in your area.
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="mt-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Find Friends Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-white rounded-2xl sm:rounded-3xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onSelectUser(friend.id)}
                      className="relative shrink-0 cursor-pointer"
                    >
                      <img
                        src={friend.avatarUrl}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/20"
                      />
                      {friend.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => onSelectUser(friend.id)}
                        className="font-bold text-sm text-slate-900 hover:text-emerald-700 truncate block text-left"
                      >
                        {friend.fullName}
                      </button>
                      <p className="text-xs text-slate-500 truncate">@{friend.username}</p>
                      <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {friend.state}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => onStartChatWithUser(friend.id)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                    <button
                      onClick={() => handleUnfriend(friend.id)}
                      className="py-1.5 px-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                      title="Unfriend"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Incoming Requests */}
      {activeTab === 'incoming' && (
        <div>
          {incomingRequests.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500">No incoming friend requests right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {incomingRequests.map((req) => (
                <div
                  key={req.friendshipId}
                  className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img src={req.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{req.fullName}</h4>
                      <p className="text-xs text-slate-500">@{req.username}</p>
                      <p className="text-[11px] text-emerald-700 font-medium">{req.state}, Nigeria</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleAcceptRequest(req.friendshipId)}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.friendshipId)}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outgoing Requests */}
      {activeTab === 'outgoing' && (
        <div>
          {outgoingRequests.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500">You don't have any pending sent requests.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {outgoingRequests.map((req) => (
                <div
                  key={req.friendshipId}
                  className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={req.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 truncate">{req.fullName}</p>
                      <p className="text-[10px] text-slate-500">{req.state}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancelRequest(req.friendshipId)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-red-600 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discover People across Nigerian states */}
      {activeTab === 'discover' && (
        <div className="space-y-4">
          {/* Search & State Filter controls */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, occupation, or town..."
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-700" />
              <select
                value={discoverState}
                onChange={(e) => setDiscoverState(e.target.value)}
                className="text-xs font-bold p-2 px-3 bg-slate-100 rounded-xl text-slate-800 outline-none border-none"
              >
                <option value="All">All 36 States + FCT</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Grid */}
          {searchingDiscover ? (
            <div className="py-8 text-center text-xs text-slate-400">Discovering members across Nigeria...</div>
          ) : discoverResults.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500">No members found with those search filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {discoverResults.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isAlreadyFriend = u.friendshipStatus === 'friends';
                const isPendingSent = u.friendshipStatus === 'pending_sent' || requestedIds.has(u.id);

                return (
                  <div
                    key={u.id}
                    className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <button onClick={() => onSelectUser(u.id)} className="cursor-pointer shrink-0">
                          <img
                            src={u.avatarUrl}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/20"
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => onSelectUser(u.id)}
                            className="font-bold text-sm text-slate-900 hover:text-emerald-700 truncate block text-left"
                          >
                            {u.fullName}
                          </button>
                          <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                            {u.state}, Nigeria
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                        {u.bio}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => onSelectUser(u.id)}
                        className="text-xs font-semibold text-slate-600 hover:text-emerald-700"
                      >
                        View Profile
                      </button>

                      {!isSelf && (
                        isAlreadyFriend ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                            ✓ Friends
                          </span>
                        ) : isPendingSent ? (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
                            Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(u.id)}
                            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Friend</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
