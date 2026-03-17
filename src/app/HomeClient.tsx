'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Vendor, VendorCategory, CATEGORY_LABELS, CATEGORY_EMOJI, TAG_EMOJI, type Tag } from '@/lib/types';
import VendorCard from '@/components/VendorCard';
import BottomNav from '@/components/BottomNav';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import { useAuth } from '@/components/AuthProvider';

const TABS: Array<{ label: string; value: VendorCategory | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Street Food', value: 'street_food' },
  { label: 'Mess & Tiffin', value: 'mess_tiffin' },
  { label: 'Chai & Snacks', value: 'chai_snacks' },
  { label: 'Restaurants', value: 'restaurant' },
];

const COMMUNITY_TABS: Array<{ label: string; value: VendorCategory | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Street', value: 'street_food' },
  { label: 'Mess', value: 'mess_tiffin' },
  { label: 'Chai', value: 'chai_snacks' },
  { label: 'Restaurants', value: 'restaurant' },
];

interface CommunityRating {
  tag?: Tag;
  created_at: string;
  user_id: string;
  vendor: Vendor;
  user: { id: string; username: string; display_name: string } | null;
}

interface HomeClientProps {
  initialVendors: Vendor[];
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

const AVATAR_COLORS = ['#E8611A', '#F4A425', '#25D366', '#6366F1', '#EC4899', '#14B8A6'];
function avatarColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}


export default function HomeClient({ initialVendors }: HomeClientProps) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [activeTab, setActiveTab] = useState<VendorCategory | 'all'>('all');
  // Start false — OnboardingOverlay controls its own visibility via localStorage
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [communityRatings, setCommunityRatings] = useState<CommunityRating[]>([]);
  const [communityFilter, setCommunityFilter] = useState<VendorCategory | 'all'>('all');
  const [communityLoading, setCommunityLoading] = useState(true);
  const { profile } = useAuth();

  // Show onboarding overlay only for non-onboarded or first-time visitors
  // (OnboardingOverlay reads localStorage; skip entirely for onboarded users)
  useEffect(() => {
    if (!profile?.onboarded) {
      setShowOnboarding(true);
    }
  }, [profile]);

  // Fetch community ratings on mount
  useEffect(() => {
    fetch('/api/ratings/public')
      .then((r) => r.json())
      .then((d) => setCommunityRatings(d.ratings ?? []))
      .catch(() => setCommunityRatings([]))
      .finally(() => setCommunityLoading(false));
  }, []);

  // Real-time subscription
  useEffect(() => {
    async function subscribe() {
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();

        const channel = supabase
          .channel('vendors-live')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'vendors', filter: 'city=eq.Bangalore' },
            (payload) => {
              setVendors((prev) =>
                prev.map((v) =>
                  v.id === payload.new.id ? { ...v, ...payload.new as Vendor } : v
                ).sort((a, b) => b.community_score - a.community_score)
              );
            }
          )
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      } catch {
        // Supabase not configured — skip realtime
      }
    }

    const cleanup = subscribe();
    return () => { cleanup.then((fn) => fn?.()); };
  }, []);

  const displayed = useMemo(() => {
    const active = vendors.filter((v) => v.status === 'verified' || v.status === 'pending');
    const filtered = activeTab === 'all' ? active : active.filter((v) => v.category === activeTab);
    return filtered.sort((a, b) => b.community_score - a.community_score);
  }, [vendors, activeTab]);

  const filteredCommunity = useMemo(() =>
    communityFilter === 'all'
      ? communityRatings
      : communityRatings.filter((r) => r.vendor?.category === communityFilter),
    [communityRatings, communityFilter],
  );

  return (
    <div className="min-h-dvh safe-bottom" style={{ background: '#FAFAF8' }}>
      {showOnboarding && (
        <OnboardingOverlay onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Status bar spacer */}
      <div className="h-10" />

      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-2">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-2xl tracking-tight" style={{ color: '#E8611A' }}>
            rfm.
          </span>
          <span className="font-body text-xs" style={{ color: '#9B8E84' }}>Bangalore</span>
        </div>

        {/* Avatar — 44px touch target */}
        <Link href="/me" className="flex items-center justify-center w-11 h-11">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-xs"
            style={{ background: 'linear-gradient(135deg, #E8611A, #F4A425)', color: '#FFFFFF' }}
          >
            {profile ? getInitials(profile.display_name) : '?'}
          </div>
        </Link>
      </header>

      {/* Category tabs */}
      <div className="flex gap-2 px-5 overflow-x-auto scrollbar-hide py-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-body font-medium transition-all active:scale-95"
              style={
                isActive
                  ? { background: '#E8611A', color: '#FFFFFF', border: '1px solid #E8611A' }
                  : { background: '#FFFFFF', color: '#9B8E84', border: '1px solid #E8E2DC' }
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Vendor list */}
      <section className="px-5 pt-1 pb-4">
        <h2 className="font-display font-bold text-lg mb-3" style={{ color: '#1A1205' }}>
          Most loved in Bangalore
        </h2>

        {seeding ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-4 flex items-center gap-3 animate-pulse"
                style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
              >
                <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: '#E8E2DC' }} />
                <div className="flex-1">
                  <div className="h-4 rounded-full mb-2" style={{ background: '#E8E2DC', width: '55%' }} />
                  <div className="h-3 rounded-full" style={{ background: '#E8E2DC', width: '35%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
          >
            <p className="text-3xl mb-2">🍽️</p>
            <p className="font-body text-sm" style={{ color: '#9B8E84' }}>
              No {activeTab !== 'all' ? CATEGORY_LABELS[activeTab].toLowerCase() : 'places'} yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayed.map((vendor, idx) => (
              <VendorCard key={vendor.id} vendor={vendor} rank={idx + 1} />
            ))}
          </div>
        )}
      </section>

      {/* Community activity section */}
      <section className="px-5 pb-24">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display font-bold text-lg" style={{ color: '#1A1205' }}>
            What Bangalore is eating
          </h2>
          <span
            className="w-2 h-2 rounded-full animate-pulse shrink-0"
            style={{ background: '#25D366' }}
          />
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3">
          {COMMUNITY_TABS.map((tab) => {
            const isActive = communityFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setCommunityFilter(tab.value)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all active:scale-95"
                style={
                  isActive
                    ? { background: '#1A1205', color: '#FFFFFF', border: '1px solid #1A1205' }
                    : { background: '#FFFFFF', color: '#9B8E84', border: '1px solid #E8E2DC' }
                }
              >
                {tab.value !== 'all' && <span className="mr-1">{CATEGORY_EMOJI[tab.value as VendorCategory]}</span>}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Community rows */}
        {communityLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-3.5 flex items-center gap-3 animate-pulse"
                style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
              >
                <div className="w-8 h-8 rounded-full shrink-0" style={{ background: '#E8E2DC' }} />
                <div className="flex-1">
                  <div className="h-3.5 rounded-full mb-1.5" style={{ background: '#E8E2DC', width: '50%' }} />
                  <div className="h-3 rounded-full" style={{ background: '#E8E2DC', width: '35%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCommunity.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
          >
            <p className="text-2xl mb-1">🍽️</p>
            <p className="font-body text-sm" style={{ color: '#9B8E84' }}>
              No ratings yet — be the first to rate
            </p>
            <Link
              href="/rate"
              className="inline-block mt-3 font-body text-sm font-semibold"
              style={{ color: '#E8611A' }}
            >
              Rate a place →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredCommunity.slice(0, 15).map((row, i) => {
              const name = row.user?.display_name ?? 'Someone';
              const firstName = name.split(' ')[0];
              return (
                <Link
                  key={`${row.user_id}-${row.vendor?.id ?? i}`}
                  href={row.vendor?.slug ? `/v/${row.vendor.slug}` : '#'}
                  className="rounded-2xl p-3.5 flex items-center gap-3 active:opacity-70"
                  style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-body font-semibold text-xs text-white shrink-0"
                    style={{ background: avatarColor(row.user?.username ?? name) }}
                  >
                    {getInitials(name)}
                  </div>

                  {/* Vendor info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold truncate" style={{ color: '#1A1205' }}>
                      {row.vendor?.name ?? 'Unknown place'}
                    </p>
                    <p className="font-body text-xs" style={{ color: '#9B8E84' }}>
                      {row.vendor?.neighbourhood ? `📍 ${row.vendor.neighbourhood}` : row.vendor?.city ?? 'Bangalore'}
                    </p>
                  </div>

                  {/* Tag + user */}
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <span className="text-base">{row.tag ? TAG_EMOJI[row.tag] : '🍽️'}</span>
                    <p className="font-body text-xs" style={{ color: '#9B8E84' }}>{firstName}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
}
