import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { following_id } = await req.json().catch(() => ({}));
  if (!following_id) return NextResponse.json({ error: 'following_id required' }, { status: 400 });
  if (following_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  const { data: me } = await supabase.from('users').select('is_banned').eq('id', user.id).single();
  if (me?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 });

  // Block check — cannot follow someone who has blocked you
  const { data: blockRow } = await supabase
    .from('blocks').select('id')
    .eq('blocker_id', following_id).eq('blocked_id', user.id).maybeSingle();
  if (blockRow) return NextResponse.json({ error: 'Cannot follow this user' }, { status: 403 });

  // Rate limit: 50 follows per hour
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count } = await supabase.from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', user.id).gte('created_at', hourAgo);
  if ((count ?? 0) >= 50) return NextResponse.json({ error: 'Follow limit reached. Try again later.' }, { status: 429 });

  // Toggle follow
  const { data: existing } = await supabase.from('follows')
    .select('follower_id').eq('follower_id', user.id).eq('following_id', following_id).maybeSingle();

  if (existing) {
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', following_id);
    return NextResponse.json({ action: 'unfollowed' });
  }

  await supabase.from('follows').insert({ follower_id: user.id, following_id });

  // Notification (fire and forget)
  supabase.from('notifications').insert({
    recipient_id: following_id, actor_id: user.id,
    type: 'new_follower', target_type: 'user', target_id: user.id,
  });

  return NextResponse.json({ action: 'followed' });
}
