import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Flame,
  ThumbsUp,
  Smile,
  CheckCircle2,
  MapPin,
  Send,
  Trash2,
  Edit2,
  Flag,
  X
} from 'lucide-react';
import type { Post, Comment } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

interface PostCardProps {
  post: Post;
  onPostUpdated?: (updated: Post) => void;
  onPostDeleted?: (postId: string) => void;
  onSelectUser: (userId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostUpdated,
  onPostDeleted,
  onSelectUser
}) => {
  const { currentUser } = useAuth();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or Scam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Toggle reaction
  const handleReact = async (reaction: 'like' | 'love' | 'fire' | 'haha' | 'clap') => {
    if (!currentUser) return;
    setShowReactionPicker(false);
    try {
      const res = await api.reactPost(post.id, reaction);
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          totalLikes: res.totalLikes,
          reactionCounts: res.reactionCounts,
          userReaction: res.userReaction,
          userHasLiked: res.totalLikes > 0 && !!res.userReaction
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Share post
  const handleShare = async () => {
    if (!currentUser) return;
    try {
      const res = await api.sharePost(post.id);
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          shares: [...post.shares, currentUser.id],
          userHasShared: true
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load comments
  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const data = await api.getComments(post.id);
        setComments(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;

    setSubmittingComment(true);
    try {
      const res = await api.addComment(post.id, commentText.trim(), replyingToCommentId || undefined);
      setComments(prev => [...prev, res.comment]);
      setCommentText('');
      setReplyingToCommentId(null);
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          commentsCount: post.commentsCount + 1
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete post
  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.deletePost(post.id);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Save edit
  const handleSaveEdit = async () => {
    try {
      const res = await api.editPost(post.id, { content: editContent });
      setIsEditing(false);
      if (onPostUpdated) {
        onPostUpdated({ ...post, content: res.post.content, isEdited: true });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.reportPost(post.id, reportReason, reportDetails);
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
      }, 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const isAuthor = currentUser?.id === post.authorId;
  const isAdmin = currentUser?.role === 'admin';

  const reactionEmojis = {
    like: { emoji: '👍', label: 'Like', color: 'text-emerald-600' },
    love: { emoji: '❤️', label: 'Love', color: 'text-rose-500' },
    fire: { emoji: '🔥', label: 'Fire', color: 'text-amber-500' },
    haha: { emoji: '😂', label: 'Haha', color: 'text-yellow-500' },
    clap: { emoji: '👏', label: 'Clap', color: 'text-teal-600' }
  };

  return (
    <article className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:border-slate-300">
      {/* Post Header */}
      <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectUser(post.author.id)}
            className="cursor-pointer group relative"
          >
            <img
              src={post.author.avatarUrl}
              alt={post.author.fullName}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500/20 group-hover:ring-emerald-500 transition"
            />
          </button>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onSelectUser(post.author.id)}
                className="font-bold text-sm text-slate-900 hover:text-emerald-700 transition cursor-pointer"
              >
                {post.author.fullName}
              </button>
              {post.author.isVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
              )}
              {post.feeling && (
                <span className="text-xs text-slate-500 font-medium">
                  is {post.feeling}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span>@{post.author.username}</span>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-emerald-700 font-semibold">
                <MapPin className="w-3 h-3" />
                {post.locationState || post.author.state}
              </span>
              <span>·</span>
              <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              {post.isEdited && <span className="text-slate-400 text-[10px]">(edited)</span>}
            </div>
          </div>
        </div>

        {/* Post Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Post options"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-30">
              {isAuthor && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 text-slate-500" />
                  <span>Edit Post</span>
                </button>
              )}
              {(isAuthor || isAdmin) && (
                <button
                  onClick={() => {
                    handleDeletePost();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Post</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowReportModal(true);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
              >
                <Flag className="w-4 h-4 text-slate-400" />
                <span>Report Post</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 sm:px-5 pb-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-emerald-500 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {post.content}
          </p>
        )}
      </div>

      {/* Media Attachment */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className={`mt-2 mb-3 bg-slate-100 overflow-hidden ${post.mediaUrls.length > 1 ? 'grid grid-cols-2 gap-1' : ''}`}>
          {post.mediaUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="w-full max-h-[500px] object-cover hover:scale-[1.01] transition-transform duration-200"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Reaction and Engagement Stats Bar */}
      <div className="px-4 sm:px-5 py-2 flex items-center justify-between text-xs text-slate-500 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          {post.totalLikes > 0 && (
            <div className="flex items-center -space-x-1">
              {post.reactionCounts?.fire > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-xs">🔥</span>
              )}
              {post.reactionCounts?.love > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-xs">❤️</span>
              )}
              {post.reactionCounts?.like > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-xs">👍</span>
              )}
            </div>
          )}
          <span>{post.totalLikes} {post.totalLikes === 1 ? 'reaction' : 'reactions'}</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleToggleComments} className="hover:underline cursor-pointer">
            {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
          </button>
          <span>·</span>
          <span>{post.shares?.length || 0} shares</span>
        </div>
      </div>

      {/* Interactive Action Bar */}
      <div className="px-2 py-1 flex items-center justify-around relative">
        {/* Reaction Popover */}
        {showReactionPicker && (
          <div
            onMouseLeave={() => setShowReactionPicker(false)}
            className="absolute -top-12 left-4 bg-white/95 backdrop-blur-md rounded-full shadow-2xl border border-slate-200 p-1 flex items-center gap-2 z-30 animate-in fade-in zoom-in-95 duration-100"
          >
            {(['like', 'love', 'fire', 'haha', 'clap'] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleReact(r)}
                className="w-9 h-9 rounded-full hover:scale-125 transition-transform flex items-center justify-center text-xl cursor-pointer"
                title={reactionEmojis[r].label}
              >
                {reactionEmojis[r].emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reaction Trigger Button */}
        <button
          onClick={() => handleReact(post.userReaction || 'like')}
          onMouseEnter={() => setShowReactionPicker(true)}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            post.userReaction
              ? `${reactionEmojis[post.userReaction]?.color || 'text-emerald-600'} font-bold bg-emerald-50/50`
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {post.userReaction ? (
            <span>{reactionEmojis[post.userReaction]?.emoji}</span>
          ) : (
            <ThumbsUp className="w-4 h-4" />
          )}
          <span>{post.userReaction ? reactionEmojis[post.userReaction]?.label : 'Like'}</span>
        </button>

        {/* Comments Button */}
        <button
          onClick={handleToggleComments}
          className="flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Comment</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            post.userHasShared ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>{post.userHasShared ? 'Shared!' : 'Share'}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-slate-50/70 p-4 border-t border-slate-100 space-y-3">
          {/* Add Comment Input */}
          {currentUser && (
            <form onSubmit={handleAddComment} className="flex items-start gap-2.5">
              <img
                src={currentUser.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={
                    replyingToCommentId
                      ? 'Writing a reply...'
                      : 'Drop your comment in pidgin or English...'
                  }
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-white rounded-full border border-slate-200 text-xs sm:text-sm text-slate-800 outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Comment Thread */}
          {loadingComments ? (
            <div className="py-4 text-center text-xs text-slate-400">Loading replies...</div>
          ) : comments.length === 0 ? (
            <div className="py-3 text-center text-xs text-slate-400">Be the first to comment on this post!</div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <button onClick={() => onSelectUser(c.author.id)} className="cursor-pointer shrink-0">
                    <img
                      src={c.author.avatarUrl}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  </button>
                  <div className="flex-1 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onSelectUser(c.author.id)}
                        className="font-bold text-xs text-slate-900 hover:underline cursor-pointer"
                      >
                        {c.author.fullName}
                      </button>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-heading font-bold text-base text-slate-900">Report Content</span>
              <button onClick={() => setShowReportModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {reportSuccess ? (
              <div className="py-6 text-center text-sm font-semibold text-emerald-600">
                ✓ Thank you. Report submitted for admin review.
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Reason:</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="Spam or Scam">Spam or Scam</option>
                    <option value="Harassment or Bullying">Harassment or Bullying</option>
                    <option value="Hate Speech or Tribalism">Hate Speech or Tribalism</option>
                    <option value="False Information">False Information</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Additional details (optional):</label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={2}
                    placeholder="Describe the issue..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  Submit Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
