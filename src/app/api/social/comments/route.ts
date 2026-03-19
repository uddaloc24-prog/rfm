import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

const URL_RE = /https?:\/\/|www\./i;
function stripHtml(s: string): string { return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get('post_id');
  if (!postId) return NextResponse.json({ error: 'post_id required' }, { status: 400 });

  const { data: comments, error } = await supabase
    .from('comments')
    .select(`id, user_id, post_id, parent_comment_id, body, is_deleted, created_at,
      user:users!comments_user_id_fkey(username, display_name, avatar_url)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Nest replies under parents
  const topLevel = (comments ?? []).filter(c => !c.parent_comment_id);
  const replies = (comments ?? []).filter(c => c.parent_comment_id);
  const nested = topLevel.map(c => ({
    ...c,
    replies: replies.filter(r => r.parent_comment_id === c.id),
  }));

  return NextResponse.json({ comments: nested });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('users').select('is_banned').eq('id', user.id).single();
  if (me?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 });

  const { post_id, parent_comment_id, body: rawBody } = await req.json().catch(() => ({}));
  if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 });

  // Validate body
  const body = rawBody ? stripHtml(String(rawBody)).slice(0, 280) : '';
  if (!body) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
  if (URL_RE.test(body)) return NextResponse.json({ error: 'Links not allowed in comments' }, { status: 400 });

  // Fetch post
  const { data: post } = await supabase.from('vendor_posts').select('user_id, is_deleted').eq('id', post_id).single();
  if (!post || post.is_deleted) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  // Block check between commenter and post owner
  if (post.user_id !== user.id) {
    const { data: blockRow } = await supabase.from('blocks').select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${post.user_id}),and(blocker_id.eq.${post.user_id},blocked_id.eq.${user.id})`)
      .maybeSingle();
    if (blockRow) return NextResponse.json({ error: 'Cannot comment' }, { status: 403 });
  }

  // Reply depth guard: only one level of nesting allowed
  if (parent_comment_id) {
    const { data: parent } = await supabase.from('comments').select('id, parent_comment_id, post_id').eq('id', parent_comment_id).single();
    if (!parent) return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
    if (parent.post_id !== post_id) return NextResponse.json({ error: 'Parent comment does not belong to this post' }, { status: 400 });
    if (parent.parent_comment_id) return NextResponse.json({ error: 'Replies to replies are not allowed' }, { status: 400 });
  }

  // Rate limit: 20 comments / hour
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count } = await supabase.from('comments').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', hourAgo);
  if ((count ?? 0) >= 20) return NextResponse.json({ error: 'Comment limit reached. Try again later.' }, { status: 429 });

  const { data: comment, error } = await supabase.from('comments')
    .insert({ user_id: user.id, post_id, parent_comment_id: parent_comment_id ?? null, body })
    .select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notifications (fire-and-forget)
  if (post.user_id !== user.id) {
    void supabase.from('notifications').insert({
      recipient_id: post.user_id, actor_id: user.id,
      type: 'post_comment', target_type: 'vendor_post', target_id: post_id,
    });
  }

  if (parent_comment_id) {
    const { data: parentComment } = await supabase.from('comments').select('user_id').eq('id', parent_comment_id).single();
    if (parentComment && parentComment.user_id !== user.id && parentComment.user_id !== post.user_id) {
      void supabase.from('notifications').insert({
        recipient_id: parentComment.user_id, actor_id: user.id,
        type: 'comment_reply', target_type: 'comment', target_id: parent_comment_id,
      });
    }
  }

  return NextResponse.json({ id: comment.id, success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get('id');
  if (!commentId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: comment } = await supabase.from('comments').select('user_id, post_id').eq('id', commentId).single();
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Allow owner or post owner to delete
  if (comment.user_id !== user.id) {
    const { data: post } = await supabase.from('vendor_posts').select('user_id').eq('id', comment.post_id).single();
    if (post?.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await supabase.from('comments').update({ is_deleted: true }).eq('id', commentId);
  return NextResponse.json({ success: true });
}
