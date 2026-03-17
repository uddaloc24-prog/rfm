'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { Vendor, VendorCategory, CATEGORY_EMOJI, CATEGORY_LABELS, TAG_EMOJI, TAG_LABELS, type Tag } from '@/lib/types';
import { ensureVendorInDb } from '@/lib/vendor-utils';
import type { ComparisonCandidate } from '@/lib/elo';

type Stage = 'pick' | 'tag' | 'compare' | 'loading';

const CATEGORIES: VendorCategory[] = ['street_food', 'mess_tiffin', 'chai_snacks', 'restaurant', 'home_cook', 'other'];

const TAGS: { label: string; key: Tag; emoji: string }[] = [
  { label: TAG_LABELS.good,     key: 'good',     emoji: TAG_EMOJI.good },
  { label: TAG_LABELS.bad,      key: 'bad',       emoji: TAG_EMOJI.bad },
  { label: TAG_LABELS.very_bad, key: 'very_bad',  emoji: TAG_EMOJI.very_bad },
];

export default function RatePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('pick');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Vendor[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<VendorCategory>('restaurant');
  const [newNeighbourhood, setNewNeighbourhood] = useState('');
  const [addingVendor, setAddingVendor] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  // candidates: vendors to compare against (0-2), current index
  const [candidates, setCandidates] = useState<ComparisonCandidate[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  // candidate vendor details for displaying name/emoji on the comparison card
  const [candidateVendors, setCandidateVendors] = useState<Record<string, Vendor>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);

  // Pre-load full vendor list once on mount — all filtering is client-side (instant).
  useEffect(() => {
    fetch('/api/vendors/trending?limit=500')
      .then((r) => r.json())
      .then((d) => setAllVendors(d.vendors ?? []))
      .catch(() => {})
      .finally(() => setVendorsLoading(false));
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    setSearchResults(allVendors.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 10));
  }, [searchQuery, allVendors]);

  // What to show in the dropdown:
  // - If typing 2+ chars: filtered results
  // - If focused with <2 chars: top popular suggestions
  const showSuggestions = searchFocused && (searchResults.length > 0 || searchQuery.length < 2);
  const displayedVendors = searchQuery.length >= 2
    ? searchResults
    : allVendors.slice(0, 8);

  async function pickVendor(vendor: Vendor) {
    if (!user) return;
    setStage('loading');
    setError(null);
    const realVendor = await ensureVendorInDb(vendor);
    // If vendor creation failed, the id still starts with 'osm:' (not a real UUID).
    // Proceeding would cause the ratings API to fail with a FK/UUID error.
    if (realVendor.id.startsWith('osm:')) {
      setError("Couldn't add this place to the database — please try again.");
      setStage('pick');
      return;
    }
    setSelectedVendor(realVendor);
    setStage('tag');
  }

  async function handleTag(tag: Tag) {
    if (!selectedVendor) return;
    setStage('loading');
    setSelectedTag(tag);
    setError(null);

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: selectedVendor.id, tag }),
      });
      const data = await res.json();

      if (!res.ok) {
        // API returned an error — show it and let the user retry.
        setError(data.error ?? 'Could not save your rating — please try again.');
        setStage('tag');
        return;
      }

      const incoming: ComparisonCandidate[] = data.candidates ?? [];

      if (incoming.length === 0) {
        // No other rated places yet — skip comparisons and go to success.
        goToSuccess(selectedVendor, tag, null);
        return;
      }

      // Fetch vendor details for comparison cards (name + category for display).
      const vendorDetails = await fetchCandidateVendors(incoming.map((c) => c.vendor_id));
      setCandidateVendors(vendorDetails);
      setCandidates(incoming);
      setCandidateIndex(0);
      setStage('compare');
    } catch {
      setError('Network error — please check your connection and try again.');
      setStage('tag');
    }
  }

  async function fetchCandidateVendors(ids: string[]): Promise<Record<string, Vendor>> {
    try {
      const res = await fetch(`/api/vendors?ids=${ids.join(',')}`);
      if (!res.ok) return {};
      const data = await res.json();
      const map: Record<string, Vendor> = {};
      for (const v of data.vendors ?? []) map[v.id] = v;
      return map;
    } catch {
      return {};
    }
  }

  async function handleCompare(selectedVendorWon: boolean) {
    if (!selectedVendor || !selectedTag || submitting) return;
    const candidate = candidates[candidateIndex];
    if (!candidate) return;

    setSubmitting(true);

    const winner_vendor_id = selectedVendorWon ? selectedVendor.id : candidate.vendor_id;
    const loser_vendor_id  = selectedVendorWon ? candidate.vendor_id : selectedVendor.id;

    try {
      await fetch('/api/ratings/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_vendor_id, loser_vendor_id }),
      });
    } catch { /* non-fatal */ }

    const nextIndex = candidateIndex + 1;
    if (nextIndex < candidates.length) {
      setCandidateIndex(nextIndex);
      setSubmitting(false);
    } else {
      // All comparisons done — fetch updated rank and go to success.
      await goToSuccessAfterComparisons(selectedVendor, selectedTag);
    }
  }

  async function goToSuccessAfterComparisons(vendor: Vendor, tag: Tag) {
    try {
      const res = await fetch('/api/ratings/my-map');
      const data = await res.json();
      const myRow = (data.ratings ?? []).find(
        (r: { vendor: { id: string }; rank: number }) => r.vendor?.id === vendor.id
      );
      goToSuccess(vendor, tag, myRow?.rank ?? null);
    } catch {
      goToSuccess(vendor, tag, null);
    }
  }

  function goToSuccess(vendor: Vendor, tag: Tag, rank: number | null) {
    const params = new URLSearchParams({ vendor: vendor.name, tag });
    if (rank !== null) params.set('rank', String(rank));
    router.push(`/rate/success?${params.toString()}`);
  }

  async function handleAddNewVendor() {
    if (!newName.trim() || !user) return;
    setAddingVendor(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory,
          neighbourhood: newNeighbourhood.trim() || undefined,
          city: 'Bangalore',
        }),
      });
      const data = await res.json();
      if ((res.ok || res.status === 409) && data.vendor) {
        setShowAddForm(false);
        setNewName(''); setNewNeighbourhood('');
        await pickVendor(data.vendor as Vendor);
      }
    } catch { /* non-fatal */ }
    setAddingVendor(false);
  }

  // -------------------------------------------------------------------------
  // Not signed in
  // -------------------------------------------------------------------------

  if (!user) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: '#FAFAF8' }}>
        <p className="text-4xl mb-4">🍽️</p>
        <h2 className="font-display font-bold text-xl mb-2 text-center" style={{ color: '#1A1205' }}>
          Sign in to rate places
        </h2>
        <p className="font-body text-sm text-center mb-6" style={{ color: '#9B8E84' }}>
          Build your personal food ranking by comparing your favourite spots
        </p>
        <Link
          href="/auth"
          className="w-full max-w-xs py-4 rounded-2xl font-body font-semibold text-base text-center block"
          style={{ background: '#E8611A', color: '#FFFFFF' }}
        >
          Sign in →
        </Link>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (stage === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: '#E8E2DC', borderTopColor: '#E8611A' }}
          />
          <p className="font-body text-sm" style={{ color: '#9B8E84' }}>One sec…</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Tag stage — GOOD / BAD / VERY BAD
  // -------------------------------------------------------------------------

  if (stage === 'tag' && selectedVendor) {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
        <div className="h-10" />
        {error && (
          <div className="mx-5 mt-2 mb-0 px-4 py-3 rounded-2xl font-body text-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
            {error}
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center px-5 pb-8">
          <div className="text-center mb-10">
            <p className="font-body text-sm mb-2" style={{ color: '#9B8E84' }}>Just had</p>
            <h1 className="font-display font-black text-3xl leading-tight" style={{ color: '#1A1205' }}>
              {selectedVendor.name}
            </h1>
            <p className="font-body text-base mt-2" style={{ color: '#9B8E84' }}>How was it?</p>
          </div>

          <div className="flex flex-col gap-3">
            {TAGS.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTag(t.key)}
                className="w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left active:scale-[0.98] transition-transform"
                style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
              >
                <span className="text-4xl">{t.emoji}</span>
                <span className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Compare stage — BETTER / WORSE (max 2 cards)
  // -------------------------------------------------------------------------

  if (stage === 'compare' && selectedVendor && candidates[candidateIndex]) {
    const candidate = candidates[candidateIndex];
    const candidateVendor = candidateVendors[candidate.vendor_id];
    const totalCards = candidates.length;

    return (
      <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
        <div className="h-10" />
        <header className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl leading-tight" style={{ color: '#1A1205' }}>
              How was your <em>experience</em>?
            </h1>
            <p className="font-body text-xs mt-0.5" style={{ color: '#9B8E84' }}>
              {candidateIndex + 1} of {totalCards}
            </p>
          </div>
        </header>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 py-2">
          {candidates.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === candidateIndex ? '24px' : '8px',
                background: i < candidateIndex ? '#E8611A' : i === candidateIndex ? '#E8611A' : '#E8E2DC',
              }}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-center px-5 gap-2 py-4">
          <p className="font-body text-sm text-center mb-4" style={{ color: '#9B8E84' }}>
            Was your <strong style={{ color: '#1A1205' }}>experience</strong> at {selectedVendor.name} better or worse than…
          </p>

          {/* Comparison vendor card */}
          <div
            className="w-full rounded-3xl p-6 mb-4 text-center"
            style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
          >
            <span className="text-5xl block mb-3">
              {candidateVendor ? CATEGORY_EMOJI[candidateVendor.category] : '🍽️'}
            </span>
            <h3 className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>
              {candidateVendor?.name ?? '…'}
            </h3>
            {candidateVendor?.neighbourhood && (
              <p className="font-body text-sm mt-1" style={{ color: '#9B8E84' }}>
                📍 {candidateVendor.neighbourhood}
              </p>
            )}
          </div>

          {/* BETTER / WORSE buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleCompare(true)}
              disabled={submitting}
              className="flex-1 py-5 rounded-2xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-50"
              style={{ background: '#E8611A', color: '#FFFFFF' }}
            >
              Better 👆
            </button>
            <button
              onClick={() => handleCompare(false)}
              disabled={submitting}
              className="flex-1 py-5 rounded-2xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-50"
              style={{ background: '#FFFFFF', color: '#1A1205', border: '1.5px solid #E8E2DC' }}
            >
              Worse 👇
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Pick stage — search + add new place
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
      <div className="h-10" />
      <header className="flex items-center gap-4 px-5 py-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70"
          style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#1A1205" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>Rate a place</h1>
          <p className="font-body text-xs mt-0.5" style={{ color: '#9B8E84' }}>Search or add a spot you&apos;ve been to</p>
        </div>
      </header>

      {error && (
        <div className="mx-5 mb-3 px-4 py-3 rounded-2xl font-body text-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      <div className="px-5 pb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search for a place in Bangalore…"
            className="w-full px-4 py-3.5 rounded-2xl font-body text-sm outline-none"
            style={{
              background: '#FFFFFF',
              border: `1.5px solid ${searchFocused ? '#E8611A' : '#E8E2DC'}`,
              color: '#1A1205',
            }}
            autoFocus
          />
          {vendorsLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#E8E2DC', borderTopColor: '#E8611A' }} />
            </div>
          )}
        </div>
      </div>

      {showSuggestions && (
        <div className="px-5 mb-4">
          {searchQuery.length < 2 && (
            <p className="font-body text-xs mb-2 px-1" style={{ color: '#9B8E84' }}>
              {vendorsLoading ? 'Loading restaurants…' : 'Popular in Bangalore'}
            </p>
          )}
          {!vendorsLoading && displayedVendors.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
              {displayedVendors.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => pickVendor(v)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:opacity-70"
                  style={{
                    background: '#FFFFFF',
                    borderBottom: i < displayedVendors.length - 1 ? '1px solid #F0EBE5' : 'none',
                  }}
                >
                  <span className="text-2xl">{CATEGORY_EMOJI[v.category]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium truncate" style={{ color: '#1A1205' }}>{v.name}</p>
                    <p className="font-body text-xs" style={{ color: '#9B8E84' }}>
                      {v.neighbourhood ?? v.city}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="#C4B9B0" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && !vendorsLoading && displayedVendors.length === 0 && (
            <p className="font-body text-sm px-1" style={{ color: '#9B8E84' }}>
              No matches — use &quot;Add a new place&quot; below
            </p>
          )}
        </div>
      )}

      <div className="px-5">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="font-body text-sm"
            style={{ color: '#E8611A' }}
          >
            + Can&apos;t find it? Add a new place
          </button>
        ) : (
          <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC' }}>
            <p className="font-body text-xs font-semibold mb-3" style={{ color: '#9B8E84' }}>ADD A NEW PLACE</p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Place name"
              className="w-full px-3 py-2.5 rounded-xl font-body text-sm outline-none mb-2"
              style={{ background: '#FAFAF8', border: '1px solid #E8E2DC', color: '#1A1205' }}
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as VendorCategory)}
              className="w-full px-3 py-2.5 rounded-xl font-body text-sm outline-none mb-2"
              style={{ background: '#FAFAF8', border: '1px solid #E8E2DC', color: '#1A1205' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <input
              type="text"
              value={newNeighbourhood}
              onChange={(e) => setNewNeighbourhood(e.target.value)}
              placeholder="Neighbourhood (optional)"
              className="w-full px-3 py-2.5 rounded-xl font-body text-sm outline-none mb-3"
              style={{ background: '#FAFAF8', border: '1px solid #E8E2DC', color: '#1A1205' }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 rounded-xl font-body text-sm"
                style={{ background: '#F5F0EB', color: '#9B8E84' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewVendor}
                disabled={!newName.trim() || addingVendor}
                className="flex-1 py-2.5 rounded-xl font-body text-sm font-semibold disabled:opacity-50"
                style={{ background: '#E8611A', color: '#FFFFFF' }}
              >
                {addingVendor ? 'Adding…' : 'Rate this place'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
