import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Bell,
  Search,
  Users,
  Compass,
  ShieldAlert,
  LogOut,
  User as UserIcon,
  PlusCircle,
  Sparkles,
  ChevronDown,
  Check,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { Notification } from '../types/index.ts';
import { api } from '../services/api.ts';
import { socketClient } from '../services/socket.ts';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreatePost: () => void;
  onOpenAuth: () => void;
  onSelectUser: (userId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreatePost,
  onOpenAuth,
  onSelectUser
}) => {
  const { currentUser, logout, unreadNotificationsCount, decrementUnreadNotifs } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Search debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.searchUsers(searchQuery);
        setSearchResults(results.slice(0, 6));
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleNotif = () => {
    if (!showNotifDropdown) {
      loadNotifications();
      decrementUnreadNotifs();
      api.markNotificationsRead();
    }
    setShowNotifDropdown(!showNotifDropdown);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('feed')}
            className="flex items-center gap-2.5 text-left group transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-black text-xl shadow-sm shadow-emerald-700/20 group-hover:scale-105 transition-transform">
              <span className="text-white tracking-tighter">N</span>
              <span className="text-amber-400 font-bold">C</span>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Naija<span className="text-emerald-600">Connect</span>
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-sm">
                  NG
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5 tracking-tight">
                Connect. Chat. Share. Belong.
              </p>
            </div>
          </button>
        </div>

        {/* Universal Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search people in Lagos, Abuja, Kano..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm text-slate-800 rounded-full border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 max-h-96 overflow-y-auto">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isSearching ? 'Searching across Nigeria...' : 'People on NaijaConnect'}
              </div>
              {searchResults.length === 0 && !isSearching && (
                <div className="p-4 text-center text-sm text-slate-500">
                  No users found matching "{searchQuery}"
                </div>
              )}
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user.id);
                    setShowSearchDropdown(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left transition cursor-pointer"
                >
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {user.fullName}
                      </span>
                      {user.isVerified && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 py-0.2 rounded-xs font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      @{user.username} · {user.state}
                    </p>
                  </div>
                  {user.isOnline && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'feed'
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden lg:inline">Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('chats')}
            className={`relative px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'chats'
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden lg:inline">Chats</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'friends'
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden lg:inline">Friends</span>
          </button>

          <button
            onClick={() => setActiveTab('communities')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'communities'
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="hidden lg:inline">Communities</span>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-red-50 text-red-700 font-bold'
                  : 'text-slate-600 hover:text-red-700 hover:bg-red-50'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span className="hidden lg:inline">Admin</span>
            </button>
          )}

          {/* Quick Create Post button */}
          {currentUser && (
            <button
              onClick={onOpenCreatePost}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 ml-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Share Post</span>
            </button>
          )}

          {/* Notifications Dropdown */}
          {currentUser && (
            <div ref={notifRef} className="relative">
              <button
                onClick={handleToggleNotif}
                aria-label="Notifications"
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="font-heading font-bold text-sm text-slate-900">Notifications</span>
                    <button
                      onClick={() => {
                        api.markNotificationsRead();
                        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                      }}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">No new notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl transition ${
                            n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-emerald-50/60 hover:bg-emerald-50'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {n.sender?.avatarUrl ? (
                              <img
                                src={n.sender.avatarUrl}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                                NC
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Account / Auth Dropdown */}
          {currentUser ? (
            <div ref={userRef} className="relative flex items-center gap-1.5 ml-1">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/30"
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50">
                  <div className="p-2.5 border-b border-slate-100">
                    <p className="font-bold text-sm text-slate-900 truncate">{currentUser.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">@{currentUser.username} · {currentUser.state}</p>
                  </div>

                  <button
                    onClick={() => {
                      onSelectUser(currentUser.id);
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-emerald-600" />
                    <span>My Profile</span>
                  </button>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        logout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              Sign In / Join
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
