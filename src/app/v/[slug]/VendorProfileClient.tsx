'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Vendor, CATEGORY_LABELS, CATEGORY_EMOJI } from '@/lib/types';

interface Rater {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Props {
  vendor: Vendor;
}

export default function VendorProfileClient({ vendor }: Props) {
  const router = useRouter();
  const [showRaters, setShowRaters] = useState(false);
  const [raters, setRaters] = useState<Rater[]>([]);
  const [loadingRaters, setLoadingRaters] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/v/${vendor.slug}`
    : `https://rfm-nu.vercel.app/v/${vendor.slug}`;
  const shareMsg = encodeURIComponent(
    `${vendor.name} in ${vendor.neighbourhood ?? vendor.city} — found on Real Food Map 🍽️ ${shareUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${shareMsg}`;

  const openRatersSheet = useCallback(async () => {
    setShowRaters(true);
    if (raters.length > 0) return; // already loaded
    setLoadingRaters(true);
    try {
      const res = await fetch(`/api/vendors/${vendor.slug}/raters`);
      const data = await res.json();
      setRaters(data.raters ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoadingRaters(false);
    }
  }, [vendor.slug, raters.length]);

  return (
    <div className="min-h-dvh" style={{ background: '#FAFAF8' }}>
      {/* Hero */}
      <div
        className="relative h-56 flex flex-col justify-end"
        style={{ background: 'linear-gradient(135deg, #E8611A 0%, #F4A425 100%)' }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, rgba(0,0,0,0.25) 0%, transparent 50%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{ background: 'linear-gradient(to top, #FAFAF8, transparent)' }}
        />

        {/* Back button — 44px touch target */}
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-5 w-11 h-11 rounded-full flex items-center justify-center active:opacity-70"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Hero content */}
        <div className="relative px-5 pb-3">
          <span
            className="font-body text-xs font-semibold px-2.5 py-1 rounded-full mb-2 inline-block"
            style={{ background: 'rgba(0,0,0,0.22)', color: 'rgba(255,255,255,0.9)' }}
          >
            {CATEGORY_EMOJI[vendor.category]} {CATEGORY_LABELS[vendor.category]}
          </span>
          <h1 className="font-display font-black text-3xl leading-tight" style={{ color: '#FFFFFF' }}>
            {vendor.name}
          </h1>
          {(vendor.neighbourhood ?? vendor.city) && (
            <p className="font-body text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
              📍 {vendor.neighbourhood ?? vendor.city}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 pb-32">

        {/* Community score section */}
        {vendor.total_rating_count > 0 && (
          <div
            className="rounded-2xl p-4 mb-4 flex items-center justify-between"
            style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
          >
            <div>
              <p className="font-body text-sm font-semibold" style={{ color: '#1A1205' }}>
                Community Score
              </p>
              <button
                onClick={openRatersSheet}
                className="font-body text-xs mt-0.5 active:opacity-70 text-left"
                style={{ color: '#E8611A' }}
              >
                {vendor.total_rating_count} {vendor.total_rating_count === 1 ? 'person' : 'people'} tried this →
              </button>
            </div>
            <div className="flex items-baseline gap-1 shrink-0 ml-4">
              <span className="font-display font-black text-3xl" style={{ color: '#E8611A' }}>
                {vendor.community_score.toFixed(1)}
              </span>
              <span className="font-body text-sm" style={{ color: '#9B8E84' }}>/10</span>
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Known For', value: vendor.known_for, icon: '🌟' },
            { label: 'Hours', value: vendor.hours, icon: '🕐' },
            { label: 'Price Range', value: vendor.price_range, icon: '💰' },
            { label: 'Since', value: vendor.open_since ? `${vendor.open_since}` : null, icon: '📅' },
          ].map(({ label, value, icon }) =>
            value ? (
              <div
                key={label}
                className="rounded-2xl p-3"
                style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{icon}</span>
                  <span
                    className="font-body text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: '#9B8E84' }}
                  >
                    {label}
                  </span>
                </div>
                <p className="font-body text-sm font-medium leading-snug" style={{ color: '#1A1205' }}>
                  {value}
                </p>
              </div>
            ) : null
          )}
        </div>

        {/* Rate this place CTA */}
        <div
          className="rounded-2xl p-4 mb-6 flex items-center gap-3"
          style={{ background: 'rgba(232,97,26,0.06)', border: '1.5px solid rgba(232,97,26,0.2)' }}
        >
          <span className="text-2xl">⭐</span>
          <div className="flex-1">
            <p className="font-body text-sm font-semibold" style={{ color: '#1A1205' }}>Have you been here?</p>
            <p className="font-body text-xs" style={{ color: '#9B8E84' }}>Rate it to add to your personal food map</p>
          </div>
          <a
            href="/rate"
            className="font-body text-sm font-semibold px-3 py-1.5 rounded-xl active:opacity-70"
            style={{ background: '#E8611A', color: '#FFFFFF' }}
          >
            Rate
          </a>
        </div>
      </div>

      {/* WhatsApp share — fixed bottom */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 py-4"
        style={{
          background: 'rgba(250,250,248,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #E8E2DC',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-body font-semibold text-base active:opacity-80"
          style={{ background: '#25D366', color: '#FFFFFF' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Share on WhatsApp
        </a>
      </div>

      {/* Raters bottom sheet */}
      {showRaters && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowRaters(false)}
        >
          <div
            className="w-full max-w-[430px] mx-auto rounded-t-3xl overflow-hidden"
            style={{ background: '#FAFAF8', maxHeight: '70vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: '#E0D9D3' }} />
            </div>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E8E2DC' }}>
              <h2 className="font-display font-bold text-lg" style={{ color: '#1A1205' }}>
                Who&apos;s tried this
              </h2>
              <button
                onClick={() => setShowRaters(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full active:opacity-70"
                style={{ background: '#F0EBE5' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#6B5E55" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 100px)' }}>
              {loadingRaters ? (
                <div className="flex justify-center py-12">
                  <div
                    className="w-6 h-6 rounded-full border-2 animate-spin"
                    style={{ borderColor: '#E8611A', borderTopColor: 'transparent' }}
                  />
                </div>
              ) : raters.length === 0 ? (
                <div className="flex flex-col items-center py-12 px-5">
                  <span className="text-3xl mb-3">🍽️</span>
                  <p className="font-body text-sm text-center" style={{ color: '#9B8E84' }}>
                    No one has rated this place yet. Be the first!
                  </p>
                </div>
              ) : (
                <ul className="px-5 py-3 flex flex-col gap-1">
                  {raters.map((rater) => (
                    <li
                      key={rater.id}
                      className="flex items-center gap-3 py-2.5"
                      style={{ borderBottom: '1px solid #F0EBE5' }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-display font-bold text-sm"
                        style={{ background: 'rgba(232,97,26,0.12)', color: '#E8611A' }}
                      >
                        {(rater.display_name || rater.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold truncate" style={{ color: '#1A1205' }}>
                          {rater.display_name || rater.username}
                        </p>
                        <p className="font-body text-xs truncate" style={{ color: '#9B8E84' }}>
                          @{rater.username}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
