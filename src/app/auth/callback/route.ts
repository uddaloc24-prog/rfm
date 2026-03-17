import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const { createClient } = await import('@/lib/supabase-server');
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && sessionData.user) {
      // Check if user is banned before redirecting
      const { data: profile } = await supabase
        .from('users')
        .select('is_banned')
        .eq('id', sessionData.user.id)
        .single();

      if (profile?.is_banned) {
        return NextResponse.redirect(`${origin}/banned`);
      }

      // If they came in with a specific ?next=, honour it.
      // Otherwise: new users → onboarding, returning users → home.
      let destination: string;
      if (next && next !== '/') {
        destination = next;
      } else {
        const { data: userProfile } = await supabase
          .from('users')
          .select('onboarded')
          .eq('id', sessionData.user.id)
          .single();

        if (userProfile?.onboarded) {
          destination = '/';
        } else {
          // Safety net: if the onboarded flag is false but the user has ratings,
          // they clearly completed onboarding — the flag just wasn't saved.
          // Fix it now and send them home instead of making them re-onboard.
          const { count } = await supabase
            .from('user_tags')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', sessionData.user.id);

          if ((count ?? 0) > 0) {
            await supabase
              .from('users')
              .update({ onboarded: true })
              .eq('id', sessionData.user.id);
            destination = '/';
          } else {
            destination = '/onboarding';
          }
        }
      }
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
