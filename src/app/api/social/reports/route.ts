import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

const VALID_REASONS = ['spam', 'harassment', 'inappropriate_content', 'fake'];
const VALID_TARGETS = ['vendor_post', 'comment', 'profile'];
const REVIEW_THRESHOLD = 5;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('users').select('is_banned').eq('id', user.id).single();
  if (me?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 });

  const { target_type, target_id, reason } = await req.json().catch(() => ({}));
  if (!VALID_TARGETS.includes(target_type)) return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 });
  if (!VALID_REASONS.includes(reason)) return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
  if (!target_id) return NextResponse.json({ error: 'target_id required' }, { status: 400 });

  const { error } = await supabase.from('reports').insert({ reporter_id: user.id, target_type, target_id, reason });
  if (error?.code === '23505') return NextResponse.json({ message: 'Already reported' }); // duplicate
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check report count and flag for review if threshold reached
  const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true })
    .eq('target_type', target_type).eq('target_id', target_id);

  if ((count ?? 0) >= REVIEW_THRESHOLD) {
    const table = target_type === 'vendor_post' ? 'vendor_posts' : target_type === 'comment' ? 'comments' : null;
    if (table) {
      await supabase.from(table).update({ needs_review: true }).eq('id', target_id);
    }
  }

  return NextResponse.json({ success: true });
}
