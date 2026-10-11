import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Plus,
  Send,
  Image as ImageIcon,
  Mic,
  Smile,
  Check,
  CheckCheck,
  Users,
  MoreVertical,
  Phone,
  Video,
  Play,
  Pause,
  X,
  UserPlus,
  Radio,
  MapPin,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import type { Conversation, Message, User } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { socketClient } from '../services/socket.ts';

interface ChatsViewProps {
  initialTargetUserId?: string | null;
  onSelectUser: (userId: string) => void;
  onOpenAuth?: () => void;
}

export const ChatsView: React.FC<ChatsViewProps> = ({
  initialTargetUserId,
  onSelectUser,
  onOpenAuth
}) => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [searchConvQuery, setSearchConvQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'group'>('all');

  // Real-time typing indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  // Voice note recording
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Audio playback state
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // New Group Modal
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState<string[]>([]);
  const [friendsList, setFriendsList] = useState<User[]>([]);

  // New Direct Chat Modal (Instant connect with anyone across Nigeria)
  const [showNewDirectChatModal, setShowNewDirectChatModal] = useState(false);
  const [allUsersList, setAllUsersList] = useState<User[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Emoji picker toggle
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const convs = await api.getConversations();
      setConversations(convs);

      // Auto-open target user chat or default to public town square
      if (initialTargetUserId && currentUser) {
        const directConv = await api.getDirectConversation(initialTargetUserId);
        setActiveConversation(directConv);
      } else if (!activeConversation && convs.length > 0) {
        // Priority to the public national lounge so visitors immediately see open messages
        const lounge = convs.find(c => c.id === 'conv_public_lounge');
        setActiveConversation(lounge || convs[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [initialTargetUserId, currentUser, activeConversation]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for active conversation
  const loadActiveMessages = useCallback(async (isBackground = false) => {
    if (!activeConversation) return;

    if (!isBackground) setLoadingMessages(true);
    try {
      const msgs = await api.getMessages(activeConversation.id);
      setMessages(msgs);
      if (!isBackground) {
        setTimeout(() => scrollToBottom('auto'), 50);
      }
      socketClient.sendMarkRead(activeConversation.id);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setLoadingMessages(false);
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    loadActiveMessages(false);
  }, [loadActiveMessages]);

  // Live Auto-Sync: Poll every 2.5 seconds for fresh messages so that multi-window/multi-user chats are always synchronized
  useEffect(() => {
    if (!activeConversation) return;
    const interval = setInterval(() => {
      loadActiveMessages(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [activeConversation, loadActiveMessages]);

  // WebSocket listeners
  useEffect(() => {
    if (!currentUser) return;

    // Incoming messages
    const unsubMsg = socketClient.on('new_message', (payload) => {
      const { conversationId, message } = payload;

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: {
                  text: message.text || (message.mediaType === 'audio' ? '🎤 Voice note' : '📷 Media'),
                  senderId: message.senderId,
                  createdAt: message.createdAt
                },
                unreadCount: activeConversation?.id === conversationId ? 0 : c.unreadCount + 1
              }
            : c
        )
      );

      if (activeConversation?.id === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
        socketClient.sendMarkRead(conversationId);
      }
    });

    // Typing event
    const unsubTyping = socketClient.on('typing', (payload) => {
      const { conversationId, userId, isTyping } = payload;
      const currentChat = activeConversation;
      if (currentChat && currentChat.id === conversationId && userId !== currentUser.id) {
        if (isTyping) {
          const member = currentChat.members?.find((m) => m.id === userId);
          setTypingUsers((prev) => ({
            ...prev,
            [conversationId]: member?.fullName?.split(' ')[0] || 'Someone'
          }));
        } else {
          setTypingUsers((prev) => {
            const copy = { ...prev };
            delete copy[conversationId];
            return copy;
          });
        }
      }
    });

    // Messages marked read
    const unsubRead = socketClient.on('messages_read', (payload) => {
      const { conversationId } = payload;
      if (activeConversation?.id === conversationId) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    });

    return () => {
      unsubMsg();
      unsubTyping();
      unsubRead();
    };
  }, [currentUser, activeConversation?.id]);

  // Typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!activeConversation) return;

    socketClient.sendTyping(activeConversation.id, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (activeConversation) {
        socketClient.sendTyping(activeConversation.id, false);
      }
    }, 1500);
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConversation || !currentUser) return;

    const textToSend = inputText.trim();
    setInputText('');
    socketClient.sendTyping(activeConversation.id, false);

    try {
      const sent = await api.sendMessage(activeConversation.id, { text: textToSend });
      setMessages((prev) => [...prev, sent]);
      scrollToBottom();

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                lastMessage: {
                  text: textToSend,
                  senderId: currentUser.id,
                  createdAt: new Date().toISOString()
                }
              }
            : c
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Send Image attachment
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    try {
      const res = await api.uploadFile(file);
      const sent = await api.sendMessage(activeConversation.id, {
        mediaUrl: res.url,
        mediaType: 'image',
        text: 'Shared a photo'
      });
      setMessages((prev) => [...prev, sent]);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  // Voice recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          try {
            const uploaded = await api.uploadBase64(base64Data, 'voicenote.webm', 'audio/webm');
            if (activeConversation) {
              const sent = await api.sendMessage(activeConversation.id, {
                mediaUrl: uploaded.url,
                mediaType: 'audio',
                text: '🎤 Voice note'
              });
              setMessages((prev) => [...prev, sent]);
              scrollToBottom();
            }
          } catch (err) {
            console.error('Failed to send voice note:', err);
          }
        };
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone error or fallback note:', err);
      if (activeConversation) {
        const sent = await api.sendMessage(activeConversation.id, {
          mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
          mediaType: 'audio',
          text: '🎤 Voice note (0:05)'
        });
        setMessages((prev) => [...prev, sent]);
        scrollToBottom();
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecordingVoice(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecordingVoice(false);
  };

  // Play audio
  const handlePlayAudio = (url: string) => {
    if (playingAudioUrl === url) {
      audioPlayerRef.current?.pause();
      setPlayingAudioUrl(null);
    } else {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      setPlayingAudioUrl(url);
      audio.play();
      audio.onended = () => setPlayingAudioUrl(null);
    }
  };

  // Open Direct Chat Modal
  const handleOpenDirectChat = async () => {
    try {
      const users = await api.getChatUsers();
      setAllUsersList(users);
      setSearchUserQuery('');
      setShowNewDirectChatModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartDirectChatWithUser = async (targetUserId: string) => {
    try {
      const conv = await api.getDirectConversation(targetUserId);
      setShowNewDirectChatModal(false);
      loadConversations();
      setActiveConversation(conv);
    } catch (e) {
      console.error(e);
    }
  };

  // Open Group Modal
  const handleOpenNewGroup = async () => {
    try {
      const data = await api.getFriends();
      setFriendsList(data.friends || []);
      setSelectedFriendsForGroup([]);
      setGroupName('');
      setShowNewGroupModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedFriendsForGroup.length === 0) return;

    try {
      const newConv = await api.createGroupChat({
        name: groupName.trim(),
        memberIds: selectedFriendsForGroup
      });
      setShowNewGroupModal(false);
      loadConversations();
      setActiveConversation(newConv);
    } catch (e) {
      console.error(e);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterType === 'direct' && c.type !== 'direct') return false;
    if (filterType === 'group' && c.type !== 'group') return false;
    if (searchConvQuery) {
      return (
        c.displayTitle.toLowerCase().includes(searchConvQuery.toLowerCase()) ||
        c.lastMessage?.text?.toLowerCase().includes(searchConvQuery.toLowerCase())
      );
    }
    return true;
  });

  const popularEmojis = ['🇳🇬', '❤️', '😂', '🔥', '👍', '🙌', '🙏', '👏', '✨', '💯', '🍲', '😎'];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-3 sm:py-6 h-[calc(100vh-4.5rem)]">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs h-full flex overflow-hidden">
        {/* Left Pane: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-heading font-black text-lg text-slate-900 flex items-center gap-1.5">
                <span>Naija Chats</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-[11px] text-slate-500">Live across Nigeria</p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleOpenDirectChat}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                title="Start new direct chat with anyone"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
              <button
                onClick={handleOpenNewGroup}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                title="Create Group Chat"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search box & Filters */}
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search messages, friends..."
                value={searchConvQuery}
                onChange={(e) => setSearchConvQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-1.5">
              {(['all', 'direct', 'group'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                    filterType === type
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'all' ? 'All Chats' : type === 'direct' ? 'Direct (1-on-1)' : 'Groups & Lounges'}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <p>No conversations found.</p>
                <button
                  onClick={handleOpenDirectChat}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Start Chatting
                </button>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = activeConversation?.id === c.id;
                const isTownSquare = c.id === 'conv_public_lounge';
                const isGroup = c.type === 'group';

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConversation(c)}
                    className={`w-full p-3.5 flex items-center gap-3 text-left transition cursor-pointer ${
                      isActive ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={c.displayAvatar}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      {isTownSquare ? (
                        <span className="absolute -bottom-1 -right-1 text-xs">🇳🇬</span>
                      ) : isGroup ? (
                        <span className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-emerald-600 text-white ring-2 ring-white">
                          <Users className="w-2.5 h-2.5" />
                        </span>
                      ) : c.otherUserOnline ? (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {c.displayTitle}
                        </span>
                        {c.lastMessage && (
                          <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                            {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>

                      {isTownSquare && (
                        <div className="mb-0.5">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded-xs">
                            OPEN TO ALL NIGERIANS
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 truncate">
                          {typingUsers[c.id] ? (
                            <span className="text-emerald-600 font-semibold italic animate-pulse">
                              {typingUsers[c.id]} is typing...
                            </span>
                          ) : (
                            c.lastMessage?.text || 'No messages yet'
                          )}
                        </p>

                        {c.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Room */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col h-full bg-[#f8faf8]">
            {/* Room Header */}
            <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button for mobile */}
                <button
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1.5 rounded-full hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Back to conversation list"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={activeConversation.displayAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  {activeConversation.id === 'conv_public_lounge' ? (
                    <span className="absolute -bottom-1 -right-1 text-xs">🇳🇬</span>
                  ) : activeConversation.otherUserOnline && activeConversation.type !== 'group' ? (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                    {activeConversation.displayTitle}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                    {typingUsers[activeConversation.id] ? (
                      <span className="text-emerald-600 font-bold animate-pulse">
                        {typingUsers[activeConversation.id]} is typing...
                      </span>
                    ) : activeConversation.id === 'conv_public_lounge' ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                        Live Nigerian Town Square · Open to all
                      </span>
                    ) : activeConversation.type === 'group' ? (
                      <span>{activeConversation.memberIds?.length || 0} participants</span>
                    ) : activeConversation.otherUserOnline ? (
                      <span className="text-emerald-600 font-medium">Online now</span>
                    ) : (
                      <span>Active on NaijaConnect</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat action controls */}
              <div className="flex items-center gap-2">
                {currentUser && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span className="text-[11px]">Chatting as: <strong>{currentUser.fullName}</strong></span>
                  </div>
                )}

                <button
                  onClick={() => loadActiveMessages(false)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  title="Refresh chat"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Message Thread List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5">
              {loadingMessages && messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                  <p>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-xl">
                    💬
                  </div>
                  <h4 className="font-bold text-sm text-slate-700">No messages in this chat yet.</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Type a message below to say hello or share what is happening in your area!
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderId === currentUser?.id;
                  const senderUser = m.sender;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${
                          isMine ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        {/* Other user's avatar */}
                        {!isMine && (
                          <button
                            onClick={() => senderUser && onSelectUser(senderUser.id)}
                            className="cursor-pointer shrink-0 mb-1"
                            title={senderUser?.fullName}
                          >
                            <img
                              src={senderUser?.avatarUrl || '/nigeria-flag-circle.svg'}
                              alt=""
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-slate-200"
                            />
                          </button>
                        )}

                        <div
                          className={`rounded-2xl p-3 shadow-2xs relative ${
                            isMine
                              ? 'bg-emerald-700 text-white rounded-br-xs'
                              : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs'
                          }`}
                        >
                          {/* Sender name badge for other people in group/town square */}
                          {!isMine && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-extrabold text-xs text-emerald-800 hover:underline cursor-pointer">
                                {senderUser?.fullName || 'Naija Member'}
                              </span>
                              {senderUser?.state && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-xs flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                  {senderUser.state}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Image message */}
                          {m.mediaUrl && m.mediaType === 'image' && (
                            <img
                              src={m.mediaUrl}
                              alt=""
                              className="rounded-xl max-h-64 w-full object-cover mb-1.5"
                            />
                          )}

                          {/* Voice note audio player */}
                          {m.mediaUrl && m.mediaType === 'audio' && (
                            <div className="flex items-center gap-3 py-1 pr-2">
                              <button
                                onClick={() => handlePlayAudio(m.mediaUrl!)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                                  isMine
                                    ? 'bg-white/20 text-white hover:bg-white/30'
                                    : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                }`}
                              >
                                {playingAudioUrl === m.mediaUrl ? (
                                  <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="flex items-center gap-1 h-4">
                                  {[40, 70, 30, 90, 60, 45, 80, 50, 65, 35].map((h, i) => (
                                    <span
                                      key={i}
                                      style={{ height: `${h}%` }}
                                      className={`w-1 rounded-full ${
                                        isMine ? 'bg-white/70' : 'bg-emerald-600'
                                      } ${playingAudioUrl === m.mediaUrl ? 'animate-pulse' : ''}`}
                                    />
                                  ))}
                                </div>
                                <span
                                  className={`text-[10px] ${
                                    isMine ? 'text-white/80' : 'text-slate-500'
                                  }`}
                                >
                                  Voice note
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Message Text */}
                          {m.text && (
                            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line break-words">
                              {m.text}
                            </p>
                          )}

                          {/* Timestamp and read ticks */}
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isMine ? 'text-emerald-200' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isMine && (
                              <span>
                                {m.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-amber-300" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer Footer */}
            <div className="p-3 bg-white border-t border-slate-200 relative">
              {/* Emoji quick bar */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-3 mb-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 flex items-center gap-2 z-20 flex-wrap max-w-sm">
                  {popularEmojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setInputText((prev) => prev + em);
                        setShowEmojiPicker(false);
                      }}
                      className="text-xl hover:scale-125 transition-transform p-1 cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {/* Voice recording bar */}
              {isRecordingVoice ? (
                <div className="flex items-center justify-between p-2 bg-red-50 rounded-2xl border border-red-200">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-600 animate-record-pulse" />
                    <span className="text-xs font-bold text-red-700">
                      Recording Voice Note: {Math.floor(recordingSeconds / 60)}:
                      {(recordingSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Send Note
                    </button>
                  </div>
                </div>
              ) : !currentUser ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-xs text-emerald-950 font-medium text-center sm:text-left">
                    Sign in or register an account to chat and message real Nigerians in real time.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAuth) onOpenAuth();
                      else window.dispatchEvent(new CustomEvent('open_auth'));
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer"
                  >
                    Sign In to Chat
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title="Add Emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  <label className="p-2 text-slate-400 hover:text-emerald-600 transition cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <ImageIcon className="w-5 h-5" />
                  </label>

                  <input
                    type="text"
                    placeholder={`Message ${
                      activeConversation.id === 'conv_public_lounge'
                        ? 'Naija National Town Square'
                        : activeConversation.displayTitle
                    }...`}
                    value={inputText}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />

                  {inputText.trim() ? (
                    <button
                      type="submit"
                      className="p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="p-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition cursor-pointer"
                      title="Record Voice Note"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/50">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="font-heading font-extrabold text-base text-slate-900 mb-1">
              NaijaConnect Chat
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mb-4">
              Connect and chat in real-time with people across Nigeria.
            </p>
            <button
              onClick={handleOpenDirectChat}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs"
            >
              Start New Chat
            </button>
          </div>
        )}
      </div>

      {/* Modal: Start Direct Chat with Anyone across Nigeria */}
      {showNewDirectChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  Start a Chat
                </h3>
                <p className="text-xs text-slate-500">Pick any registered member across Nigeria</p>
              </div>
              <button
                onClick={() => setShowNewDirectChatModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, state, or username..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {allUsersList
                .filter((u) => {
                  if (!searchUserQuery.trim()) return true;
                  const q = searchUserQuery.toLowerCase();
                  return (
                    u.fullName.toLowerCase().includes(q) ||
                    u.username.toLowerCase().includes(q) ||
                    u.state.toLowerCase().includes(q)
                  );
                })
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartDirectChatWithUser(u.id)}
                    className="w-full p-2.5 rounded-2xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={u.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        {u.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900 group-hover:text-emerald-800">
                          {u.fullName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {u.state}, Nigeria · @{u.username}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl">
                      Chat
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Group Chat */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-heading font-extrabold text-base text-slate-900">
                Create Group Chat
              </span>
              <button
                onClick={() => setShowNewGroupModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Group Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Lagos Techies, Abuja Jollof Club"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Friends to Add:
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 border border-slate-100 rounded-xl">
                  {friendsList.length === 0 ? (
                    <p className="p-3 text-center text-xs text-slate-400">
                      No friends yet. Add friends first to start a group chat!
                    </p>
                  ) : (
                    friendsList.map((f) => {
                      const isSelected = selectedFriendsForGroup.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedFriendsForGroup(
                                selectedFriendsForGroup.filter((id) => id !== f.id)
                              );
                            } else {
                              setSelectedFriendsForGroup([...selectedFriendsForGroup, f.id]);
                            }
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border border-emerald-300'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={f.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-bold text-xs text-slate-900">{f.fullName}</p>
                              <p className="text-[10px] text-slate-500">{f.state}</p>
                            </div>
                          </div>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected ? '✓' : ''}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!groupName.trim() || selectedFriendsForGroup.length === 0}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
