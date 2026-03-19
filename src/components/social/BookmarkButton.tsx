'use client';
import { useState } from 'react';

interface Props {
  vendorId: string;
  initialBookmarked: boolean;
}

export default function BookmarkButton({ vendorId, initialBookmarked }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    setBookmarked(p => !p);
    if (bookmarked) {
      await fetch(`/api/social/bookmarks?vendor_id=${vendorId}`, { method: 'DELETE' });
    } else {
      await fetch('/api/social/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId }),
      });
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      aria-label={bookmarked ? 'Remove bookmark' : 'Save to Want to Go'}
      title={bookmarked ? 'Remove bookmark' : 'Save to Want to Go'}
      style={{
        width: 40, height: 40, borderRadius: '50%', border: 'none',
        background: bookmarked ? 'rgba(244,164,37,0.15)' : 'rgba(0,0,0,0.22)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
        transition: 'background 0.15s',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {bookmarked ? '🔖' : '🏷️'}
    </button>
  );
}
