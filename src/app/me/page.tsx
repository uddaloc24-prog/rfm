'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { Vendor, VendorCategory, CATEGORY_EMOJI, TAG_EMOJI, TAG_LABELS, type Tag } from '@/lib/types';

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function memberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

interface RatedPlace {
  vendor: Vendor;
  elo_score: number;
  rank: number;
  tag: Tag;
  updated_at: string;
}

const GOAL_OPTIONS = [20, 50, 100];

type ProfileTab = 'activity' | 'taste';

function MeContent() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const scrollToList = searchParams.get('tab') === 'list';

  const [togglingPrivacy, setTogglingPrivacy] = useState(false);
  const [allRatings, setAllRatings] = useState<RatedPlace[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // New state
  const [profileTab, setProfileTab] = useState<ProfileTab>('activity');
  const [goal, setGoal] = useState<number>(50);
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [showCustomGoal, setShowCustomGoal] = useState(false);

  // Load ratings
  useEffect(() => {
    if (!user) return;
    setRatingsLoading(true);
    fetch('/api/ratings/my-map')
      .then((r) => r.json())
      .then((data) => setAllRatings(data.ratings ?? []))
      .catch(() => setAllRatings([]))
      .finally(() => setRatingsLoading(false));
  }, [user?.id]);

  // Load saved goal from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('rfm_goal');
    if (saved) setGoal(parseInt(saved, 10));
  }, []);

  // Scroll to ratings if coming from success page
  useEffect(() => {
    if (scrollToList && !ratingsLoading) {
      const el = document.getElementById('my-ratings');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scrollToList, ratingsLoading]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/social/upload-avatar', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) setEditAvatarPreview(data.url);
    setUploadingAvatar(false);
  }

  async function saveProfile() {
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileSaveError('');
    try {
      const updates: Record<string, string> = {
        display_name: editDisplayName.trim() || (profile?.display_name ?? ''),
        username: editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || (profile?.username ?? ''),
        bio: editBio.trim(),
        city: editCity.trim(),
      };
      if (editAvatarPreview && editAvatarPreview !== (profile?.avatar_url ?? null)) {
        updates.avatar_url = editAvatarPreview;
      }
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.status === 409) {
        setProfileSaveError('Username already taken');
      } else if (res.ok) {
        await refreshProfile();
        setShowEditProfile(false);
      } else {
        setProfileSaveError(data.error ?? 'Failed to save');
      }
    } catch {
      setProfileSaveError('Network error');
    }
    setSavingProfile(false);
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

  function shareProfile() {
    const url = `${window.location.origin}/me`;
    if (navigator.share) {
      navigator.share({ title: 'My rfm. profile', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  function setAndSaveGoal(g: number) {
    setGoal(g);
    localStorage.setItem('rfm_goal', String(g));
    setShowCustomGoal(false);
  }

  // Compute streak: consecutive days with at least one rating (most recent first)
  function computeStreak(ratings: RatedPlace[]): number {
    if (ratings.length === 0) return 0;
    const days = Array.from(
      new Set(ratings.map((r) => new Date(r.updated_at).toDateString()))
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    let current = new Date();
    current.setHours(0, 0, 0, 0);

    for (const day of days) {
      const d = new Date(day);
      d.setHours(0, 0, 0, 0);
      const diff = (current.getTime() - d.getTime()) / 86400000;
      if (diff > 1) break;
      streak++;
      current = d;
    }
    return streak;
  }

  const streak = computeStreak(allRatings);
  const ratingCount = allRatings.length > 0 ? allRatings.length : (profile?.rating_count ?? 0);
  const goalProgress = Math.min(ratingCount / goal, 1);

  // Taste profile: tag counts (immutable reduce per coding-style mandate)
  const tagCounts = allRatings.reduce<Record<Tag, number>>(
    (acc, r) => ({ ...acc, [r.tag]: acc[r.tag] + 1 }),
    { good: 0, bad: 0, very_bad: 0 },
  );
  const totalTagged = Object.values(tagCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-dvh safe-bottom pb-24" style={{ background: '#FAFAF8' }}>
      <div className="h-10" />

      {loading ? (
        <div className="px-5 py-2">
          <div className="rounded-3xl p-8" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 animate-pulse" style={{ background: '#E8E2DC' }} />
            <div className="h-5 rounded-full mx-auto mb-2 animate-pulse" style={{ background: '#E8E2DC', width: '40%' }} />
            <div className="h-4 rounded-full mx-auto animate-pulse" style={{ background: '#E8E2DC', width: '30%' }} />
          </div>
        </div>
      ) : !user || !profile ? (
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

              {/* Avatar + name */}
              <div className="text-center mb-4">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-3 overflow-hidden flex items-center justify-center font-display font-bold text-xl text-white"
                  style={{ background: profile.avatar_url ? '#F0EBE5' : avatarColor(profile.username) }}
                >
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(profile.display_name)
                  }
                </div>
                <h2 className="font-display font-bold text-lg" style={{ color: '#1A1205' }}>
                  {profile.display_name}
                </h2>

                <p className="font-body text-sm mt-0.5" style={{ color: '#9B8E84' }}>
                  @{profile.username}
                </p>
                {profile.bio && (
                  <p className="font-body text-xs mt-1 px-4 text-center" style={{ color: '#9B8E84' }}>{profile.bio}</p>
                )}

                {profile.city && (
                  <p className="font-body text-xs mt-1" style={{ color: '#9B8E84' }}>📍 {profile.city}</p>
                )}

                {profile.created_at && (
                  <p className="font-body text-xs mt-0.5" style={{ color: '#C4B9B0' }}>
                    Member since {memberSince(profile.created_at)}
                  </p>
                )}
              </div>

              {/* Edit + Share buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setEditDisplayName(profile.display_name); setEditUsername(profile.username); setEditBio(profile.bio ?? ''); setEditCity(profile.city ?? ''); setEditAvatarPreview(profile.avatar_url ?? null); setProfileSaveError(''); setShowEditProfile(true); }}
                  className="flex-1 py-2.5 rounded-xl font-body text-sm font-semibold active:opacity-70"
                  style={{ background: '#F5F0EB', color: '#1A1205' }}
                >
                  Edit Profile
                </button>
                <button
                  onClick={shareProfile}
                  className="flex-1 py-2.5 rounded-xl font-body text-sm font-semibold active:opacity-70"
                  style={{ background: '#F5F0EB', color: '#1A1205' }}
                >
                  Share Profile
                </button>
              </div>

              {/* Stats row */}
              <div
                className="flex justify-around py-3 mb-4"
                style={{ borderTop: '1px solid #F0EBE5', borderBottom: '1px solid #F0EBE5' }}
              >
                <div className="text-center">
                  <p className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>{ratingCount}</p>
                  <p className="font-body text-xs" style={{ color: '#9B8E84' }}>Been</p>
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>0</p>
                  <p className="font-body text-xs" style={{ color: '#9B8E84' }}>Want to Try</p>
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>—</p>
                  <p className="font-body text-xs" style={{ color: '#9B8E84' }}>Recs</p>
                </div>
              </div>

              {/* Streak + Rank side by side */}
              <div className="flex gap-3 mb-4">
                <div
                  className="flex-1 px-3 py-3 rounded-2xl text-center"
                  style={{ background: streak > 0 ? 'rgba(232,97,26,0.06)' : '#F5F0EB', border: '1px solid', borderColor: streak > 0 ? 'rgba(232,97,26,0.2)' : '#E8E2DC' }}
                >
                  <p className="text-xl">{streak > 0 ? '🔥' : '💤'}</p>
                  <p className="font-display font-bold text-base mt-0.5" style={{ color: '#1A1205' }}>
                    {streak > 0 ? `${streak}d` : '0'}
                  </p>
                  <p className="font-body text-[10px]" style={{ color: '#9B8E84' }}>
                    {streak > 0 ? 'Streak' : 'No streak'}
                  </p>
                </div>
                <div
                  className="flex-1 px-3 py-3 rounded-2xl text-center"
                  style={{ background: '#F5F0EB', border: '1px solid #E8E2DC' }}
                >
                  <p className="text-xl">🗺️</p>
                  <p className="font-display font-bold text-base mt-0.5" style={{ color: '#1A1205' }}>
                    #{profile.city_rank ?? '—'}
                  </p>
                  <p className="font-body text-[10px]" style={{ color: '#9B8E84' }}>City Rank</p>
                </div>
              </div>

              {/* Annual goal setter */}
              <div className="rounded-2xl px-4 py-3" style={{ background: '#F5F0EB' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-body text-xs font-semibold" style={{ color: '#9B8E84' }}>ANNUAL GOAL</p>
                  <p className="font-body text-xs" style={{ color: '#E8611A' }}>
                    {ratingCount} / {goal} places
                  </p>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: '#E8E2DC' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ background: '#E8611A', width: `${goalProgress * 100}%` }}
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setAndSaveGoal(g)}
                      className="px-3 py-1 rounded-lg font-body text-xs font-semibold active:opacity-70"
                      style={{
                        background: goal === g ? '#E8611A' : '#FFFFFF',
                        color: goal === g ? '#FFFFFF' : '#9B8E84',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCustomGoal(!showCustomGoal)}
                    className="px-3 py-1 rounded-lg font-body text-xs font-semibold active:opacity-70"
                    style={{
                      background: !GOAL_OPTIONS.includes(goal) ? '#E8611A' : '#FFFFFF',
                      color: !GOAL_OPTIONS.includes(goal) ? '#FFFFFF' : '#9B8E84',
                    }}
                  >
                    Custom
                  </button>
                </div>
                {showCustomGoal && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="number"
                      value={customGoalInput}
                      onChange={(e) => setCustomGoalInput(e.target.value)}
                      placeholder="e.g. 75"
                      className="flex-1 px-3 py-1.5 rounded-xl font-body text-sm outline-none"
                      style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', color: '#1A1205' }}
                      min={1}
                      max={9999}
                    />
                    <button
                      onClick={() => {
                        const g = parseInt(customGoalInput, 10);
                        if (g > 0) setAndSaveGoal(g);
                      }}
                      className="px-4 py-1.5 rounded-xl font-body text-xs font-semibold active:opacity-70"
                      style={{ background: '#E8611A', color: '#FFFFFF' }}
                    >
                      Set
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity / Taste tabs */}
          <div className="px-5 pt-4" id="my-ratings">
            {/* Tab bar */}
            <div className="flex rounded-2xl p-1 gap-1 mb-3" style={{ background: '#F0EBE5' }}>
              {(['activity', 'taste'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setProfileTab(tab)}
                  className="flex-1 py-2 rounded-xl font-body text-sm font-semibold transition-all active:opacity-70"
                  style={{
                    background: profileTab === tab ? '#FFFFFF' : 'transparent',
                    color: profileTab === tab ? '#1A1205' : '#9B8E84',
                    boxShadow: profileTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {tab === 'activity' ? 'Recent Activity' : 'Taste Profile'}
                </button>
              ))}
            </div>

            {/* ── RECENT ACTIVITY ── */}
            {profileTab === 'activity' && (
              <>
                {ratingsLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
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
                    {allRatings.slice(0, 5).map((row) => (
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
                          <p className="font-body text-xs" style={{ color: '#C4B9B0' }}>{timeAgo(row.updated_at)}</p>
                        </div>
                      </Link>
                    ))}
                    {allRatings.length > 5 && (
                      <Link
                        href="/lists"
                        className="flex items-center justify-center py-3 rounded-2xl font-body text-sm active:opacity-70"
                        style={{ color: '#E8611A' }}
                      >
                        See all {allRatings.length} ratings →
                      </Link>
                    )}
                    <Link
                      href="/rate"
                      className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-body text-sm font-semibold mt-1 active:opacity-70"
                      style={{ background: 'rgba(232,97,26,0.06)', color: '#E8611A', border: '1px dashed rgba(232,97,26,0.3)' }}
                    >
                      + Rate another place
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* ── TASTE PROFILE ── */}
            {profileTab === 'taste' && (
              <div>
                {totalTagged === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <p className="text-4xl mb-3">🎨</p>
                    <p className="font-body text-sm" style={{ color: '#9B8E84' }}>
                      Rate places to see your taste profile
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
                    <p className="font-body text-xs font-semibold mb-4 tracking-wide" style={{ color: '#9B8E84' }}>
                      YOUR TASTE BREAKDOWN
                    </p>
                    {(Object.entries(tagCounts) as [Tag, number][])
                      .filter(([, count]) => count > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([tag, count]) => {
                        const pct = totalTagged > 0 ? (count / totalTagged) * 100 : 0;
                        return (
                          <div key={tag} className="mb-4 last:mb-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{TAG_EMOJI[tag]}</span>
                                <span className="font-body text-sm font-semibold" style={{ color: '#1A1205' }}>
                                  {TAG_LABELS[tag]}
                                </span>
                              </div>
                              <span className="font-body text-xs" style={{ color: '#9B8E84' }}>
                                {count} place{count !== 1 ? 's' : ''} · {Math.round(pct)}%
                              </span>
                            </div>
                            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#F0EBE5' }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  background: tag === 'good' ? '#25D366' : tag === 'bad' ? '#F4A425' : '#E8611A',
                                  transition: 'width 0.6s ease',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
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

      {/* Edit Profile sheet */}
      {showEditProfile && profile && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditProfile(false); }}
        >
          <div style={{ background: '#FAFAF8', borderRadius: '20px 20px 0 0', padding: '20px 20px 44px', width: '100%', maxWidth: 430, margin: '0 auto', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D0C9C2', margin: '0 auto 18px' }} />
            <h2 className="font-display font-bold text-xl mb-5" style={{ color: '#13132A' }}>Edit Profile</h2>

            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <label style={{ position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: 76, height: 76, borderRadius: '50%', overflow: 'hidden', background: editAvatarPreview ? '#F0EBE5' : avatarColor(profile.username), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff' }}>
                  {editAvatarPreview
                    ? <img src={editAvatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(profile.display_name)
                  }
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: '#E8611A', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FAFAF8' }}>
                  {uploadingAvatar
                    ? <div style={{ width: 11, height: 11, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    : <span style={{ fontSize: 13 }}>📷</span>
                  }
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={uploadingAvatar} />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="font-body" style={{ fontSize: 11, fontWeight: 600, color: '#9B8E84', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Display Name</label>
                <input
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={50}
                  className="font-body"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E8E2DC', background: '#FFFFFF', fontSize: 15, color: '#13132A', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label className="font-body" style={{ fontSize: 11, fontWeight: 600, color: '#9B8E84', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Username</label>
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="username"
                  maxLength={30}
                  className="font-body"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E8E2DC', background: '#FFFFFF', fontSize: 15, color: '#13132A', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label className="font-body" style={{ fontSize: 11, fontWeight: 600, color: '#9B8E84', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Bio <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({editBio.length}/160)</span>
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell people a bit about you…"
                  maxLength={160}
                  rows={3}
                  className="font-body"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E8E2DC', background: '#FFFFFF', fontSize: 15, color: '#13132A', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label className="font-body" style={{ fontSize: 11, fontWeight: 600, color: '#9B8E84', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>City</label>
                <input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                  maxLength={50}
                  className="font-body"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E8E2DC', background: '#FFFFFF', fontSize: 15, color: '#13132A', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {profileSaveError && (
              <p className="font-body text-sm mt-3" style={{ color: '#E8611A' }}>{profileSaveError}</p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={() => setShowEditProfile(false)}
                className="font-body"
                style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1.5px solid #E8E2DC', background: '#FFFFFF', fontSize: 15, fontWeight: 600, color: '#8A7E74', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={savingProfile || uploadingAvatar}
                className="font-body"
                style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', background: savingProfile || uploadingAvatar ? '#D0C9C2' : '#E8611A', fontSize: 15, fontWeight: 700, color: '#FFFFFF', cursor: savingProfile || uploadingAvatar ? 'default' : 'pointer' }}
              >
                {savingProfile ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
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
