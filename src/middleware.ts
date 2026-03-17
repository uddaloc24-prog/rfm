import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow: auth flow, banned page, API routes, static assets
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/banned') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/manifest') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Not logged in → send to auth
    if (!user) {
      return NextResponse.redirect(new URL('/auth', req.url));
    }

    const { data: profile } = await supabase
      .from('users')
      .select('is_banned, onboarded')
      .eq('id', user.id)
      .single();

    if (profile?.is_banned) {
      return NextResponse.redirect(new URL('/banned', req.url));
    }
  } catch {
    // Supabase not configured or network error — allow through so the app still loads
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
};
