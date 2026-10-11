import React, { useState } from 'react';
import { X, Image as ImageIcon, Smile, MapPin, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { NIGERIAN_STATES, NIGERIAN_FEELINGS } from '../utils/constants.ts';
import confetti from 'canvas-confetti';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (newPost: any) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated
}) => {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState('');
  const [selectedFeeling, setSelectedFeeling] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>(currentUser?.state || 'Lagos');
  const [showFeelings, setShowFeelings] = useState(false);
  const [showStateSelect, setShowStateSelect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const res = await api.uploadFile(file);
      setMediaUrls(prev => [...prev, res.url]);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddMediaUrl = () => {
    if (mediaInput.trim()) {
      setMediaUrls(prev => [...prev, mediaInput.trim()]);
      setMediaInput('');
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && mediaUrls.length === 0) {
      setError('Please add some text or photos to your post.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createPost({
        content: content.trim(),
        mediaUrls,
        feeling: selectedFeeling || undefined,
        locationState: selectedState
      });

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#008751', '#ffffff', '#F59E0B']
      });

      onPostCreated(res.post);
      onClose();
      // Reset form
      setContent('');
      setMediaUrls([]);
      setSelectedFeeling('');
    } catch (err: any) {
      setError(err.message || 'Failed to publish post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-base sm:text-lg text-slate-900">
              Create Post
            </span>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Naija Feed
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User preview */}
        <div className="p-5 pb-2 flex items-center gap-3">
          <img
            src={currentUser?.avatarUrl}
            alt=""
            className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500/20"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900">{currentUser?.fullName}</span>
              {selectedFeeling && (
                <span className="text-xs text-slate-500 font-medium truncate">
                  is {selectedFeeling}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{selectedState}, Nigeria</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-5 my-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 pt-2">
          {/* Content Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Wetin dey happen, ${currentUser?.fullName?.split(' ')[0] || 'fam'}? Share your thoughts, story, or hustle...`}
            rows={4}
            className="w-full resize-none border-none outline-none text-slate-800 text-base placeholder-slate-400 focus:ring-0 leading-relaxed"
          />

          {/* Media Previews */}
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 my-3 max-h-48 overflow-y-auto">
              {mediaUrls.map((url, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden group border border-slate-200">
                  <img src={url} alt="" className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(i)}
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Feeling Selector Drawer */}
          {showFeelings && (
            <div className="my-3 p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 max-h-40 overflow-y-auto">
              <div className="text-xs font-bold text-emerald-900 mb-2">How are you feeling / what are you doing?</div>
              <div className="grid grid-cols-2 gap-1.5">
                {NIGERIAN_FEELINGS.map((f, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedFeeling(`${f.emoji} ${f.text}`);
                      setShowFeelings(false);
                    }}
                    className="p-1.5 px-2.5 rounded-xl bg-white hover:bg-emerald-100/60 text-xs text-left text-slate-800 flex items-center gap-1.5 border border-emerald-100/50 transition cursor-pointer"
                  >
                    <span>{f.emoji}</span>
                    <span className="truncate">{f.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* State Tag Selector */}
          {showStateSelect && (
            <div className="my-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Geotag to Nigerian State:</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setShowStateSelect(false);
                }}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium"
              >
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 my-3">
            <span className="text-xs font-bold text-slate-600 pl-1">Add to your post</span>
            <div className="flex items-center gap-1">
              {/* Image upload label */}
              <label className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-100/50 transition cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <ImageIcon className="w-5 h-5" />
              </label>

              {/* Feelings button */}
              <button
                type="button"
                onClick={() => setShowFeelings(!showFeelings)}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  showFeelings ? 'bg-amber-100 text-amber-700' : 'text-amber-500 hover:bg-amber-50'
                }`}
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Location button */}
              <button
                type="button"
                onClick={() => setShowStateSelect(!showStateSelect)}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  showStateSelect ? 'bg-emerald-100 text-emerald-800' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Optional Image URL Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Or paste an image URL (e.g. Unsplash photo)..."
              value={mediaInput}
              onChange={(e) => setMediaInput(e.target.value)}
              className="flex-1 text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-slate-800"
            />
            <button
              type="button"
              onClick={handleAddMediaUrl}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing to Nigeria...</span>
              </>
            ) : (
              <span>Post to NaijaConnect</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
