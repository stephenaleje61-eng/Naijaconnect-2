import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Users,
  Plus,
  MapPin,
  Search,
  MessageSquare,
  Check,
  X,
  Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { NIGERIAN_STATES, NIGERIAN_COMMUNITY_CATEGORIES } from '../utils/constants.ts';
import type { Group } from '../types/index.ts';

interface CommunitiesViewProps {
  onStartChatWithGroup?: (groupId: string) => void;
}

export const CommunitiesView: React.FC<CommunitiesViewProps> = ({
  onStartChatWithGroup
}) => {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Create Group Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState(NIGERIAN_COMMUNITY_CATEGORIES[1]);
  const [newGroupState, setNewGroupState] = useState(currentUser?.state || 'Lagos');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getGroups(selectedCategory, selectedState, searchQuery);
      setGroups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedState, searchQuery]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleJoin = async (groupId: string) => {
    if (!currentUser) return;
    try {
      await api.joinGroup(groupId);
      setGroups(prev =>
        prev.map(g =>
          g.id === groupId
            ? { ...g, isMember: true, membersCount: g.membersCount + 1 }
            : g
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeave = async (groupId: string) => {
    try {
      await api.leaveGroup(groupId);
      setGroups(prev =>
        prev.map(g =>
          g.id === groupId
            ? { ...g, isMember: false, membersCount: Math.max(0, g.membersCount - 1) }
            : g
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreatingGroup(true);
    try {
      await api.createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        category: newGroupCategory,
        stateLocation: newGroupState
      });
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      loadGroups();
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-950 rounded-3xl p-6 text-white shadow-md flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Nigerian Communities & Hubs
            </span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight">
            Explore & Connect
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-lg">
            Join public guilds, tech hubs, agricultural forums, and cultural associations across Nigeria.
          </p>
        </div>

        {currentUser && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>Create Community</span>
          </button>
        )}
      </div>

      {/* Filter Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {NIGERIAN_COMMUNITY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search and State dropdown */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 rounded-xl text-xs sm:text-sm text-slate-800 outline-none"
          />
        </div>

        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="text-xs font-bold p-2 px-3 bg-slate-100 rounded-xl text-slate-800 outline-none"
        >
          <option value="All">All States</option>
          {NIGERIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading communities...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500">No communities found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="h-28 bg-slate-100 relative">
                  <img
                    src={group.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-800 text-white shadow-xs">
                      {group.category}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-heading font-extrabold text-base text-slate-900 line-clamp-1">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-0.5 text-emerald-700 font-semibold">
                      <MapPin className="w-3 h-3" />
                      {group.stateLocation}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {group.membersCount} members
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {group.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0">
                {group.isMember ? (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-center py-2 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl">
                      ✓ Joined
                    </span>
                    <button
                      onClick={() => handleLeave(group.id)}
                      className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                    >
                      Leave
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleJoin(group.id)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Join Community
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-heading font-extrabold text-base text-slate-900">
                Create Community Group
              </span>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Group Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Lagos Tech Builders, Arewa Writers"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category:</label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
                >
                  {NIGERIAN_COMMUNITY_CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nigerian State:</label>
                <select
                  value={newGroupState}
                  onChange={(e) => setNewGroupState(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
                >
                  {NIGERIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description:</label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  rows={3}
                  placeholder="What is this community about? Share guidelines or mission..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={creatingGroup || !newGroupName.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                Create Community
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
