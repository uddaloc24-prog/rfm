import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

function computeScore(reactionScore: number, maxReactions: number, createdAt: string): number {
  const maxAgeSec = 72 * 3600;
  const ageSec = (Date.now() - new Date(createdAt).getTime()) / 1000;
  const normReaction = maxReactions > 0 ? reactionScore / maxReactions : 0;
  const normRecency = Math.max(0, 1 - ageSec / maxAgeSec);
  return normReaction * 0.4 + normRecency * 0.6;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') ?? 'following';
  const cursor = searchParams.get('cursor');
  const limit = 20;
  const windowStart = new Date(Date.now() - 72 * 3600 * 1000).toISOString();

  // Get blocked set
  const { data: blockedRows } = await supabase
    .from('blocks').select('blocked_id, blocker_id')
    .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
  const blockedSet = new Set<string>();
  (blockedRows ?? []).forEach(b => {
    if (b.blocker_id === user.id) blockedSet.add(b.blocked_id);
    if (b.blocked_id === user.id) blockedSet.add(b.blocker_id);
  });

  let targetUserIds: string[] | null = null;
  if (mode === 'following') {
    const { data: following } = await supabase
      .from('follows').select('following_id').eq('follower_id', user.id);
    targetUserIds = (following ?? []).map(f => f.following_id).filter(id => !blockedSet.has(id));
    if (targetUserIds.length === 0) return NextResponse.json({ events: [], nextCursor: null });
  }

  let query = supabase
    .from('feed_events')
    .select(`
      id, user_id, event_type, vendor_id, post_id, reaction_score, created_at,
      user:users!feed_events_user_id_fkey(username, display_name, avatar_url),
      vendor:vendors!feed_events_vendor_id_fkey(id, name, slug, neighbourhood),
      vendor_post:vendor_posts!feed_events_post_id_fkey(id, body, photo_url, rating_tag, created_at, edited_at)
    `)
    .eq('is_deleted', false)
    .gte('created_at', windowStart)
    .limit(limit * 3);

  if (cursor) query = query.lt('created_at', cursor);
  if (targetUserIds) query = query.in('user_id', targetUserIds);

  const { data: events, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = (events ?? []).filter(e => !blockedSet.has(e.user_id));
  const maxReactions = Math.max(...filtered.map(e => e.reaction_score), 1);
  const scored = filtered
    .map(e => ({ ...e, score: computeScore(e.reaction_score, maxReactions, e.created_at) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const nextCursor = scored.length === limit ? scored[scored.length - 1].created_at : null;
  return NextResponse.json({ events: scored, nextCursor });
}
