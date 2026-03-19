import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

const VALID_TARGETS = ['vendor_post', 'comment'];
const VALID_TYPES = ['fire', 'same', 'want_to_go'];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('users').select('is_banned').eq('id', user.id).single();
  if (me?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 });

  const { target_type, target_id, reaction_type } = await req.json().catch(() => ({}));
  if (!VALID_TARGETS.includes(target_type)) return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 });
  if (!VALID_TYPES.includes(reaction_type)) return NextResponse.json({ error: 'Invalid reaction_type' }, { status: 400 });
  if (!target_id) return NextResponse.json({ error: 'target_id required' }, { status: 400 });

  // Fetch target owner
  let targetOwnerId: string | null = null;
  if (target_type === 'vendor_post') {
    const { data } = await supabase.from('vendor_posts').select('user_id, is_deleted').eq('id', target_id).single();
    if (!data || data.is_deleted) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    targetOwnerId = data.user_id;
  } else {
    const { data } = await supabase.from('comments').select('user_id, is_deleted').eq('id', target_id).single();
    if (!data || data.is_deleted) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    targetOwnerId = data.user_id;
  }

  if (targetOwnerId === user.id) return NextResponse.json({ success: true }); // self-reaction: silently ignore

  // Block check
  const { data: blockRow } = await supabase.from('blocks').select('id')
    .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetOwnerId}),and(blocker_id.eq.${targetOwnerId},blocked_id.eq.${user.id})`)
    .maybeSingle();
  if (blockRow) return NextResponse.json({ success: true }); // blocked: silently ignore

  // Rate limit: 60 reactions / hour
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count } = await supabase.from('reactions').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', hourAgo);
  if ((count ?? 0) >= 60) return NextResponse.json({ error: 'Reaction limit reached' }, { status: 429 });

  // Toggle
  const { data: existing } = await supabase.from('reactions').select('id')
    .eq('user_id', user.id).eq('target_type', target_type).eq('target_id', target_id).eq('reaction_type', reaction_type).maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
    return NextResponse.json({ action: 'removed' });
  }

  await supabase.from('reactions').insert({ user_id: user.id, target_type, target_id, reaction_type });

  // Batched notification for post reactions (fire-and-forget)
  if (target_type === 'vendor_post' && targetOwnerId) {
    void (async () => {
      const { data: notif } = await supabase.from('notifications').select('id, reaction_actors')
        .eq('recipient_id', targetOwnerId).eq('type', 'post_reaction')
        .eq('target_id', target_id).eq('read', false).maybeSingle();
      if (notif) {
        await supabase.from('notifications').update({
          reaction_actors: [...(notif.reaction_actors ?? []), user.id],
          updated_at: new Date().toISOString(),
        }).eq('id', notif.id);
      } else {
        await supabase.from('notifications').insert({
          recipient_id: targetOwnerId, actor_id: user.id,
          type: 'post_reaction', target_type: 'vendor_post',
          target_id, reaction_actors: [user.id],
        });
      }
    })();
  }

  // Auto-bookmark for want_to_go (fire-and-forget)
  if (reaction_type === 'want_to_go' && target_type === 'vendor_post') {
    const { data: vp } = await supabase.from('vendor_posts').select('vendor_id').eq('id', target_id).single();
    if (vp) {
      void supabase.from('bookmarks')
        .upsert({ user_id: user.id, vendor_id: vp.vendor_id }, { onConflict: 'user_id,vendor_id', ignoreDuplicates: true });
    }
  }

  return NextResponse.json({ action: 'added' });
}
