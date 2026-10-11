import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Users,
  Flag,
  FileText,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Ban,
  BadgeCheck,
  Megaphone,
  Trash2,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import type { Report, User, Announcement } from '../types/index.ts';

export const AdminView: React.FC = () => {
  const { currentUser } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'users' | 'announcements'>('overview');

  // Announcement modal
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [showAnnModal, setShowAnnModal] = useState(false);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
      const rep = await api.getAdminReports();
      setReports(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="font-heading font-black text-xl text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500">
          This portal is reserved for authorized platform administrators.
        </p>
      </div>
    );
  }

  const handleUserAction = async (userId: string, action: string) => {
    try {
      await api.applyUserAction(userId, action);
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveReport = async (reportId: string, actionTaken: string) => {
    try {
      await api.resolveReport(reportId, 'resolved', actionTaken);
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;
    try {
      await api.createAnnouncement(annTitle.trim(), annMessage.trim());
      setShowAnnModal(false);
      setAnnTitle('');
      setAnnMessage('');
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await api.deleteAnnouncement(id);
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-red-400">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              NaijaConnect Security Center
            </span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight">
            Administrative Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time platform oversight, content moderation, abuse control & system health.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          title="Refresh statistics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overview Stat Cards */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Registered Users', val: overview.stats.totalUsers, icon: Users, color: 'text-emerald-600' },
            { label: 'Active Today', val: overview.stats.activeToday, icon: CheckCircle, color: 'text-teal-600' },
            { label: 'Published Posts', val: overview.stats.totalPosts, icon: FileText, color: 'text-blue-600' },
            { label: 'Chat Messages', val: overview.stats.totalMessages, icon: MessageSquare, color: 'text-indigo-600' },
            { label: 'Pending Reports', val: overview.stats.pendingReports, icon: AlertTriangle, color: 'text-red-500' },
            { label: 'Communities', val: overview.stats.totalGroups, icon: ShieldAlert, color: 'text-amber-500' }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-500">{item.label}</span>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <p className="font-heading font-extrabold text-xl text-slate-900">{item.val}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Platform Reports ({reports.filter(r => r.status === 'pending').length} Pending)
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'users' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          User Moderation
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'announcements' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Announcements
        </button>
      </div>

      {/* Reports Queue */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-base text-slate-900">
              Content Abuse & Moderation Queue
            </h3>
          </div>

          {reports.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-xs text-slate-400">
              No reports filed. The community is healthy and thriving!
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                        {rep.reason}
                      </span>
                      <span className="text-xs text-slate-400">
                        Target: {rep.targetType.toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rep.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {rep.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700">
                      Reported by: <span className="font-bold">{rep.reporter?.fullName || 'Anonymous'}</span>
                    </p>

                    {rep.target?.content && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                        "{rep.target.content}"
                      </p>
                    )}

                    {rep.details && (
                      <p className="text-[11px] text-slate-500">
                        Details: {rep.details}
                      </p>
                    )}
                  </div>

                  {rep.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveReport(rep.id, 'dismissed')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, 'delete_post')}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                      >
                        Remove Content
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Moderation Queue */}
      {activeTab === 'users' && overview && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-heading font-extrabold text-sm text-slate-900">
            Recent Users Registry
          </div>
          <div className="divide-y divide-slate-100">
            {overview.recentUsers.map((u: User) => (
              <div key={u.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{u.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">@{u.username} · {u.state} · {u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {u.isVerified ? (
                    <button
                      onClick={() => handleUserAction(u.id, 'unverify')}
                      className="px-2.5 py-1 text-xs text-emerald-800 bg-emerald-50 rounded-lg font-semibold"
                    >
                      Verified ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserAction(u.id, 'verify')}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:text-emerald-700 bg-slate-100 rounded-lg font-semibold"
                    >
                      Grant Verification
                    </button>
                  )}

                  {u.isSuspended ? (
                    <button
                      onClick={() => handleUserAction(u.id, 'unsuspend')}
                      className="px-2.5 py-1 text-xs text-red-600 bg-red-50 rounded-lg font-bold"
                    >
                      Unsuspend
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserAction(u.id, 'suspend')}
                      className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg font-semibold"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && overview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-base text-slate-900">
              Platform Announcements
            </h3>
            <button
              onClick={() => setShowAnnModal(true)}
              className="px-3.5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Broadcast Announcement</span>
            </button>
          </div>

          <div className="space-y-3">
            {overview.announcements.map((ann: Announcement) => (
              <div key={ann.id} className="bg-white p-4 rounded-3xl border border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-emerald-600" />
                    <span>{ann.title}</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">{ann.message}</p>
                </div>
                <button
                  onClick={() => handleDeleteAnnouncement(ann.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Announcement Modal */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100">
            <h3 className="font-heading font-extrabold text-base text-slate-900 mb-3">
              Broadcast System Announcement
            </h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Title:</label>
                <input
                  type="text"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Message:</label>
                <textarea
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
