'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

const STORAGE_KEY = 'rfm_onboarded';

const SLIDES = [
  {
    id: 'welcome',
    type: 'hero' as const,
  },
  {
    id: 'discover',
    emoji: '🍽️',
    title: 'Find the real good stuff',
    body: 'Browse community-rated dosa stalls, mess joints, and chai corners in Bangalore. No ads. No algorithms. Just honest picks.',
  },
  {
    id: 'rate',
    emoji: '🏆',
    title: 'Build your food map',
    body: 'Rate places you\'ve been. Compare them head-to-head. Own a personal ranking that actually reflects your taste.',
  },
  {
    id: 'share',
    emoji: '📲',
    title: 'Tell your friends',
    body: 'Found a gem? Share any spot on WhatsApp in one tap and show them exactly why it\'s worth the trip.',
    isFinal: true,
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingOverlay({ onComplete }: Props) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    } else {
      onComplete();
    }
  }, [onComplete]);

  const dismiss = useCallback(() => {
    setExiting(true);
    localStorage.setItem(STORAGE_KEY, '1');
    setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 380);
  }, [onComplete]);

  const next = useCallback(() => {
    if (step < SLIDES.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      if (delta > 0 && step < SLIDES.length - 1) setStep((s) => s + 1);
      if (delta < 0 && step > 0) setStep((s) => s - 1);
    }
    touchStartX.current = null;
  };

  if (!visible) return null;

  const slide = SLIDES[step];
  const isHero = slide.type === 'hero';
  const isFinal = 'isFinal' in slide && slide.isFinal;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col max-w-[430px] mx-auto"
      style={{
        background: '#FAFAF8',
        transition: 'opacity 0.38s ease, transform 0.38s ease',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(16px)' : 'translateY(0)',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hero slide */}
      {isHero && (
        <div className="flex-1 flex flex-col">
          {/* Saffron gradient top section */}
          <div
            className="flex-1 flex flex-col items-center justify-center pb-8"
            style={{
              background: 'linear-gradient(160deg, #E8611A 0%, #F4A425 55%, #FBBF24 100%)',
              minHeight: '55%',
            }}
          >
            {/* Pattern overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 15% 85%, rgba(0,0,0,0.12) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(255,255,255,0.12) 0%, transparent 40%)',
              }}
            />
            <div className="relative text-center px-8">
              <div
                className="font-display font-black tracking-tight mb-3"
                style={{ color: '#FFFFFF', fontSize: '72px', lineHeight: 1, textShadow: '0 2px 20px rgba(0,0,0,0.15)' }}
              >
                rfm.
              </div>
              <p className="font-body text-lg font-medium leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                Real Food Map of Bangalore
              </p>
            </div>
          </div>

          {/* Bottom white section */}
          <div className="bg-white px-8 pt-8 pb-6 flex flex-col gap-5">
            <div>
              <h2
                className="font-display font-black text-3xl leading-tight mb-3"
                style={{ color: '#1A1205' }}
              >
                Bangalore&apos;s food map — by people who actually eat here.
              </h2>
              <p className="font-body text-base leading-relaxed" style={{ color: '#9B8E84' }}>
                Discover the spots locals actually go to. Rate what you&apos;ve tried. Build your own ranked food map.
              </p>
            </div>

            <button
              onClick={next}
              className="w-full py-4 rounded-2xl font-body font-semibold text-base active:opacity-80 transition-opacity"
              style={{ background: '#E8611A', color: '#FFFFFF' }}
            >
              Show me →
            </button>
          </div>
        </div>
      )}

      {/* Feature slides */}
      {!isHero && (
        <>
          {/* Skip */}
          {!isFinal && (
            <button
              onClick={dismiss}
              className="absolute top-12 right-5 font-body text-sm active:opacity-60"
              style={{ color: '#C4B9B0' }}
            >
              Skip
            </button>
          )}

          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5 pt-16">
            {/* Emoji illustration */}
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-sm"
              style={{ background: '#FFF5F0', border: '1px solid #FFE4D6' }}
            >
              {'emoji' in slide && slide.emoji}
            </div>

            <div>
              <h2
                className="font-display font-black text-3xl leading-tight mb-3"
                style={{ color: '#1A1205' }}
              >
                {'title' in slide && slide.title}
              </h2>
              <p className="font-body text-base leading-relaxed" style={{ color: '#9B8E84' }}>
                {'body' in slide && slide.body}
              </p>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="px-8 pb-10 flex flex-col gap-4">
            {/* Dots */}
            <div className="flex items-center justify-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? '24px' : '8px',
                    background: i === step ? '#E8611A' : '#E8E2DC',
                  }}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-full py-4 rounded-2xl font-body font-semibold text-base active:opacity-80 transition-opacity"
              style={{ background: '#E8611A', color: '#FFFFFF' }}
            >
              {isFinal ? 'Start Exploring →' : 'Next →'}
            </button>
          </div>
        </>
      )}

      {/* Dots for hero slide */}
      {isHero && (
        <div
          className="absolute bottom-[140px] left-1/2 -translate-x-1/2 flex items-center gap-2"
        >
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? '24px' : '8px',
                background: i === step ? '#E8611A' : '#E8E2DC',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
