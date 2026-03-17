'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: SupabaseUser | null;
  profile: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    async function init() {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile();
      setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile();
          } else {
            setProfile(null);
          }
        }
      );
      unsub = () => subscription.unsubscribe();
    }

    init();
    return () => unsub?.();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/auth');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
