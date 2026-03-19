'use client';
import { useState, useRef } from 'react';

const TAGS = [
  { value: 'good', emoji: '😋', label: 'Loved it' },
  { value: 'bad', emoji: '😕', label: 'Meh' },
  { value: 'very_bad', emoji: '🤢', label: 'Bad' },
] as const;

interface Props {
  vendorId: string;
  vendorName: string;
  onClose: () => void;
  onCreated: (postId: string) => void;
}

export default function CreatePostModal({ vendorId, vendorName, onClose, onCreated }: Props) {
  const [tag, setTag] = useState<'good' | 'bad' | 'very_bad' | null>(null);
  const [body, setBody] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5 MB'); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', photoFile);
    const res = await fetch('/api/social/upload-photo', { method: 'POST', body: formData });
    setUploading(false);
    if (!res.ok) { setError('Photo upload failed'); return null; }
    const data = await res.json();
    return data.url ?? null;
  };

  const handleSubmit = async () => {
    if (!tag) { setError('Pick a rating first'); return; }
    setError('');
    setSubmitting(true);

    let photoUrl: string | null = null;
    if (photoFile) {
      photoUrl = await uploadPhoto();
      if (!photoUrl) { setSubmitting(false); return; }
    }

    const res = await fetch('/api/social/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor_id: vendorId, rating_tag: tag, body: body.trim() || undefined, photo_url: photoUrl }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      setSubmitting(false);
      return;
    }

    onCreated(data.id);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        style={{ background: '#FDF8F2', borderRadius: '24px 24px 0 0', padding: '0 0 env(safe-area-inset-bottom, 16px)', maxWidth: 430, width: '100%', margin: '0 auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: '#E0D9D3' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F0EBE5' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: '#13132A' }}>Write a post</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A7E74' }}>about {vendorName}</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#F0EBE5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#8A7E74' }}>✕</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Rating tag selector */}
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#13132A' }}>How was it? *</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {TAGS.map(t => (
              <button
                key={t.value}
                onClick={() => setTag(t.value)}
                style={{
                  flex: 1, padding: '10px 6px', borderRadius: 12, border: `2px solid ${tag === t.value ? '#E8611A' : '#E8E2DC'}`,
                  background: tag === t.value ? 'rgba(232,97,26,0.08)' : '#fff',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{t.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: tag === t.value ? 700 : 500, color: tag === t.value ? '#E8611A' : '#8A7E74' }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Body text */}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="What did you have? What made it special? (optional)"
            maxLength={280}
            rows={3}
            style={{ width: '100%', borderRadius: 12, border: '1.5px solid #E8E2DC', padding: '10px 14px', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', color: '#13132A', boxSizing: 'border-box', background: '#fff', marginBottom: 4 }}
          />
          <p style={{ margin: '0 0 14px', fontSize: 11, color: '#B0A89E', textAlign: 'right' }}>{body.length}/280</p>

          {/* Photo */}
          {photoPreview ? (
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <img src={photoPreview} alt="" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 200, display: 'block' }} />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1.5px dashed #E8E2DC', background: '#FAFAF8', cursor: 'pointer', fontSize: 13, color: '#8A7E74', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span>📷</span> Add a photo (optional)
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhoto} />

          {error && <p style={{ fontSize: 13, color: '#EF4444', margin: '0 0 12px' }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || uploading || !tag}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: (!tag || submitting || uploading) ? '#E8E2DC' : '#E8611A', color: '#fff', fontWeight: 700, fontSize: 15, cursor: (!tag || submitting) ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display)' }}
          >
            {uploading ? 'Uploading photo…' : submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
