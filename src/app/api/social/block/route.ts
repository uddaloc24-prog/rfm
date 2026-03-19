import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { blocked_id, action } = await req.json().catch(() => ({}));
  if (!blocked_id) return NextResponse.json({ error: 'blocked_id required' }, { status: 400 });
  if (blocked_id === user.id) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });

  if (action === 'unblock') {
    await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blocked_id);
    return NextResponse.json({ action: 'unblocked' });
  }

  // Insert block (idempotent)
  await supabase.from('blocks').upsert(
    { blocker_id: user.id, blocked_id },
    { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true }
  );

  // Remove follows in both directions
  await Promise.all([
    supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', blocked_id),
    supabase.from('follows').delete().eq('follower_id', blocked_id).eq('following_id', user.id),
  ]);

  return NextResponse.json({ action: 'blocked' });
}
