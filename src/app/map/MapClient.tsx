'use client';

import { useRef, useState, useEffect, useMemo, useCallback, memo } from 'react';
import Map, { Marker, Popup, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { TAG_LABELS, type RatedVendorRow, type Tag } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const BANGALORE_CENTER = { longitude: 77.5946, latitude: 12.9716, zoom: 12 };

const TAG_COLORS: Record<Tag, string> = {
  good: '#22c55e',
  bad: '#f59e0b',
  very_bad: '#ef4444',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const VendorPin = memo(function VendorPin({
  row,
  onSelect,
}: {
  row: RatedVendorRow;
  // Accepts the stable setState dispatcher directly — avoids new closure on every parent render
  onSelect: (id: string) => void;
}) {
  return (
    <Marker
      longitude={row.vendor.lng!}
      latitude={row.vendor.lat!}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onSelect(row.vendor.id);
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: TAG_COLORS[row.tag] ?? '#22c55e',
          border: '2px solid #ffffff',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      />
    </Marker>
  );
});

function PopupCard({
  rating,
  onViewDetails,
}: {
  rating: RatedVendorRow;
  onViewDetails: () => void;
}) {
  const color = TAG_COLORS[rating.tag] ?? '#22c55e';
  return (
    <div style={{ width: 196 }}>
      <p style={{ fontWeight: 700, fontSize: 13, color: '#1A1205', marginBottom: 3, lineHeight: 1.35 }}>
        {rating.vendor.name}
      </p>
      {rating.vendor.neighbourhood && (
        <p style={{ fontSize: 11, color: '#9B8E84', marginBottom: 8 }}>
          📍 {rating.vendor.neighbourhood}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 9px',
            borderRadius: 20,
            background: color + '22',
            color,
          }}
        >
          {TAG_LABELS[rating.tag]}
        </span>
        <span style={{ fontSize: 11, color: '#9B8E84', whiteSpace: 'nowrap' }}>
          #{rating.rank} on your list
        </span>
      </div>
      <button
        onClick={onViewDetails}
        style={{
          width: '100%',
          background: '#E8611A',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '9px 0',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        View Details →
      </button>
    </div>
  );
}

function EmptySheet({ noCoords }: { noCoords?: boolean }) {
  return (
    <div
      className="absolute left-0 right-0 z-20"
      style={{ bottom: 0 }}
    >
      <div
        className="rounded-t-3xl px-5 py-6"
        style={{ background: '#1D1D35', borderTop: '1px solid #2A2A48' }}
      >
        <p className="font-body font-semibold text-sm mb-1" style={{ color: '#FDF8F2' }}>
          {noCoords ? 'No location data yet' : 'No places rated yet'}
        </p>
        <p className="font-body text-xs mb-4" style={{ color: '#8A7E74' }}>
          {noCoords
            ? 'Your rated places don\'t have map coordinates. Try rating restaurants from the main list.'
            : 'Rate a restaurant and it will appear here as a pin on your map.'}
        </p>
        <Link
          href="/rate"
          className="block text-center py-3 rounded-2xl font-body font-semibold text-sm"
          style={{ background: '#E8611A', color: '#FFFFFF' }}
        >
          Rate a Place
        </Link>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MapClient({ userId }: { userId: string }) {
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);

  // User location — kept separate from pin state so location updates don't re-render pins
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  // Intentional ref (not state) — avoids triggering a re-render on every GPS fix
  const hasCenteredRef = useRef(false);
  // AbortController for INSERT re-fetch — cancels any in-flight request before starting a new one
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Ratings (vendor pins)
  const [ratings, setRatings] = useState<RatedVendorRow[]>([]);
  const [loadingPins, setLoadingPins] = useState(true);

  // Popup — track which vendor pin is open
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Mappable pins (have coordinates) — memoized so location updates don't recalculate
  const mappablePins = useMemo(
    () => ratings.filter((r) => r.vendor?.lat != null && r.vendor?.lng != null),
    [ratings],
  );

  const selectedRating = useMemo(
    () => mappablePins.find((r) => r.vendor.id === selectedId) ?? null,
    [mappablePins, selectedId],
  );

  // ── Initial data fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/ratings/my-map')
      .then((r) => r.json())
      .then((data: { ratings?: RatedVendorRow[] }) => setRatings(data.ratings ?? []))
      .catch(() => setRatings([]))
      .finally(() => setLoadingPins(false));
  }, []);

  // ── User location watchPosition ────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Fly to user on first fix only — let them pan freely after
        if (!hasCenteredRef.current && mapRef.current) {
          hasCenteredRef.current = true;
          mapRef.current.flyTo({ center: [longitude, latitude], zoom: 14, speed: 1.5 });
        }
      },
      () => {
        // Location denied or unavailable — map stays at Bangalore center
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── Supabase Realtime subscriptions ───────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    // personal_rankings: INSERT (new pin) / UPDATE (elo/rank change) / DELETE (removed)
    const rankingsChannel = supabase
      .channel('map-ratings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personal_rankings',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Cancel any in-flight re-fetch before starting a new one (prevents race condition
            // where two rapid INSERTs resolve out of order and stomp each other's state)
            fetchAbortRef.current?.abort();
            const controller = new AbortController();
            fetchAbortRef.current = controller;
            try {
              const res = await fetch('/api/ratings/my-map', { signal: controller.signal });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = (await res.json()) as { ratings?: RatedVendorRow[] };
              setRatings(data.ratings ?? []);
            } catch (err) {
              if ((err as Error).name !== 'AbortError') {
                console.error('[map] INSERT re-fetch failed', err);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedVendorId = (payload.old as { vendor_id: string }).vendor_id;
            setRatings((prev) => prev.filter((r) => r.vendor.id !== deletedVendorId));
            setSelectedId((prev) => (prev === deletedVendorId ? null : prev));
          } else if (payload.eventType === 'UPDATE') {
            const { vendor_id, elo_score, rank_position } = payload.new as {
              vendor_id: string;
              elo_score: number;
              rank_position: number;
            };
            setRatings((prev) =>
              prev.map((r) =>
                r.vendor.id === vendor_id ? { ...r, elo_score, rank: rank_position } : r,
              ),
            );
          }
        },
      )
      .subscribe();

    // user_tags: UPDATE → change pin color in real time
    const tagsChannel = supabase
      .channel('map-tags')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_tags',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const { vendor_id, tag } = payload.new as { vendor_id: string; tag: Tag };
          setRatings((prev) =>
            prev.map((r) => (r.vendor.id === vendor_id ? { ...r, tag } : r)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rankingsChannel);
      supabase.removeChannel(tagsChannel);
    };
  }, [userId]);

  // ── Find Me ────────────────────────────────────────────────────────────────
  const handleFindMe = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        speed: 1.5,
      });
    }
  }, [userLocation]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={BANGALORE_CENTER}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onClick={() => setSelectedId(null)}
      >
        {/* Zoom in / zoom out — above Find Me button */}
        <NavigationControl position="bottom-right" showCompass={false} style={{ marginBottom: 52 }} />

        {/* User location pulsing dot */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="user-location-dot" />
          </Marker>
        )}

        {/* Vendor pins — memoized, keyed by id.
            Pass the stable setState dispatcher so memo short-circuits on GPS updates. */}
        {mappablePins.map((row) => (
          <VendorPin
            key={row.vendor.id}
            row={row}
            onSelect={setSelectedId}
          />
        ))}

        {/* Popup card */}
        {selectedRating && (
          <Popup
            longitude={selectedRating.vendor.lng!}
            latitude={selectedRating.vendor.lat!}
            anchor="bottom"
            offset={24}
            closeButton={false}
            onClose={() => setSelectedId(null)}
            maxWidth="none"
          >
            <PopupCard
              rating={selectedRating}
              onViewDetails={() => router.push(`/v/${selectedRating.vendor.slug}`)}
            />
          </Popup>
        )}
      </Map>

      {/* Loading spinner — top center, only while fetching initial pins */}
      {loadingPins && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#E8611A' }}
          />
        </div>
      )}

      {/* Find Me button — bottom right, above zoom controls */}
      <button
        onClick={handleFindMe}
        className="absolute z-20 w-11 h-11 rounded-xl flex items-center justify-center"
        style={{
          bottom: 14,
          right: 10,
          background: '#13132A',
          border: '1px solid #2A2A48',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
        }}
        aria-label="Center map on my location"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="#E8611A" strokeWidth="2" />
          <path
            d="M12 2v4M12 18v4M2 12h4M18 12h4"
            stroke="#E8611A"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Empty state — no rated places at all */}
      {!loadingPins && ratings.length === 0 && <EmptySheet />}
      {/* Empty state — has ratings but none have map coordinates */}
      {!loadingPins && ratings.length > 0 && mappablePins.length === 0 && <EmptySheet noCoords />}
    </div>
  );
}
