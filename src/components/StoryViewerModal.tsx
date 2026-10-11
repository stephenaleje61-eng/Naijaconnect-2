import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Heart, Flame } from 'lucide-react';
import type { StoryAuthorGroup } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

interface StoryViewerModalProps {
  groups: StoryAuthorGroup[];
  initialGroupIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onStartChatWithUser?: (userId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  groups,
  initialGroupIndex,
  isOpen,
  onClose,
  onStartChatWithUser
}) => {
  const { currentUser } = useAuth();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [reactionSent, setReactionSent] = useState<string | null>(null);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Track and mark viewed
  useEffect(() => {
    if (currentStory && currentUser) {
      api.viewStory(currentStory.id).catch(() => {});
    }
  }, [currentStory, currentUser]);

  // Timer for automatic progress
  useEffect(() => {
    if (!isOpen || isPaused || !currentStory) return;

    const timer = setTimeout(() => {
      handleNext();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isOpen, isPaused, groupIndex, storyIndex, currentStory]);

  if (!isOpen || !currentGroup || !currentStory) return null;

  const handleNext = () => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(groups[groupIndex - 1].stories.length - 1);
    }
  };

  const handleSendReaction = async (emoji: string) => {
    if (!currentStory) return;
    try {
      await api.reactStory(currentStory.id, emoji);
      setReactionSent(emoji);
      setTimeout(() => setReactionSent(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentUser || !currentGroup) return;

    try {
      // Start or find chat conversation
      const conv = await api.getDirectConversation(currentGroup.author.id);
      await api.sendMessage(conv.id, {
        text: `Replied to your story "${currentStory.text || 'Photo'}": ${replyText.trim()}`
      });
      setReplyText('');
      setReactionSent('Sent! ✉️');
      setTimeout(() => setReactionSent(null), 2000);
      if (onStartChatWithUser) {
        onStartChatWithUser(currentGroup.author.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation Arrows for desktop */}
      {groupIndex > 0 || storyIndex > 0 ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="hidden sm:flex absolute left-4 z-40 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      ) : null}

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        className="hidden sm:flex absolute right-4 z-40 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main Story Container (Mobile screen aspect) */}
      <div className="relative w-full max-w-sm sm:max-w-md h-[92vh] max-h-[800px] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 shadow-2xl flex flex-col justify-between select-none">
        {/* Progress Bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
          {currentGroup.stories.map((st, idx) => (
            <div key={st.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className={`h-full bg-white transition-all duration-100 ${
                  idx < storyIndex ? 'w-full' : idx === storyIndex ? 'animate-progress' : 'w-0'
                }`}
                style={{
                  animationPlayState: isPaused ? 'paused' : 'running'
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div className="relative z-30 pt-6 px-4 flex items-center justify-between text-white drop-shadow-md">
          <div className="flex items-center gap-2.5">
            <img
              src={currentGroup.author.avatarUrl}
              alt=""
              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500"
            />
            <div>
              <p className="font-bold text-sm leading-tight flex items-center gap-1.5">
                <span>{currentGroup.author.fullName}</span>
                {currentGroup.author.isVerified && (
                  <span className="text-[10px] bg-emerald-500 text-white px-1 py-0.2 rounded-xs font-bold">✓</span>
                )}
              </p>
              <p className="text-[11px] text-white/80">
                {currentGroup.author.state}, Nigeria · {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Story Content Area */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${currentStory.backgroundGradient} flex items-center justify-center p-6 text-center`}
        >
          {currentStory.mediaUrl && (
            <img
              src={currentStory.mediaUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {currentStory.mediaUrl && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
          )}

          {currentStory.text && (
            <div className="relative z-20 max-w-xs">
              <p className="text-xl sm:text-2xl font-black text-white drop-shadow-lg leading-relaxed whitespace-pre-line">
                {currentStory.text}
              </p>
            </div>
          )}
        </div>

        {/* Tap area left/right for mobile navigation */}
        <div
          className="absolute inset-y-16 left-0 w-1/3 z-20"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
        />
        <div
          className="absolute inset-y-16 right-0 w-1/3 z-20"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        />

        {/* Story Footer: Quick reactions & direct message reply */}
        <div className="relative z-30 p-4 space-y-2.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
          {/* Reaction status notification */}
          {reactionSent && (
            <div className="text-center text-sm font-bold text-emerald-400 animate-bounce">
              {reactionSent}
            </div>
          )}

          {/* Emoji Reactions */}
          <div className="flex items-center justify-around px-2">
            {['🔥', '❤️', '😂', '👏', '🇳🇬'].map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendReaction(emoji);
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur-sm text-xl flex items-center justify-center hover:scale-125 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Quick Reply Form */}
          {currentUser && currentUser.id !== currentGroup.author.id && (
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Reply to ${currentGroup.author.fullName.split(' ')[0]}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 text-xs sm:text-sm text-white placeholder-white/70 border border-white/20 outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                disabled={!replyText.trim()}
                className="p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
