'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { CATEGORY_EMOJI, type Vendor, type VendorCategory } from '@/lib/types';

type SearchTab = 'restaurants' | 'members';

interface Member {
  id: string;
  username: string;
  display_name: string;
  city: string;
  rating_count: number;
}

const AVATAR_COLORS = ['#E8611A', '#F4A425', '#25D366', '#6366F1', '#EC4899', '#14B8A6'];
function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

// ---------------------------------------------------------------------------
// Vendor row
// ---------------------------------------------------------------------------

function VendorRow({ vendor }: { vendor: Vendor }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
      style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
      <span className="text-2xl shrink-0">{CATEGORY_EMOJI[vendor.category as VendorCategory] ?? '🥘'}</span>
      <Link href={`/v/${vendor.slug}`} className="flex-1 min-w-0 active:opacity-70">
        <p className="font-body text-sm font-semibold truncate" style={{ color: '#1A1205' }}>{vendor.name}</p>
        {(vendor.neighbourhood || vendor.city) && (
          <p className="font-body text-xs truncate" style={{ color: '#9B8E84' }}>
            {[vendor.neighbourhood, vendor.city].filter(Boolean).join(' · ')}
          </p>
        )}
      </Link>
      <Link
        href={`/rate?vendor_id=${vendor.id}`}
        className="w-9 h-9 rounded-xl flex items-center justify-center font-body text-lg font-bold shrink-0 active:opacity-70"
        style={{ background: 'rgba(232,97,26,0.1)', color: '#E8611A' }}
      >
        +
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member row
// ---------------------------------------------------------------------------

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
      style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
        style={{ background: avatarColor(member.username) }}
      >
        {getInitials(member.display_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold truncate" style={{ color: '#1A1205' }}>
          {member.display_name}
        </p>
        <p className="font-body text-xs truncate" style={{ color: '#9B8E84' }}>
          @{member.username} · {member.rating_count} places
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="h-16 rounded-2xl animate-pulse" style={{ background: '#F5F0EB' }} />
  );
}

// ---------------------------------------------------------------------------
// Search content (needs useSearchParams — must be inside Suspense)
// ---------------------------------------------------------------------------

function SearchContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') as VendorCategory | null;

  const [activeTab, setActiveTab] = useState<SearchTab>('restaurants');
  const [query, setQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [results, setResults] = useState<Vendor[]>([]);
  const [trending, setTrending] = useState<Vendor[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // Trending vendors on mount
  useEffect(() => {
    const params = new URLSearchParams({ limit: '12' });
    if (initialCategory) params.set('category', initialCategory);
    fetch(`/api/vendors/trending?${params}`)
      .then((r) => r.json())
      .then((d) => setTrending(d.vendors ?? []))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));
  }, [initialCategory]);

  // Debounced vendor search
  const searchVendors = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors?q=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setResults(data.vendors ?? []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchVendors(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchVendors]);

  // Member search
  useEffect(() => {
    if (memberQuery.length < 2) { setMembers([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/leaderboard?limit=20`);
        const data = await res.json();
        const q = memberQuery.toLowerCase();
        setMembers(
          (data.users ?? []).filter(
            (u: Member) =>
              u.username.toLowerCase().includes(q) || u.display_name.toLowerCase().includes(q)
          )
        );
      } catch {
        setMembers([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [memberQuery]);

  return (
    <div className="min-h-dvh safe-bottom" style={{ background: '#FAFAF8' }}>
      <div className="h-10" />

      {/* Header */}
      <header className="px-5 pt-3 pb-2">
        <h1 className="font-display font-bold text-xl mb-3" style={{ color: '#1A1205' }}>Search</h1>

        {/* Sub-tabs */}
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#F0EBE5' }}>
          {(['restaurants', 'members'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-xl font-body text-sm font-semibold transition-all active:opacity-70"
              style={{
                background: activeTab === tab ? '#FFFFFF' : 'transparent',
                color: activeTab === tab ? '#1A1205' : '#9B8E84',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* ── RESTAURANTS TAB ── */}
      {activeTab === 'restaurants' && (
        <div className="pb-28">
          {/* Search bar */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#C4B9B0" strokeWidth="1.5" />
                <path d="M21 21l-4.35-4.35" stroke="#C4B9B0" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Restaurant, cuisine, or occasion…"
                className="flex-1 font-body text-sm outline-none bg-transparent"
                style={{ color: '#1A1205' }}
              />
              {query && (
                <button onClick={() => setQuery('')} className="shrink-0 active:opacity-70">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" fill="#E8E2DC" />
                    <path d="M15 9l-6 6M9 9l6 6" stroke="#9B8E84" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Location pill */}
            <div className="mt-2 flex items-center gap-1.5">
              <span className="font-body text-xs" style={{ color: '#9B8E84' }}>📍 Bangalore</span>
            </div>
          </div>

          {/* Results (search active) */}
          {query.length >= 2 ? (
            <div className="px-5 flex flex-col gap-2">
              {loading && [...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
              {!loading && results.length === 0 && (
                <div className="rounded-2xl p-8 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="font-body text-sm" style={{ color: '#9B8E84' }}>No results for "{query}"</p>
                  <Link
                    href="/rate"
                    className="inline-block mt-3 px-5 py-2 rounded-xl font-body text-xs font-semibold active:opacity-70"
                    style={{ background: '#E8611A', color: '#FFFFFF' }}
                  >
                    Add it to rfm. →
                  </Link>
                </div>
              )}
              {results.map((v) => <VendorRow key={v.id} vendor={v} />)}
            </div>
          ) : (
            /* Default: trending / may have been */
            <div className="px-5">
              <p className="font-body text-xs font-semibold mb-3 tracking-wide" style={{ color: '#9B8E84' }}>
                PLACES YOU MAY HAVE BEEN
              </p>
              {trendingLoading
                ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                : (
                  <div className="flex flex-col gap-2">
                    {trending.map((v) => <VendorRow key={v.id} vendor={v} />)}
                  </div>
                )
              }
            </div>
          )}
        </div>
      )}

      {/* ── MEMBERS TAB ── */}
      {activeTab === 'members' && (
        <div className="pb-28">
          {/* Search bar */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#C4B9B0" strokeWidth="1.5" />
                <path d="M21 21l-4.35-4.35" stroke="#C4B9B0" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search by username or name…"
                className="flex-1 font-body text-sm outline-none bg-transparent"
                style={{ color: '#1A1205' }}
              />
              {memberQuery && (
                <button onClick={() => setMemberQuery('')} className="shrink-0 active:opacity-70">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" fill="#E8E2DC" />
                    <path d="M15 9l-6 6M9 9l6 6" stroke="#9B8E84" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="px-5 flex flex-col gap-2">
            {memberQuery.length < 2 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
                <p className="text-3xl mb-2">👥</p>
                <p className="font-body text-sm" style={{ color: '#9B8E84' }}>Search for members by username</p>
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
                <p className="text-3xl mb-2">🔍</p>
                <p className="font-body text-sm" style={{ color: '#9B8E84' }}>No members found for "{memberQuery}"</p>
              </div>
            ) : (
              members.map((m) => <MemberRow key={m.id} member={m} />)
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export with Suspense (required for useSearchParams)
// ---------------------------------------------------------------------------

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" style={{ background: '#FAFAF8' }} />}>
      <SearchContent />
    </Suspense>
  );
}
