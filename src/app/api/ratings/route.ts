import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { saveTag, selectComparisonCandidates } from '@/lib/rating-service';
import type { Tag } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { vendor_id, tag } = await request.json();
    if (!vendor_id) return NextResponse.json({ error: 'vendor_id required' }, { status: 400 });
    if (!['good', 'bad', 'very_bad'].includes(tag)) {
      return NextResponse.json({ error: 'tag must be good | bad | very_bad' }, { status: 400 });
    }

    // Ensure public.users profile exists — handles cases where auth.users
    // still has an account after a DB reset (migration 009 deleted public.users rows
    // but not auth.users rows, so sign-ins don't re-trigger handle_new_user trigger).
    await supabase.from('users').upsert(
      {
        id: user.id,
        username: user.user_metadata?.username ?? `user_${user.id.slice(0, 8)}`,
        display_name: user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? 'Anonymous',
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    const { wasExisting } = await saveTag(supabase, user.id, vendor_id, tag as Tag);

    const candidates = await selectComparisonCandidates(supabase, user.id, vendor_id, tag as Tag);

    return NextResponse.json({ wasExisting, candidates }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
