import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow: auth flow, banned page, API routes, static assets, admin
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/banned') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/admin') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Create a mutable response so refreshed session cookies can be written back.
  // Without this, Supabase access tokens expire after 1 hour and the user is
  // incorrectly treated as logged out even though their refresh token is valid.
  let response = NextResponse.next({ request: req });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
            response = NextResponse.next({ request: req });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
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

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
};
