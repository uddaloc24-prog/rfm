'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

const PREVIEW_PLACES = [
  { rank: 1, emoji: '🍛', name: 'MTR', neighbourhood: 'Lalbagh', score: '10.0' },
  { rank: 2, emoji: '🍦', name: 'Corner House', neighbourhood: 'Indiranagar', score: '8.4' },
  { rank: 3, emoji: '🍖', name: 'Empire', neighbourhood: 'Koramangala', score: '7.1' },
];

const HOW_IT_WORKS = [
  {
    emoji: '🔍',
    title: 'Add a place',
    desc: 'Search any restaurant, café, or street food spot you\'ve been to in Bangalore',
  },
  {
    emoji: '😍',
    title: 'Say how it was',
    desc: 'Loved it? It was alright? Meh? One honest tap is all it takes',
  },
  {
    emoji: '⚖️',
    title: 'Compare your picks',
    desc: 'We ask which you preferred — and rank them on your personal map',
  },
];

function AuthContent() {
  const [screen, setScreen] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const router = useRouter();

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) throw oauthError;
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Failed to sign in');
      setLoading(false);
    }
  }

  const dots = (
    <div className="flex justify-center gap-2 pb-10">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: i === screen ? 24 : 8, background: i === screen ? '#E8611A' : '#D0C9C2' }}
        />
      ))}
    </div>
  );

  /* ── Screen 0: Hero ─────────────────────────────────── */
  if (screen === 0) {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
        <div className="flex-1 flex flex-col px-6 pt-14">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="font-display font-black text-5xl tracking-tight" style={{ color: '#E8611A' }}>rfm.</h1>
            <p className="font-body text-sm mt-1" style={{ color: '#9B8E84' }}>Real Food Map of Bangalore</p>
          </div>

          {/* Stacked rank-card preview */}
          <div className="relative" style={{ height: 200 }}>
            {PREVIEW_PLACES.map((p, i) => (
              <div
                key={p.rank}
                className="absolute left-0 right-0 rounded-3xl p-4 flex items-center gap-3"
                style={{
                  background: '#FFFFFF',
                  border: `1.5px solid ${i === 0 ? '#E8611A' : '#E8E2DC'}`,
                  boxShadow: i === 0
                    ? '0 8px 32px rgba(232,97,26,0.18)'
                    : `0 ${4 - i}px 12px rgba(0,0,0,0.05)`,
                  top: `${i * 50}px`,
                  transform: `scale(${1 - i * 0.035})`,
                  transformOrigin: 'center top',
                  zIndex: 3 - i,
                  opacity: 1 - i * 0.18,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-base shrink-0"
                  style={{ background: i === 0 ? '#E8611A' : '#F5F0EB', color: i === 0 ? '#FFFFFF' : '#9B8E84' }}
                >
                  {p.rank}
                </div>
                <span className="text-xl shrink-0">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold" style={{ color: '#1A1205' }}>{p.name}</p>
                  <p className="font-body text-xs" style={{ color: '#9B8E84' }}>📍 {p.neighbourhood}</p>
                </div>
                <p className="font-display font-black text-base shrink-0" style={{ color: '#E8611A' }}>{p.score}</p>
              </div>
            ))}
          </div>

          {/* Copy + CTA */}
          <div className="mt-auto pt-6 pb-4">
            <h2 className="font-display font-black text-3xl leading-tight mb-2" style={{ color: '#1A1205' }}>
              Your personal<br />food ranking
            </h2>
            <p className="font-body text-sm mb-8" style={{ color: '#9B8E84' }}>
              Every place you eat, ranked by how much you love it — just for you.
            </p>
            <button
              onClick={() => setScreen(1)}
              className="w-full py-4 rounded-2xl font-body font-semibold text-base active:opacity-80"
              style={{ background: '#E8611A', color: '#FFFFFF' }}
            >
              Get started →
            </button>
            <button
              onClick={() => router.push('/admin-login')}
              className="w-full py-2 font-body text-xs active:opacity-60"
              style={{ color: '#C4B9B0', background: 'transparent', border: 'none' }}
            >
              Admin mode
            </button>
          </div>
        </div>
        {dots}
      </div>
    );
  }

  /* ── Screen 1: How it works ──────────────────────────── */
  if (screen === 1) {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
        <div className="flex-1 flex flex-col px-6 pt-14 pb-6">
          <h2 className="font-display font-black text-3xl mb-1" style={{ color: '#1A1205' }}>
            How rfm. works
          </h2>
          <p className="font-body text-sm mb-8" style={{ color: '#9B8E84' }}>
            No star ratings. No inflated scores. Just honest comparisons.
          </p>

          <div className="flex flex-col gap-5">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC' }}
                >
                  {step.emoji}
                </div>
                <div className="pt-0.5">
                  <p className="font-display font-bold text-base mb-0.5" style={{ color: '#1A1205' }}>{step.title}</p>
                  <p className="font-body text-sm" style={{ color: '#9B8E84' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Result teaser */}
          <div
            className="mt-8 rounded-3xl p-5 flex items-center gap-4"
            style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'rgba(232,97,26,0.08)' }}
            >
              🗺️
            </div>
            <div>
              <p className="font-display font-bold text-base" style={{ color: '#1A1205' }}>Your map builds itself</p>
              <p className="font-body text-xs mt-0.5" style={{ color: '#9B8E84' }}>
                The more you rate, the sharper your personal ranking gets
              </p>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <button
              onClick={() => setScreen(2)}
              className="w-full py-4 rounded-2xl font-body font-semibold text-base active:opacity-80"
              style={{ background: '#E8611A', color: '#FFFFFF' }}
            >
              Next →
            </button>
          </div>
        </div>
        {dots}
      </div>
    );
  }

  /* ── Screen 2: Sign in ───────────────────────────────── */
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#FAFAF8' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-6xl mb-6">🍽️</p>
        <h2 className="font-display font-black text-3xl mb-2 text-center" style={{ color: '#1A1205' }}>
          Ready to start?
        </h2>
        <p className="font-body text-sm text-center mb-10" style={{ color: '#9B8E84' }}>
          Build your personal food map for free
        </p>

        {(error || authError) && (
          <p className="font-body text-sm text-center mb-4" style={{ color: '#E8611A' }}>
            {error || 'Sign in failed. Please try again.'}
          </p>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-body font-semibold text-base active:opacity-80 disabled:opacity-60 transition-opacity"
          style={{ background: '#FFFFFF', color: '#1A1205', border: '1px solid #E8E2DC', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          {loading ? (
            <span>Signing in…</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="font-body text-xs text-center mt-5" style={{ color: '#9B8E84' }}>
          By continuing you agree to our Terms of Service
        </p>
      </div>
      {dots}
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" style={{ background: '#FAFAF8' }} />}>
      <AuthContent />
    </Suspense>
  );
}
