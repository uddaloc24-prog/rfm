'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';

interface LeaderboardUser {
  id: string;
  username: string;
  display_name: string;
  city: string;
  rating_count: number;
  avatar_url?: string | null;
}

type LeaderboardTab = 'been' | 'influence' | 'notes' | 'photos';

const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: 'been', label: 'Been' },
  { id: 'influence', label: 'Influence' },
  { id: 'notes', label: 'Notes' },
  { id: 'photos', label: 'Photos' },
];

const AVATAR_COLORS = ['#E8611A', '#F4A425', '#25D366', '#6366F1', '#EC4899', '#14B8A6'];
function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

const RANK_STYLE: Record<number, { border: string; badge: string; badgeText: string }> = {
  1: { border: '#F4A425', badge: '#F4A425', badgeText: '#FFFFFF' },
  2: { border: '#C4B9B0', badge: '#C4B9B0', badgeText: '#FFFFFF' },
  3: { border: '#E8611A', badge: 'rgba(232,97,26,0.15)', badgeText: '#E8611A' },
};

function UserRow({ user, rank }: { user: LeaderboardUser; rank: number }) {
  const style = RANK_STYLE[rank];
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E2DC',
        borderLeftWidth: rank <= 3 ? '3px' : '1px',
        borderLeftColor: style?.border ?? '#E8E2DC',
      }}
    >
      {/* Rank */}
      <div
        className="w-7 shrink-0 font-display font-bold text-sm text-center"
        style={{ color: rank <= 3 ? (style?.badge === '#F4A425' ? '#B7860D' : '#E8611A') : '#9B8E84' }}
      >
        {rank}
      </div>

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
        style={{ background: avatarColor(user.username) }}
      >
        {getInitials(user.display_name)}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold truncate" style={{ color: '#1A1205' }}>
          {user.display_name}
        </p>
        <p className="font-body text-xs truncate" style={{ color: '#9B8E84' }}>
          @{user.username}{user.city ? ` · ${user.city}` : ''}
        </p>
      </div>

      {/* Count */}
      <div className="text-right shrink-0">
        <p className="font-display font-bold text-base" style={{ color: '#1A1205' }}>
          {user.rating_count}
        </p>
        <p className="font-body text-[10px]" style={{ color: '#9B8E84' }}>places</p>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="h-[68px] rounded-2xl animate-pulse" style={{ background: '#F5F0EB' }} />
  );
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('been');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/leaderboard?limit=50')
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh safe-bottom" style={{ background: '#FAFAF8' }}>
      <div className="h-10" />

      {/* Header */}
      <header className="px-5 pt-3 pb-2">
        <h1 className="font-display font-bold text-xl mb-3" style={{ color: '#1A1205' }}>Leaderboard</h1>

        {/* City context */}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-body text-xs px-3 py-1.5 rounded-full" style={{ background: '#F5F0EB', color: '#9B8E84' }}>
            📍 Bangalore
          </span>
          <span className="font-body text-xs px-3 py-1.5 rounded-full" style={{ background: '#F5F0EB', color: '#9B8E84' }}>
            All Members
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="shrink-0 px-4 py-2 rounded-xl font-body text-sm font-semibold transition-all active:opacity-70"
              style={{
                background: activeTab === tab.id ? '#E8611A' : '#F5F0EB',
                color: activeTab === tab.id ? '#FFFFFF' : '#9B8E84',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="px-5 pb-28 pt-2">
        {activeTab === 'been' ? (
          <>
            {loading && [...Array(8)].map((_, i) => <div key={i} className="mb-2"><SkeletonRow /></div>)}

            {!loading && users.length === 0 && (
              <div className="rounded-2xl p-10 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
                <p className="text-4xl mb-3">🏆</p>
                <p className="font-body text-sm" style={{ color: '#9B8E84' }}>No ratings yet — be the first!</p>
              </div>
            )}

            {users.length > 0 && (
              <div className="flex flex-col gap-2">
                {users.map((user, i) => (
                  <UserRow key={user.id} user={user} rank={i + 1} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-5xl mb-4">🚀</p>
            <p className="font-display font-bold text-lg mb-2" style={{ color: '#1A1205' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Leaderboard
            </p>
            <p className="font-body text-sm" style={{ color: '#9B8E84' }}>Coming soon</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
