'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { CATEGORY_EMOJI, TAG_EMOJI, type Tag, type VendorCategory } from '@/lib/types';

interface RatedPlace {
  rank: number;
  elo_score: number;
  tag: Tag;
  updated_at: string;
  vendor: {
    id: string;
    name: string;
    slug: string;
    category: VendorCategory;
    neighbourhood?: string | null;
    city: string;
    price_range?: string | null;
  };
}

type ListTab = 'been' | 'want' | 'recs' | 'guides';

const TABS: { id: ListTab; label: string }[] = [
  { id: 'been', label: 'Been' },
  { id: 'want', label: 'Want to Try' },
  { id: 'recs', label: 'Recs' },
  { id: 'guides', label: 'Guides' },
];

// ---------------------------------------------------------------------------
// Been tab — ranked list from personal_rankings
// ---------------------------------------------------------------------------

function BenTab({ ratings, loading, ratingCount }: {
  ratings: RatedPlace[];
  loading: boolean;
  ratingCount: number;
}) {
  const [cuisineFilter, setCuisineFilter] = useState<VendorCategory | 'all'>('all');

  const filtered = cuisineFilter === 'all'
    ? ratings
    : ratings.filter((r) => r.vendor.category === cuisineFilter);

  const categories = Array.from(new Set(ratings.map((r) => r.vendor.category)));

  if (loading) {
    return (
      <div className="flex flex-col gap-2 px-5 pt-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#F5F0EB' }} />
        ))}
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 px-5 text-center">
        <p className="text-5xl mb-4">🍽️</p>
        <p className="font-display font-bold text-lg mb-2" style={{ color: '#1A1205' }}>
          Your list is empty
        </p>
        <p className="font-body text-sm mb-6" style={{ color: '#9B8E84' }}>
          Rate places to build your personal ranking
        </p>
        <Link
          href="/rate"
          className="px-8 py-3.5 rounded-2xl font-body font-semibold text-base active:opacity-70"
          style={{ background: '#E8611A', color: '#FFFFFF' }}
        >
          Start rating →
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Progress banner */}
      {ratingCount < 5 && (
        <div className="mx-5 mt-3 mb-2 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(232,97,26,0.06)', border: '1px solid rgba(232,97,26,0.2)' }}>
          <span className="text-lg">⭐</span>
          <div className="flex-1">
            <p className="font-body text-xs font-semibold" style={{ color: '#E8611A' }}>
              Rate {5 - ratingCount} more place{5 - ratingCount !== 1 ? 's' : ''} to unlock Recs
            </p>
            <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: '#E8E2DC' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ background: '#E8611A', width: `${(ratingCount / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Category filter chips */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-5 py-3 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          <button
            onClick={() => setCuisineFilter('all')}
            className="shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-semibold transition-all active:opacity-70"
            style={{
              background: cuisineFilter === 'all' ? '#E8611A' : '#F5F0EB',
              color: cuisineFilter === 'all' ? '#FFFFFF' : '#9B8E84',
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCuisineFilter(cuisineFilter === cat ? 'all' : cat)}
              className="shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-semibold transition-all active:opacity-70"
              style={{
                background: cuisineFilter === cat ? '#E8611A' : '#F5F0EB',
                color: cuisineFilter === cat ? '#FFFFFF' : '#9B8E84',
              }}
            >
              {CATEGORY_EMOJI[cat]} {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-2 px-5">
        {filtered.map((row) => (
          <Link
            key={row.vendor.id}
            href={`/v/${row.vendor.slug}`}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl active:opacity-80"
            style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
          >
            {/* Rank badge */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0"
              style={{
                background: row.rank === 1 ? '#E8611A' : row.rank <= 3 ? 'rgba(232,97,26,0.12)' : '#F5F0EB',
                color: row.rank === 1 ? '#FFFFFF' : row.rank <= 3 ? '#E8611A' : '#9B8E84',
              }}
            >
              {row.rank}
            </div>

            {/* Category emoji */}
            <span className="text-xl shrink-0">{CATEGORY_EMOJI[row.vendor.category]}</span>

            {/* Name + location */}
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm font-semibold truncate" style={{ color: '#1A1205' }}>
                {row.vendor.name}
              </p>
              {(row.vendor.neighbourhood || row.vendor.city) && (
                <p className="font-body text-xs truncate" style={{ color: '#9B8E84' }}>
                  {[row.vendor.neighbourhood, row.vendor.city].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            {/* Tag emoji */}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stub tabs
// ---------------------------------------------------------------------------

function WantTab() {
  return (
    <div className="flex flex-col items-center py-16 px-5 text-center">
      <p className="text-5xl mb-4">🔖</p>
      <p className="font-display font-bold text-lg mb-2" style={{ color: '#1A1205' }}>Save places to try</p>
      <p className="font-body text-sm" style={{ color: '#9B8E84' }}>
        Tap the bookmark icon on any place to save it here
      </p>
    </div>
  );
}

function RecsTab({ ratingCount }: { ratingCount: number }) {
  const progress = Math.min(ratingCount, 10);
  return (
    <div className="flex flex-col items-center py-16 px-5 text-center">
      <p className="text-5xl mb-4">✨</p>
      <p className="font-display font-bold text-lg mb-2" style={{ color: '#1A1205' }}>Personalized Recs</p>
      <p className="font-body text-sm mb-6" style={{ color: '#9B8E84' }}>
        Rate {Math.max(0, 10 - ratingCount)} more places to unlock recommendations
      </p>
      <div className="w-full max-w-[240px]">
        <div className="flex justify-between mb-1.5">
          <span className="font-body text-xs" style={{ color: '#9B8E84' }}>{progress} / 10 places</span>
          <span className="font-body text-xs font-semibold" style={{ color: '#E8611A' }}>{Math.round((progress / 10) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E8E2DC' }}>
          <div
            className="h-full rounded-full"
            style={{ background: '#E8611A', width: `${(progress / 10) * 100}%`, transition: 'width 0.5s ease' }}
          />
        </div>
      </div>
      {ratingCount > 0 && (
        <Link
          href="/rate"
          className="mt-6 px-6 py-3 rounded-2xl font-body text-sm font-semibold active:opacity-70"
          style={{ background: '#E8611A', color: '#FFFFFF' }}
        >
          Keep rating →
        </Link>
      )}
    </div>
  );
}

function GuidesTab() {
  return (
    <div className="flex flex-col items-center py-16 px-5 text-center">
      <p className="text-5xl mb-4">📚</p>
      <p className="font-display font-bold text-lg mb-2" style={{ color: '#1A1205' }}>Curated Guides</p>
      <p className="font-body text-sm" style={{ color: '#9B8E84' }}>
        Guides by the rfm. team coming soon
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ListsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ListTab>('been');
  const [ratings, setRatings] = useState<RatedPlace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch('/api/ratings/my-map')
      .then((r) => r.json())
      .then((data) => setRatings(data.ratings ?? []))
      .catch(() => setRatings([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <div className="min-h-dvh safe-bottom" style={{ background: '#FAFAF8' }}>
      <div className="h-10" />

      {/* Header */}
      <header className="px-5 pt-3 pb-2">
        <h1 className="font-display font-bold text-xl mb-3" style={{ color: '#1A1205' }}>My Lists</h1>

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

      {/* Tab content */}
      {!user ? (
        <div className="flex flex-col items-center py-16 px-5 text-center">
          <p className="text-5xl mb-4">🗺️</p>
          <p className="font-display font-bold text-lg mb-2" style={{ color: '#1A1205' }}>Sign in to see your lists</p>
          <Link
            href="/auth"
            className="mt-2 px-8 py-3.5 rounded-2xl font-body font-semibold text-base active:opacity-70"
            style={{ background: '#E8611A', color: '#FFFFFF' }}
          >
            Sign in →
          </Link>
        </div>
      ) : activeTab === 'been' ? (
        <BenTab ratings={ratings} loading={loading} ratingCount={ratings.length} />
      ) : activeTab === 'want' ? (
        <WantTab />
      ) : activeTab === 'recs' ? (
        <RecsTab ratingCount={ratings.length} />
      ) : (
        <GuidesTab />
      )}

      <BottomNav />
    </div>
  );
}
