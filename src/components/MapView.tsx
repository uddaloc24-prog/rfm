'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TAG_EMOJI, type Tag } from '@/lib/types';

interface RatedRow {
  vendor: {
    id: string;
    name: string;
    slug: string;
    lat?: number | null;
    lng?: number | null;
    neighbourhood?: string | null;
    category: string;
  };
  tag: Tag;
  rank: number;
}

function createRankIcon(rank: number, isTop: boolean) {
  const size = isTop ? 40 : 34;
  const fontSize = isTop ? 13 : 11;
  const bg = isTop ? '#E8611A' : '#1A1205';
  const shadow = isTop
    ? '0 4px 14px rgba(232,97,26,0.55)'
    : '0 2px 8px rgba(26,18,5,0.35)';
  return L.divIcon({
    html: `<div style="
      background:${bg};
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      border:3px solid #fff;
      box-shadow:${shadow};
      display:flex;
      align-items:center;
      justify-content:center;
      color:#fff;
      font-weight:800;
      font-size:${fontSize}px;
      font-family:sans-serif;
      cursor:pointer;
    ">${rank}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 6)],
  });
}

const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946];

// Fits map bounds to all markers after mount
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 15, { animate: false });
    } else if (positions.length > 1) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: false });
    }
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Fires resize event after mount so tiles render correctly
function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

export default function MapView({ ratings }: { ratings: RatedRow[] }) {
  const mapped = ratings.filter((r) => r.vendor.lat && r.vendor.lng);
  const positions: [number, number][] = mapped.map((r) => [r.vendor.lat!, r.vendor.lng!]);

  const center: [number, number] =
    mapped.length > 0 ? [mapped[0].vendor.lat!, mapped[0].vendor.lng!] : BANGALORE_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
      />
      <FitBounds positions={positions} />
      <ResizeFix />
      {mapped.map((row) => (
        <Marker
          key={row.vendor.id}
          position={[row.vendor.lat!, row.vendor.lng!]}
          icon={createRankIcon(row.rank, row.rank === 1)}
        >
          <Popup closeButton={false} className="rfm-popup">
            <div style={{ minWidth: 170, fontFamily: 'sans-serif', padding: '2px 0' }}>
              <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: '#1A1205', lineHeight: 1.3 }}>
                {row.vendor.name}
              </p>
              {row.vendor.neighbourhood && (
                <p style={{ fontSize: 11, color: '#9B8E84', marginBottom: 6 }}>
                  📍 {row.vendor.neighbourhood}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{TAG_EMOJI[row.tag]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#E8611A' }}>#{row.rank}</span>
              </div>
              <a
                href={`/v/${row.vendor.slug}`}
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
                View place →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
