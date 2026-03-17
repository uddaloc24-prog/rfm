'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { TAG_EMOJI, TAG_LABELS, type Tag } from '@/lib/types';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const vendorName = searchParams.get('vendor') ?? 'That Place';
  const tag = (searchParams.get('tag') ?? 'good') as Tag;
  const rankParam = searchParams.get('rank');
  const rank = rankParam ? parseInt(rankParam, 10) : null;
  const rankSuffix = !rank ? '' : rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';

  const tagEmoji = TAG_EMOJI[tag] ?? '😋';
  const tagLabel = TAG_LABELS[tag] ?? 'Loved it';

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#FAFAF8' }}
    >
      <div className="text-7xl mb-6 animate-bounce">{tagEmoji}</div>

      <h1 className="font-display font-black text-4xl leading-tight mb-2" style={{ color: '#1A1205' }}>
        {rank === 1 ? 'New #1!' : 'Added!'}
      </h1>

      <p className="font-body text-base mb-8" style={{ color: '#9B8E84' }}>
        {vendorName} · {tagLabel}
      </p>

      {/* Rank card — only shown after comparisons */}
      {rank !== null ? (
        <div
          className="w-full rounded-3xl p-8 mb-8"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2DC',
            boxShadow: '0 8px 40px rgba(232,97,26,0.08)',
          }}
        >
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#9B8E84' }}>
            Ranked on your map
          </p>
          <div
            className="font-display font-black leading-none mb-1"
            style={{ color: '#E8611A', fontSize: '64px' }}
          >
            #{rank}
          </div>
          <p className="font-body text-sm mt-2" style={{ color: '#9B8E84' }}>
            {rank}{rankSuffix} on your personal list
          </p>
        </div>
      ) : (
        <div
          className="w-full rounded-3xl p-8 mb-8"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2DC',
            boxShadow: '0 8px 40px rgba(232,97,26,0.08)',
          }}
        >
          <p className="text-4xl mb-3">📍</p>
          <p className="font-body text-sm" style={{ color: '#9B8E84' }}>
            Rate more places to see how they rank against each other.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="w-full flex flex-col gap-3">
        <Link
          href="/me?tab=list"
          className="w-full py-4 rounded-2xl font-body font-semibold text-base text-center active:opacity-80"
          style={{ background: '#E8611A', color: '#FFFFFF' }}
        >
          See my list →
        </Link>
        <button
          onClick={() => router.push('/rate')}
          className="w-full py-4 rounded-2xl font-body font-semibold text-base active:opacity-70"
          style={{ background: '#FFFFFF', color: '#1A1205', border: '1px solid #E8E2DC' }}
        >
          Keep rating
        </button>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" style={{ background: '#FAFAF8' }} />}>
      <SuccessContent />
    </Suspense>
  );
}
