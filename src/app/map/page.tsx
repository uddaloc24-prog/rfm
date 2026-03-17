'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';

const MapClient = dynamic(() => import('./MapClient'), { ssr: false });

export default function MapPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-dvh flex flex-col"
        style={{ background: '#13132A' }}
      >
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#E8611A' }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-dvh flex flex-col"
        style={{ background: '#13132A' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-5xl mb-4">🗺️</p>
          <h2
            className="font-display font-bold text-2xl mb-2"
            style={{ color: '#FDF8F2' }}
          >
            Sign in to see your map
          </h2>
          <p className="font-body text-sm mb-6" style={{ color: '#8A7E74' }}>
            Rate places to build your personal food ranking
          </p>
          <Link
            href="/auth"
            className="px-8 py-3.5 rounded-2xl font-body font-semibold text-base"
            style={{ background: '#E8611A', color: '#FFFFFF' }}
          >
            Sign in →
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', position: 'relative', overflow: 'hidden', background: '#13132A' }}>
      {/* Map fills screen minus BottomNav */}
      <div style={{ position: 'absolute', inset: 0, bottom: 68 }}>
        <MapClient userId={user.id} />
      </div>
      <BottomNav />
    </div>
  );
}
