import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

const URL_RE = /https?:\/\/|www\./i;

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function computeScore(reactionScore: number, maxReactions: number, createdAt: string): number {
  const maxAgeSec = 7 * 24 * 3600;
  const ageSec = (Date.now() - new Date(createdAt).getTime()) / 1000;
  const normReaction = maxReactions > 0 ? reactionScore / maxReactions : 0;
  const normRecency = Math.max(0, 1 - ageSec / maxAgeSec);
  return normReaction * 0.4 + normRecency * 0.6;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get('vendor_id');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  if (!vendorId) return NextResponse.json({ error: 'vendor_id required' }, { status: 400 });

  const { data: posts, error } = await supabase
    .from('vendor_posts')
    .select(`id, user_id, vendor_id, body, photo_url, rating_tag, created_at, edited_at,
      user:users!vendor_posts_user_id_fkey(username, display_name, avatar_url)`)
    .eq('vendor_id', vendorId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const postIds = (posts ?? []).map(p => p.id);
  if (postIds.length === 0) return NextResponse.json({ posts: [] });

  const [
    { data: reactionRows },
    { data: myReactionRows },
    { data: commentCountRows },
    { data: feedRows },
  ] = await Promise.all([
    supabase.from('reactions').select('target_id, reaction_type').eq('target_type', 'vendor_post').in('target_id', postIds),
    user
      ? supabase.from('reactions').select('target_id, reaction_type').eq('user_id', user.id).eq('target_type', 'vendor_post').in('target_id', postIds)
      : Promise.resolve({ data: [] as { target_id: string; reaction_type: string }[] }),
    supabase.from('comments').select('post_id').in('post_id', postIds).eq('is_deleted', false),
    supabase.from('feed_events').select('post_id, reaction_score').in('post_id', postIds),
  ]);

  const reactionCounts: Record<string, Record<string, number>> = {};
  const myReactions: Record<string, string[]> = {};
  const commentCounts: Record<string, number> = {};
  const feedScoreMap: Record<string, number> = {};

  (reactionRows ?? []).forEach(r => {
    reactionCounts[r.target_id] ??= {};
    reactionCounts[r.target_id][r.reaction_type] = (reactionCounts[r.target_id][r.reaction_type] ?? 0) + 1;
  });
  (myReactionRows ?? []).forEach(r => {
    myReactions[r.target_id] ??= [];
    myReactions[r.target_id].push(r.reaction_type);
  });
  (commentCountRows ?? []).forEach(r => { commentCounts[r.post_id] = (commentCounts[r.post_id] ?? 0) + 1; });
  (feedRows ?? []).forEach(f => { if (f.post_id) feedScoreMap[f.post_id] = f.reaction_score; });

  const maxReactions = Math.max(...Object.values(feedScoreMap), 1);
  const enriched = (posts ?? [])
    .map(p => ({
      ...p,
      reaction_counts: reactionCounts[p.id] ?? {},
      user_reactions: myReactions[p.id] ?? [],
      comment_count: commentCounts[p.id] ?? 0,
      score: computeScore(feedScoreMap[p.id] ?? 0, maxReactions, p.created_at),
    }))
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ posts: enriched });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('users').select('is_banned').eq('id', user.id).single();
  if (me?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { vendor_id, body: rawBody, photo_url, rating_tag } = body;

  if (!vendor_id) return NextResponse.json({ error: 'vendor_id required' }, { status: 400 });
  if (!rating_tag || !['good', 'bad', 'very_bad'].includes(rating_tag)) {
    return NextResponse.json({ error: 'Invalid rating_tag' }, { status: 400 });
  }

  let cleanBody: string | null = null;
  if (rawBody) {
    cleanBody = stripHtml(String(rawBody)).slice(0, 280);
    if (URL_RE.test(cleanBody)) return NextResponse.json({ error: 'Links are not allowed in posts' }, { status: 400 });
    if (!cleanBody) cleanBody = null;
  }

  // Rate limit: 10 posts / 24h
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const { count: recentCount } = await supabase.from('vendor_posts')
    .select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', dayAgo);
  if ((recentCount ?? 0) >= 10) {
    return NextResponse.json({ error: "You've reached your post limit for today" }, { status: 429 });
  }

  // One post per vendor
  const { data: existing } = await supabase.from('vendor_posts')
    .select('id').eq('user_id', user.id).eq('vendor_id', vendor_id).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'You already have a post for this place', existing_id: existing.id }, { status: 409 });
  }

  const { data: post, error } = await supabase
    .from('vendor_posts')
    .insert({ user_id: user.id, vendor_id, body: cleanBody, photo_url: photo_url ?? null, rating_tag })
    .select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void supabase.from('feed_events').insert({ user_id: user.id, event_type: 'posted', vendor_id, post_id: post.id });

  return NextResponse.json({ id: post.id, success: true });
}
