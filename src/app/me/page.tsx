'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { Vendor, VendorCategory, CATEGORY_EMOJI, TAG_EMOJI, type Tag } from '@/lib/types';

const AVATAR_COLORS = ['#E8611A', '#F4A425', '#25D366', '#6366F1', '#EC4899', '#14B8A6'];

function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

interface RatedPlace {
  vendor: Vendor;
  elo_score: number;
  rank: number;
  tag: Tag;
}

function MeContent() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const scrollToList = searchParams.get('tab') === 'list';

  const [togglingPrivacy, setTogglingPrivacy] = useState(false);
  const [allRatings, setAllRatings] = useState<RatedPlace[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    if (!user) return;
    setRatingsLoading(true);
    fetch('/api/ratings/my-map')
      .then((r) => r.json())
      .then((data) => setAllRatings(data.ratings ?? []))
      .catch(() => setAllRatings([]))
      .finally(() => setRatingsLoading(false));
  }, [user]);

  // Scroll to ratings list if coming from success page
  useEffect(() => {
    if (scrollToList && !ratingsLoading) {
      const el = document.getElementById('my-ratings');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scrollToList, ratingsLoading]);

  async function saveUsername() {
    if (!usernameInput.trim() || savingUsername) return;
    setSavingUsername(true);
    setUsernameError('');
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setUsernameError('Username already taken');
      } else if (res.ok) {
        await refreshProfile();
        setEditingUsername(false);
      } else {
        setUsernameError(data.error ?? 'Failed to save');
      }
    } catch {
      setUsernameError('Network error');
    }
    setSavingUsername(false);
  }

  async function togglePrivacy() {
    if (!profile || togglingPrivacy) return;
    setTogglingPrivacy(true);
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_private: !profile.is_private }),
      });
      await refreshProfile();
    } catch { /* non-fatal */ }
    setTogglingPrivacy(false);
  }

  return (
    <div className="min-h-dvh safe-bottom pb-24" style={{ background: '#FAFAF8' }}>
      <div className="h-10" />

      {loading ? (
        /* Skeleton */
        <div className="px-5 py-2">
          <div className="rounded-3xl p-8" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 animate-pulse" style={{ background: '#E8E2DC' }} />
            <div className="h-5 rounded-full mx-auto mb-2 animate-pulse" style={{ background: '#E8E2DC', width: '40%' }} />
            <div className="h-4 rounded-full mx-auto animate-pulse" style={{ background: '#E8E2DC', width: '30%' }} />
          </div>
        </div>
      ) : !user || !profile ? (
        /* Sign-in prompt */
        <div className="px-5 py-2">
          <div className="rounded-3xl p-8 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-black text-2xl text-white mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #E8611A, #F4A425)' }}
            >?</div>
            <h2 className="font-display font-bold text-lg mb-1" style={{ color: '#1A1205' }}>Sign in to rfm.</h2>
            <p className="font-body text-sm mb-5" style={{ color: '#9B8E84' }}>
              Build your personal food map and share your picks
            </p>
            <Link
              href="/auth"
              className="inline-block w-full py-4 rounded-2xl font-body font-semibold text-base text-center active:opacity-80"
              style={{ background: '#E8611A', color: '#FFFFFF' }}
            >
              Sign in →
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Profile card */}
          <div className="px-5 py-2">
            <div className="rounded-3xl p-6" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
              <div className="text-center mb-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-bold text-xl text-white mx-auto mb-3"
                  style={{ background: avatarColor(profile.username) }}
                >
                  {getInitials(profile.display_name)}
                </div>
                <h2 className="font-display font-bold text-lg" style={{ color: '#1A1205' }}>
                  {profile.display_name}
                </h2>
                {editingUsername ? (
                  <div className="mt-1 flex flex-col items-center gap-1">
                    <input
                      autoFocus
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      onBlur={(e) => {
                        // Only save on blur if not triggered by Escape (Escape sets editingUsername=false first)
                        if (editingUsername) saveUsername();
                        void e;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); saveUsername(); }
                        if (e.key === 'Escape') { e.preventDefault(); setEditingUsername(false); }
                      }}
                      className="px-3 py-1.5 rounded-xl font-body text-sm text-center outline-none"
                      style={{ background: '#F5F0EB', border: '1.5px solid #E8611A', color: '#1A1205', width: '160px' }}
                      placeholder="new_username"
                    />
                    {usernameError && (
                      <p className="font-body text-xs" style={{ color: '#E8611A' }}>{usernameError}</p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { setUsernameInput(profile.username); setUsernameError(''); setEditingUsername(true); }}
                    className="font-body text-sm mt-0.5 active:opacity-70"
                    style={{ color: '#9B8E84' }}
                  >
                    @{profile.username} ✏️
                  </button>
                )}
                {profile.city && (
                  <p className="font-body text-xs mt-1" style={{ color: '#9B8E84' }}>📍 {profile.city}</p>
                )}
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-6 py-3" style={{ borderTop: '1px solid #F0EBE5', borderBottom: '1px solid #F0EBE5' }}>
                <div className="text-center">
                  <p className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>
                    {allRatings.length > 0 ? allRatings.length : (profile.rating_count ?? 0)}
                  </p>
                  <p className="font-body text-xs" style={{ color: '#9B8E84' }}>Ratings</p>
                </div>
              </div>
            </div>
          </div>

          {/* My Ratings list */}
          <div id="my-ratings" className="px-5 pt-4">
            <p className="font-body text-xs font-semibold mb-3 tracking-wide px-1" style={{ color: '#9B8E84' }}>
              MY RATINGS
            </p>

            {ratingsLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: '#F5F0EB' }} />
                ))}
              </div>
            ) : allRatings.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <p className="text-4xl mb-3">🍽️</p>
                <p className="font-display font-bold text-base mb-1" style={{ color: '#1A1205' }}>No ratings yet</p>
                <p className="font-body text-sm mb-5" style={{ color: '#9B8E84' }}>
                  Rate places to build your personal ranking
                </p>
                <Link
                  href="/rate"
                  className="px-8 py-3.5 rounded-2xl font-body font-semibold text-base"
                  style={{ background: '#E8611A', color: '#FFFFFF' }}
                >
                  Rate a place →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {allRatings.map((row) => (
                  <Link
                    key={row.vendor.id}
                    href={`/v/${row.vendor.slug}`}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl active:opacity-80"
                    style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0"
                      style={{ background: row.rank === 1 ? '#E8611A' : '#F5F0EB', color: row.rank === 1 ? '#FFFFFF' : '#9B8E84' }}
                    >
                      {row.rank}
                    </div>
                    <span className="text-xl shrink-0">{CATEGORY_EMOJI[row.vendor.category as VendorCategory]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-semibold truncate" style={{ color: '#1A1205' }}>{row.vendor.name}</p>
                      {row.vendor.neighbourhood && (
                        <p className="font-body text-xs truncate" style={{ color: '#9B8E84' }}>{row.vendor.neighbourhood}</p>
                      )}
                    </div>
                    <span className="text-xl shrink-0">{TAG_EMOJI[row.tag]}</span>
                  </Link>
                ))}
                <Link
                  href="/rate"
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-body text-sm font-semibold mt-1 active:opacity-70"
                  style={{ background: 'rgba(232,97,26,0.06)', color: '#E8611A', border: '1px dashed rgba(232,97,26,0.3)' }}
                >
                  + Rate another place
                </Link>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="px-5 pt-6">
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
              <button
                onClick={togglePrivacy}
                disabled={togglingPrivacy}
                className="w-full flex items-center gap-3 px-4 py-4 text-left active:opacity-70 transition-opacity"
                style={{ background: '#FFFFFF', borderBottom: '1px solid #E8E2DC' }}
              >
                <span className="text-base">🔒</span>
                <div className="flex-1">
                  <p className="font-body text-sm" style={{ color: '#1A1205' }}>Private profile</p>
                  <p className="font-body text-xs mt-0.5" style={{ color: '#9B8E84' }}>
                    {profile.is_private ? 'Your ratings are hidden from Community' : 'Your ratings are visible to everyone'}
                  </p>
                </div>
                <div
                  className="w-11 h-6 rounded-full flex items-center transition-all shrink-0"
                  style={{
                    background: profile.is_private ? '#E8611A' : '#D0C9C2',
                    padding: '2px',
                    justifyContent: profile.is_private ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div className="w-5 h-5 rounded-full" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                </div>
              </button>

              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-4 text-left active:opacity-70 transition-opacity"
                style={{ background: '#FFFFFF' }}
              >
                <span className="text-base">🚪</span>
                <span className="font-body text-sm flex-1" style={{ color: '#E8611A' }}>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}

export default function MePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" style={{ background: '#FAFAF8' }} />}>
      <MeContent />
    </Suspense>
  );
}
