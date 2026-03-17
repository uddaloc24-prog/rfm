'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VendorCategory, CATEGORY_EMOJI } from '@/lib/types';
import { eloToDisplayScore } from '@/lib/elo';

interface VendorPin {
  id: string;
  name: string;
  slug: string;
  category: VendorCategory;
  neighbourhood?: string | null;
  city: string;
  lat: number;
  lng: number;
  community_score: number;
  recent_count: number;
}

const CATEGORY_COLORS: Record<VendorCategory, string> = {
  street_food: '#E8611A',
  mess_tiffin: '#8B4513',
  chai_snacks: '#F4A425',
  restaurant: '#13132A',
  home_cook: '#25D366',
  other: '#9B8E84',
};

function createCategoryIcon(category: VendorCategory, isHot: boolean) {
  const color = CATEGORY_COLORS[category] ?? '#9B8E84';
  const emoji = CATEGORY_EMOJI[category] ?? '🥘';
  const size = 36;
  const pulse = isHot
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${color};opacity:0.25;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
    : '';

  return L.divIcon({
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${pulse}
        <div style="
          position:relative;
          background:${color};
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          border:2.5px solid #fff;
          box-shadow:0 2px 10px rgba(0,0,0,0.25);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:16px;
          cursor:pointer;
        ">${emoji}</div>
      </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 6)],
  });
}

const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946];

function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

interface Props {
  initialVendors?: VendorPin[];
}

export default function CommunityMapView({ initialVendors }: Props) {
  const [vendors, setVendors] = useState<VendorPin[]>(initialVendors ?? []);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  useEffect(() => {
    if (!initialVendors) {
      fetch('/api/vendors/map?city=Bangalore')
        .then((r) => r.json())
        .then((d) => setVendors(d.vendors ?? []))
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Supabase Realtime — update individual pin scores
  useEffect(() => {
    async function subscribe() {
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        const channel = supabase
          .channel('community-map-vendors')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'vendors', filter: 'city=eq.Bangalore' },
            (payload) => {
              setVendors((prev) =>
                prev.map((v) =>
                  v.id === payload.new.id
                    ? { ...v, community_score: payload.new.community_score ?? v.community_score }
                    : v
                )
              );
            }
          )
          .subscribe((status) => {
            setRealtimeConnected(status === 'SUBSCRIBED');
          });
        return () => { supabase.removeChannel(channel); };
      } catch {
        return undefined;
      }
    }
    const cleanup = subscribe();
    return () => { cleanup.then((fn) => fn?.()); };
  }, []);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Realtime indicator */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: realtimeConnected ? '#25D366' : '#C4B9B0', animation: realtimeConnected ? 'ping 1.5s ease infinite' : 'none' }} />
        <span style={{ fontFamily: 'sans-serif', fontSize: 11, fontWeight: 600, color: '#1A1205' }}>
          {vendors.length} places in Bangalore
        </span>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      <MapContainer
        center={BANGALORE_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
        />
        <ResizeFix />
        {vendors.map((v) => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={createCategoryIcon(v.category, v.recent_count > 0)}
          >
            <Popup closeButton={false} className="rfm-popup">
              <div style={{ minWidth: 160, fontFamily: 'sans-serif', padding: '2px 0' }}>
                <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: '#1A1205', lineHeight: 1.3 }}>
                  {CATEGORY_EMOJI[v.category]} {v.name}
                </p>
                {v.neighbourhood && (
                  <p style={{ fontSize: 11, color: '#9B8E84', marginBottom: 6 }}>📍 {v.neighbourhood}</p>
                )}
                {v.community_score > 0 && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#E8611A', lineHeight: 1 }}>
                      {eloToDisplayScore(v.community_score).toFixed(1)}
                    </span>
                    <span style={{ fontSize: 11, color: '#9B8E84' }}>/ 10 community</span>
                  </div>
                )}
                {v.recent_count > 0 && (
                  <p style={{ fontSize: 10, color: '#25D366', fontWeight: 600, marginBottom: 8 }}>🔥 Active today</p>
                )}
                <a
                  href={`/v/${v.slug}`}
                  style={{
                    display: 'block',
                    background: '#E8611A',
                    color: '#fff',
                    padding: '7px 0',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  View →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
