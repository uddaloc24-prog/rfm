import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { following_id } = await request.json();
    if (!following_id) return NextResponse.json({ error: 'following_id required' }, { status: 400 });
    if (following_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

    // Toggle follow
    const { error: insertError } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id });

    if (insertError?.code === '23505') {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', following_id);
      return NextResponse.json({ following: false });
    }

    if (insertError) throw insertError;
    return NextResponse.json({ following: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
