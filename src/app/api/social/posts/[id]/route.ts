import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

const URL_RE = /https?:\/\/|www\./i;
function stripHtml(s: string): string { return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { body: rawBody } = await req.json().catch(() => ({}));

  const { data: post } = await supabase.from('vendor_posts').select('user_id, created_at, is_deleted').eq('id', id).single();
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (post.is_deleted) return NextResponse.json({ error: 'Post deleted' }, { status: 410 });
  if (Date.now() - new Date(post.created_at).getTime() > 15 * 60 * 1000) {
    return NextResponse.json({ error: 'Edit window has passed (15 minutes)' }, { status: 403 });
  }

  let cleanBody: string | null = null;
  if (rawBody !== undefined) {
    cleanBody = rawBody ? stripHtml(String(rawBody)).slice(0, 280) : null;
    if (cleanBody && URL_RE.test(cleanBody)) return NextResponse.json({ error: 'Links not allowed' }, { status: 400 });
  }

  const { error } = await supabase.from('vendor_posts')
    .update({ body: cleanBody, edited_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data: post } = await supabase.from('vendor_posts').select('user_id, photo_url, is_deleted').eq('id', id).single();
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (post.is_deleted) return NextResponse.json({ success: true });

  const { error } = await supabase.from('vendor_posts').update({ is_deleted: true }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (post.photo_url) {
    const path = post.photo_url.split('/post-photos/')[1];
    if (path) await supabase.storage.from('post-photos').remove([path]);
  }
  await supabase.from('feed_events').update({ is_deleted: true }).eq('post_id', id);
  return NextResponse.json({ success: true });
}
