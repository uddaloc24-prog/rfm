'use client';

import { useState, useEffect, useRef } from 'react';
import { Post, PostType, Vendor, CATEGORY_EMOJI } from '@/lib/types';
import { ensureVendorInDb } from '@/lib/vendor-utils';

interface PostModalProps {
  onClose: () => void;
  onPost: (post: Post) => void;
}

const POST_TYPES: Array<{ value: PostType; label: string; emoji: string }> = [
  { value: 'discovery', label: 'Discovery', emoji: '🔍' },
  { value: 'ask', label: 'Asking', emoji: '🙋' },
  { value: 'milestone', label: 'Milestone', emoji: '🏆' },
];

export default function PostModal({ onClose, onPost }: PostModalProps) {
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<PostType>('discovery');
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorResults, setVendorResults] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!vendorSearch.trim()) { setVendorResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vendors/trending?q=${encodeURIComponent(vendorSearch)}`);
        const data = await res.json();
        setVendorResults((data.vendors ?? []).slice(0, 5));
      } catch { setVendorResults([]); }
    }, 300);
  }, [vendorSearch]);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          post_type: postType,
          vendor_id: selectedVendor?.id ?? null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to post');
      }
      const data = await res.json();
      onPost(data.post ?? data);
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Something went wrong');
    }
    setSubmitting(false);
  }

  const charCount = body.length;
  const MAX = 280;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-t-3xl flex flex-col"
        style={{ background: '#FAFAF8', maxHeight: '90dvh' }}
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="w-10 h-1 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" style={{ background: '#E8E2DC' }} />
          <h2 className="font-display font-bold text-lg" style={{ color: '#1A1205' }}>New post</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full active:opacity-70" style={{ background: '#F5F0EB' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#9B8E84" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-5">
          {/* Post type */}
          <div className="flex gap-2 mb-4">
            {POST_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setPostType(t.value)}
                className="flex-1 py-2 rounded-xl font-body text-xs font-medium transition-all"
                style={
                  postType === t.value
                    ? { background: '#E8611A', color: '#FFFFFF', border: '1px solid #E8611A' }
                    : { background: '#FFFFFF', color: '#9B8E84', border: '1px solid #E8E2DC' }
                }
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX))}
            placeholder={
              postType === 'discovery' ? "Share a place you love…"
              : postType === 'ask' ? "Ask the community something…"
              : "Share a food milestone!"
            }
            rows={4}
            className="w-full px-4 py-3 rounded-2xl font-body text-sm outline-none resize-none"
            style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', color: '#1A1205' }}
          />
          <p className="font-body text-xs text-right mt-1" style={{ color: charCount > MAX * 0.9 ? '#E8611A' : '#C4B9B0' }}>
            {charCount}/{MAX}
          </p>

          {/* Vendor picker (discovery only) */}
          {postType === 'discovery' && (
            <div className="mt-3">
              {selectedVendor ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(232,97,26,0.08)', border: '1px solid rgba(232,97,26,0.2)' }}>
                  <span className="text-sm">{CATEGORY_EMOJI[selectedVendor.category]}</span>
                  <span className="font-body text-xs font-semibold flex-1" style={{ color: '#E8611A' }}>{selectedVendor.name}</span>
                  <button onClick={() => { setSelectedVendor(null); setVendorSearch(''); }} className="active:opacity-70">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="#E8611A" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    placeholder="Tag a place (optional)…"
                    className="w-full px-3 py-2.5 rounded-xl font-body text-xs outline-none"
                    style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', color: '#1A1205' }}
                  />
                  {vendorResults.length > 0 && (
                    <div className="rounded-xl overflow-hidden mt-1.5" style={{ border: '1px solid #E8E2DC' }}>
                      {vendorResults.map((v, i) => (
                        <button
                          key={v.id}
                          onClick={async () => {
                            const realVendor = await ensureVendorInDb(v);
                            setSelectedVendor(realVendor);
                            setVendorSearch('');
                            setVendorResults([]);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left active:opacity-70"
                          style={{
                            background: '#FFFFFF',
                            borderBottom: i < vendorResults.length - 1 ? '1px solid #F0EBE5' : 'none',
                          }}
                        >
                          <span>{CATEGORY_EMOJI[v.category]}</span>
                          <span className="font-body text-xs flex-1 truncate" style={{ color: '#1A1205' }}>{v.name}</span>
                          <span className="font-body text-xs ml-auto shrink-0" style={{ color: '#9B8E84' }}>
                            {v._source === 'osm' ? 'Maps' : (v.neighbourhood ?? '')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {error && (
            <p className="font-body text-xs mt-3 text-center" style={{ color: '#E8611A' }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
            className="w-full py-4 rounded-2xl font-body font-semibold text-base mt-4 disabled:opacity-50 transition-opacity"
            style={{ background: '#E8611A', color: '#FFFFFF' }}
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
