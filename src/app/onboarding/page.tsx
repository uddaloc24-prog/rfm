'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Vendor, VendorCategory, CATEGORY_EMOJI } from '@/lib/types';

/* ── Types ───────────────────────────────────────────── */
type OBStep = 'name' | 'categories' | 'places' | 'vibes' | 'finishing';

interface OBPlace {
  name: string;
  emoji: string;
  category: VendorCategory;
  neighbourhood: string | null;
  id?: string;
  lat?: number | null;
  lng?: number | null;
  _source?: 'db' | 'osm';
}

type CuratedPlace = OBPlace;

/* ── Static data ─────────────────────────────────────── */
const FOOD_CATEGORIES: { key: VendorCategory; label: string; emoji: string; desc: string }[] = [
  { key: 'mess_tiffin',  label: 'Mess & Tiffin',  emoji: '🍛', desc: 'Thali, idli, dosas' },
  { key: 'street_food',  label: 'Street Food',     emoji: '🌮', desc: 'Chaat, rolls, stalls' },
  { key: 'chai_snacks',  label: 'Chai & Snacks',   emoji: '☕', desc: 'Filter coffee, tea, bites' },
  { key: 'restaurant',   label: 'Restaurants',     emoji: '🍽️', desc: 'Sit-down dining' },
  { key: 'home_cook',    label: 'Home Cooked',     emoji: '🏠', desc: 'Cloud kitchens, tiffin boxes' },
];

const CURATED_PLACES: CuratedPlace[] = [
  { name: 'MTR',                  emoji: '🍛', category: 'mess_tiffin',  neighbourhood: 'Lalbagh' },
  { name: 'Vidyarthi Bhavan',     emoji: '🥞', category: 'mess_tiffin',  neighbourhood: 'Gandhi Bazaar' },
  { name: "Brahmins' Coffee Bar", emoji: '☕', category: 'chai_snacks',  neighbourhood: 'Shivajinagar' },
  { name: 'VV Puram Food Street', emoji: '🌮', category: 'street_food',  neighbourhood: 'VV Puram' },
  { name: 'Corner House',         emoji: '🍦', category: 'restaurant',   neighbourhood: 'Indiranagar' },
  { name: 'Empire Restaurant',    emoji: '🍖', category: 'restaurant',   neighbourhood: 'Koramangala' },
  { name: 'Rameshwaram Cafe',     emoji: '🍱', category: 'restaurant',   neighbourhood: 'Indiranagar' },
  { name: 'Truffles',             emoji: '🍔', category: 'restaurant',   neighbourhood: 'St Marks Road' },
  { name: 'SLV Corner',           emoji: '🍽️', category: 'mess_tiffin',  neighbourhood: 'Koramangala' },
  { name: "Koshy's",              emoji: '🫖', category: 'restaurant',   neighbourhood: 'MG Road' },
];

const VIBES: { label: string; emoji: string; tag: 'good' | 'bad' | 'very_bad' }[] = [
  { label: 'Loved it',  emoji: '😋', tag: 'good' },
  { label: 'It was ok', emoji: '😕', tag: 'bad' },
  { label: 'Avoid',     emoji: '🤢', tag: 'very_bad' },
];

/* ── Component ───────────────────────────────────────── */
export default function OnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<OBStep>('name');
  const [displayName, setDisplayName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<VendorCategory[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<OBPlace[]>([]);
  const [vibeIndex, setVibeIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Search state for places step
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeResults, setPlaceResults] = useState<OBPlace[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Vibes loading + comparison state
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeSubStep, setVibeSubStep] = useState<'tag' | 'compare'>('tag');
  const [compareInfo, setCompareInfo] = useState<{
    currentVendorId: string; currentName: string; currentEmoji: string;
    candidateVendorId: string; candidateName: string; candidateEmoji: string;
  } | null>(null);
  // name.toLowerCase() → vendor_id (pre-fetched when user selects a place)
  const vendorIdCacheRef = useRef<Record<string, string>>({});
  // vendor_id → display info (built up as each place is rated)
  const ratedVendorInfoRef = useRef<Record<string, { name: string; emoji: string }>>({});

  useEffect(() => {
    if (!loading && profile?.onboarded === true) router.replace('/');
    if (!loading && !user) router.replace('/auth');
  }, [loading, profile, user, router]);

  // Intentionally NOT pre-filling with Google name — users type whatever they want to be called.

  // Debounced search for places step
  useEffect(() => {
    if (!placeSearch.trim()) { setPlaceResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vendors/trending?q=${encodeURIComponent(placeSearch)}`);
        const data = await res.json();
        const results: OBPlace[] = ((data.vendors ?? []) as Vendor[])
          .slice(0, 6)
          .map((v) => ({
            name: v.name,
            emoji: CATEGORY_EMOJI[v.category],
            category: v.category,
            neighbourhood: v.neighbourhood ?? null,
            id: v._source === 'db' ? v.id : undefined,
            lat: v.lat,
            lng: v.lng,
            _source: v._source,
          }));
        setPlaceResults(results);
      } catch { setPlaceResults([]); }
    }, 300);
  }, [placeSearch]);

  if (loading || (!loading && profile?.onboarded === true)) {
    return <div className="min-h-dvh" style={{ background: '#FAFAF8' }} />;
  }

  /* ── Handlers ──────────────────────────────────────── */
  async function saveName() {
    if (!displayName.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
    } catch { /* non-fatal */ }
    setSubmitting(false);
    setStep('categories');
  }

  // Fetches or creates a vendor in the DB, caching the result.
  // Called in the background when the user selects a place so the ID
  // is ready by the time they reach the vibes step.
  async function ensureVendorIdCached(place: OBPlace): Promise<string | undefined> {
    const key = place.name.toLowerCase();
    if (vendorIdCacheRef.current[key]) return vendorIdCacheRef.current[key];
    if (place.id && !place.id.startsWith('osm:')) {
      vendorIdCacheRef.current[key] = place.id;
      return place.id;
    }
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: place.name, category: place.category,
          neighbourhood: place.neighbourhood, city: 'Bangalore',
          ...(place.lat != null && { lat: place.lat }),
          ...(place.lng != null && { lng: place.lng }),
        }),
      });
      const data = await res.json();
      if (data.vendor?.id) { vendorIdCacheRef.current[key] = data.vendor.id; return data.vendor.id; }
    } catch { /* non-fatal */ }
    return undefined;
  }

  async function advanceVibeOrFinish() {
    setVibeSubStep('tag');
    setCompareInfo(null);
    const next = vibeIndex + 1;
    if (next < selectedPlaces.length) { setVibeIndex(next); } else { await finish(); }
  }

  async function handleVibe(tag: 'good' | 'bad' | 'very_bad') {
    const place = selectedPlaces[vibeIndex];
    if (!place || vibeLoading) return;
    setVibeLoading(true);
    try {
      const vendorId = await ensureVendorIdCached(place);
      if (!vendorId) { await advanceVibeOrFinish(); setVibeLoading(false); return; }

      ratedVendorInfoRef.current[vendorId] = { name: place.name, emoji: place.emoji };

      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, tag }),
      });
      const data = await res.json();

      if (res.ok && data.candidates?.length > 0) {
        const candidate = data.candidates[0];
        const candidateInfo = ratedVendorInfoRef.current[candidate.vendor_id];
        if (candidateInfo) {
          setCompareInfo({
            currentVendorId: vendorId, currentName: place.name, currentEmoji: place.emoji,
            candidateVendorId: candidate.vendor_id,
            candidateName: candidateInfo.name, candidateEmoji: candidateInfo.emoji,
          });
          setVibeSubStep('compare');
          setVibeLoading(false);
          return;
        }
      }
    } catch { /* non-fatal */ }
    await advanceVibeOrFinish();
    setVibeLoading(false);
  }

  async function handleOnboardingCompare(currentVendorWon: boolean) {
    if (!compareInfo || vibeLoading) return;
    setVibeLoading(true);
    const winner_vendor_id = currentVendorWon ? compareInfo.currentVendorId : compareInfo.candidateVendorId;
    const loser_vendor_id  = currentVendorWon ? compareInfo.candidateVendorId : compareInfo.currentVendorId;
    try {
      await fetch('/api/ratings/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_vendor_id, loser_vendor_id }),
      });
    } catch { /* non-fatal */ }
    await advanceVibeOrFinish();
    setVibeLoading(false);
  }

  async function finish() {
    setStep('finishing');
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarded: true }),
      });
    } catch { /* non-fatal */ }
    await refreshProfile();
    router.replace(selectedPlaces.length > 0 ? '/map' : '/');
  }

  function toggleCategory(cat: VendorCategory) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function togglePlace(place: OBPlace) {
    setSelectedPlaces((prev) => {
      if (prev.find((p) => p.name === place.name)) return prev.filter((p) => p.name !== place.name);
      ensureVendorIdCached(place); // pre-fetch in background so vibes step is instant
      return [...prev, place];
    });
  }

  /* ── Finishing loader ──────────────────────────────── */
  if (step === 'finishing') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-full border-2 animate-spin"
            style={{ borderColor: '#E8E2DC', borderTopColor: '#E8611A' }}
          />
          <p className="font-body text-sm" style={{ color: '#9B8E84' }}>Building your map…</p>
        </div>
      </div>
    );
  }

  /* ── Vibes: one per selected place ─────────────────── */
  if (step === 'vibes') {
    const place = selectedPlaces[vibeIndex];
    const progressBar = (
      <div className="flex items-center gap-1.5 px-5 mb-8">
        {selectedPlaces.map((_, i) => (
          <div key={i} className="h-1.5 rounded-full flex-1 transition-all duration-300"
            style={{ background: i <= vibeIndex ? '#E8611A' : '#E8E2DC' }} />
        ))}
      </div>
    );

    // Compare sub-step — shown after rating if there's a candidate to compare with
    if (vibeSubStep === 'compare' && compareInfo) {
      return (
        <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
          <div className="h-12" />
          {progressBar}
          <div className="flex-1 flex flex-col justify-center px-5 pb-8">
            <p className="font-body text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#9B8E84' }}>How was your experience?</p>
            <p className="font-body text-base mb-6" style={{ color: '#9B8E84' }}>
              Was your <strong style={{ color: '#1A1205' }}>experience</strong> at {compareInfo.currentName} better or worse than…
            </p>
            <div className="w-full rounded-3xl p-6 mb-6 text-center"
              style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <span className="text-5xl block mb-3">{compareInfo.candidateEmoji}</span>
              <h3 className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>{compareInfo.candidateName}</h3>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleOnboardingCompare(true)} disabled={vibeLoading}
                className="flex-1 py-5 rounded-2xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{ background: '#E8611A', color: '#FFFFFF' }}>
                Better 👆
              </button>
              <button onClick={() => handleOnboardingCompare(false)} disabled={vibeLoading}
                className="flex-1 py-5 rounded-2xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{ background: '#FFFFFF', color: '#1A1205', border: '1.5px solid #E8E2DC' }}>
                Worse 👇
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Tag sub-step — rate the current place
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
        <div className="h-12" />
        {progressBar}
        <div className="flex-1 flex flex-col justify-center px-5 pb-8">
          <p className="font-body text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#9B8E84' }}>
            {vibeIndex + 1} of {selectedPlaces.length}
          </p>
          <h1 className="font-display font-black text-3xl leading-tight mb-1" style={{ color: '#1A1205' }}>
            {place.emoji} {place.name}
          </h1>
          <p className="font-body text-base mb-10" style={{ color: '#9B8E84' }}>How was it?</p>
          <div className="flex flex-col gap-3">
            {VIBES.map((vibe) => (
              <button key={vibe.label} onClick={() => handleVibe(vibe.tag)} disabled={vibeLoading}
                className="w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left active:scale-[0.98] transition-transform disabled:opacity-50"
                style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <span className="text-4xl">{vibe.emoji}</span>
                <span className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>{vibe.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Curated places grid ─────────────────────────── */
  if (step === 'places') {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
        <div className="h-12" />
        <div className="flex-1 flex flex-col px-5 pt-2 overflow-y-auto">
          <h1 className="font-display font-black text-3xl mb-1" style={{ color: '#1A1205' }}>
            Places you know
          </h1>
          <p className="font-body text-sm mb-4" style={{ color: '#9B8E84' }}>
            Tap every spot you&apos;ve eaten at — we&apos;ll seed your map
          </p>

          {/* Search for any place */}
          <div className="relative mb-4">
            <input
              type="text"
              value={placeSearch}
              onChange={(e) => setPlaceSearch(e.target.value)}
              placeholder="Search any place in Bangalore…"
              className="w-full px-4 py-3 rounded-2xl font-body text-sm outline-none"
              style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', color: '#1A1205' }}
            />
            {placeSearch && (
              <button
                onClick={() => { setPlaceSearch(''); setPlaceResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#9B8E84" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Search results */}
          {placeResults.length > 0 && (
            <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid #E8E2DC' }}>
              {placeResults.map((place, i) => {
                const selected = !!selectedPlaces.find((p) => p.name === place.name);
                return (
                  <button
                    key={place.name}
                    onClick={() => { togglePlace(place); setPlaceSearch(''); setPlaceResults([]); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-70"
                    style={{
                      background: selected ? 'rgba(232,97,26,0.04)' : '#FFFFFF',
                      borderBottom: i < placeResults.length - 1 ? '1px solid #F0EBE5' : 'none',
                    }}
                  >
                    <span className="text-xl shrink-0">{place.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-medium truncate" style={{ color: '#1A1205' }}>{place.name}</p>
                      {place.neighbourhood && (
                        <p className="font-body text-xs" style={{ color: '#9B8E84' }}>📍 {place.neighbourhood}</p>
                      )}
                    </div>
                    {selected ? (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#E8611A' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ) : (
                      <span className="font-body text-xs" style={{ color: '#E8611A' }}>+ Add</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected places (from search, shown at top) */}
          {selectedPlaces.filter((p) => !CURATED_PLACES.find((c) => c.name === p.name)).length > 0 && (
            <div className="mb-3">
              <p className="font-body text-xs font-semibold mb-2" style={{ color: '#9B8E84' }}>ADDED BY YOU</p>
              <div className="flex flex-col gap-2">
                {selectedPlaces
                  .filter((p) => !CURATED_PLACES.find((c) => c.name === p.name))
                  .map((place) => (
                    <div
                      key={place.name}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                      style={{ background: 'rgba(232,97,26,0.06)', border: '1.5px solid #E8611A' }}
                    >
                      <span className="text-xl">{place.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-semibold truncate" style={{ color: '#1A1205' }}>{place.name}</p>
                        {place.neighbourhood && (
                          <p className="font-body text-xs" style={{ color: '#9B8E84' }}>📍 {place.neighbourhood}</p>
                        )}
                      </div>
                      <button onClick={() => togglePlace(place)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="#9B8E84" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <p className="font-body text-xs font-semibold mb-2" style={{ color: '#9B8E84' }}>POPULAR IN BANGALORE</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {CURATED_PLACES.map((place) => {
              const selected = !!selectedPlaces.find((p) => p.name === place.name);
              return (
                <button
                  key={place.name}
                  onClick={() => togglePlace(place)}
                  className="rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
                  style={{
                    background: selected ? 'rgba(232,97,26,0.06)' : '#FFFFFF',
                    border: `1.5px solid ${selected ? '#E8611A' : '#E8E2DC'}`,
                  }}
                >
                  <span className="text-2xl block mb-1.5">{place.emoji}</span>
                  <p className="font-body text-sm font-semibold leading-tight" style={{ color: '#1A1205' }}>
                    {place.name}
                  </p>
                  <p className="font-body text-xs mt-0.5" style={{ color: '#9B8E84' }}>
                    {CATEGORY_EMOJI[place.category]} {place.neighbourhood}
                  </p>
                  {selected && (
                    <div
                      className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ background: '#E8611A' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-body text-xs font-semibold" style={{ color: '#FFFFFF' }}>Been here</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pb-8">
            <button
              onClick={() => {
                if (selectedPlaces.length > 0) {
                  setVibeIndex(0);
                  setStep('vibes');
                } else {
                  finish();
                }
              }}
              className="w-full py-4 rounded-2xl font-body font-semibold text-base active:opacity-80"
              style={{ background: '#E8611A', color: '#FFFFFF' }}
            >
              {selectedPlaces.length === 0
                ? 'Skip for now →'
                : `Rate ${selectedPlaces.length} place${selectedPlaces.length !== 1 ? 's' : ''} →`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Food categories ─────────────────────────────── */
  if (step === 'categories') {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
        <div className="h-12" />
        <div className="flex-1 flex flex-col px-5 pt-2 pb-8">
          <h1 className="font-display font-black text-3xl mb-1" style={{ color: '#1A1205' }}>
            What do you love eating?
          </h1>
          <p className="font-body text-sm mb-6" style={{ color: '#9B8E84' }}>
            Pick everything that gets you excited
          </p>

          <div className="flex flex-col gap-3 mb-8">
            {FOOD_CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl text-left active:scale-[0.98] transition-transform"
                  style={{
                    background: active ? 'rgba(232,97,26,0.06)' : '#FFFFFF',
                    border: `1.5px solid ${active ? '#E8611A' : '#E8E2DC'}`,
                  }}
                >
                  <span className="text-3xl">{cat.emoji}</span>
                  <div className="flex-1">
                    <p className="font-display font-bold text-base" style={{ color: '#1A1205' }}>{cat.label}</p>
                    <p className="font-body text-xs" style={{ color: '#9B8E84' }}>{cat.desc}</p>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{
                      borderColor: active ? '#E8611A' : '#D0C9C2',
                      background: active ? '#E8611A' : 'transparent',
                    }}
                  >
                    {active && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-auto">
            <button
              onClick={() => setStep('places')}
              className="w-full py-4 rounded-2xl font-body font-semibold text-base active:opacity-80"
              style={{ background: '#E8611A', color: '#FFFFFF' }}
            >
              {selectedCategories.length === 0 ? 'Skip →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Name (default first step) ───────────────────── */
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
      <div className="h-12" />
      <div className="flex-1 flex flex-col px-5 pt-2 pb-8">
        <p className="text-4xl mb-3">👋</p>
        <h1 className="font-display font-black text-3xl mb-1" style={{ color: '#1A1205' }}>
          Welcome to rfm.
        </h1>
        <p className="font-body text-sm mb-8" style={{ color: '#9B8E84' }}>
          What should we call you?
        </p>

        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-4 rounded-2xl font-body text-base outline-none"
          style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', color: '#1A1205' }}
          onKeyDown={(e) => e.key === 'Enter' && saveName()}
          autoFocus
        />

        <div className="mt-auto">
          <button
            onClick={saveName}
            disabled={!displayName.trim() || submitting}
            className="w-full py-4 rounded-2xl font-body font-semibold text-base disabled:opacity-50 active:opacity-80"
            style={{ background: '#E8611A', color: '#FFFFFF' }}
          >
            {submitting ? 'Saving…' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
