import React, { useState } from 'react';
import { X, Image as ImageIcon, Type, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

const GRADIENTS = [
  { name: 'Emerald Forest', class: 'from-emerald-600 to-teal-800' },
  { name: 'Naija Green & Gold', class: 'from-green-600 via-emerald-700 to-amber-600' },
  { name: 'Sunset Lagos', class: 'from-amber-600 via-rose-600 to-purple-800' },
  { name: 'Niger River Blue', class: 'from-teal-600 to-cyan-900' },
  { name: 'Royal Purple', class: 'from-purple-800 to-indigo-950' }
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated
}) => {
  const { currentUser } = useAuth();
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].class);
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
      setMediaUrl(res.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !mediaUrl) {
      setError('Please add a photo or text caption.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.createStory({
        text: text.trim(),
        mediaUrl: mediaUrl || undefined,
        backgroundGradient: selectedGradient
      });
      onStoryCreated();
      onClose();
      setText('');
      setMediaUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to publish story.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-base text-slate-900">Add Story</span>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              24h Expiry
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-red-50 text-red-700 text-xs rounded-xl">{error}</div>
        )}

        {/* Live Story Preview Card */}
        <div className="p-4">
          <div
            className={`w-full aspect-[9/14] rounded-2xl relative overflow-hidden bg-gradient-to-br ${selectedGradient} flex flex-col justify-between p-4 shadow-inner text-white`}
          >
            {mediaUrl && (
              <img
                src={mediaUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Gradient overlay if image is set */}
            {mediaUrl && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
            )}

            {/* Top user tag */}
            <div className="relative z-10 flex items-center gap-2">
              <img
                src={currentUser?.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white/60"
              />
              <div>
                <p className="text-xs font-bold leading-tight drop-shadow-sm">{currentUser?.fullName}</p>
                <p className="text-[10px] text-white/80">{currentUser?.state}, Nigeria</p>
              </div>
            </div>

            {/* Caption */}
            <div className="relative z-10 my-auto text-center px-4">
              <p className="text-base sm:text-lg font-extrabold text-white drop-shadow-md leading-relaxed whitespace-pre-line">
                {text || (mediaUrl ? '' : 'Type your story caption below...')}
              </p>
            </div>

            {/* Bottom timestamp */}
            <div className="relative z-10 text-right">
              <span className="text-[10px] font-semibold text-white/70">NaijaConnect Story</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 pt-0 space-y-3">
          {/* Caption input */}
          <input
            type="text"
            placeholder="Add story caption or quote..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:border-emerald-500"
          />

          {/* Gradient Palette picker */}
          {!mediaUrl && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Background Theme:
              </label>
              <div className="flex gap-2">
                {GRADIENTS.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedGradient(g.class)}
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${g.class} transition cursor-pointer ${
                      selectedGradient === g.class ? 'ring-2 ring-emerald-600 scale-110' : 'opacity-80'
                    }`}
                    title={g.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Photo attachment or URL */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadingImage}
              />
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>{uploadingImage ? 'Uploading...' : mediaUrl ? 'Replace Photo' : 'Upload Photo'}</span>
            </label>

            {mediaUrl && (
              <button
                type="button"
                onClick={() => setMediaUrl('')}
                className="py-2 px-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl"
              >
                Clear Photo
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Share to Stories (24h)</span>}
          </button>
        </form>
      </div>
    </div>
  );
};
