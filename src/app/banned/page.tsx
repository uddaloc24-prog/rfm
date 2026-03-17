'use client';

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function BannedPage() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch { /* non-fatal */ }
    router.push('/auth');
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#FAFAF8' }}
    >
      <div className="text-6xl mb-6">🚫</div>

      <h1 className="font-display font-black text-3xl leading-tight mb-3" style={{ color: '#1A1205' }}>
        Account Suspended
      </h1>

      <p className="font-body text-base mb-8 max-w-xs" style={{ color: '#9B8E84' }}>
        Your account has been suspended for violating our community guidelines. If you believe this is a mistake, please contact support.
      </p>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <a
          href="mailto:support@rfm.app"
          className="w-full py-4 rounded-2xl font-body font-semibold text-base text-center"
          style={{ background: '#E8611A', color: '#FFFFFF' }}
        >
          Contact Support
        </a>
        <button
          onClick={handleSignOut}
          className="w-full py-4 rounded-2xl font-body font-semibold text-base"
          style={{ background: '#FFFFFF', color: '#1A1205', border: '1px solid #E8E2DC' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
