import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const supabase = await createClient();
  const currentUser = await getUser();
  const { username } = await params;

  const { data: profile } = await supabase
    .from('users')
    .select('id, username, display_name, bio, neighborhood, avatar_url, is_list_private, is_banned, created_at')
    .eq('username', username)
    .single();

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!currentUser) {
    return NextResponse.json({ ...profile, follower_count: 0, following_count: 0, rated_count: 0 });
  }

  const [
    { count: followerCount },
    { count: followingCount },
    { count: ratedCount },
    { data: blockByMe },
    { data: blockByThem },
    { data: followRow },
  ] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    supabase.from('user_tags').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
    supabase.from('blocks').select('id').eq('blocker_id', currentUser.id).eq('blocked_id', profile.id).maybeSingle(),
    supabase.from('blocks').select('id').eq('blocker_id', profile.id).eq('blocked_id', currentUser.id).maybeSingle(),
    supabase.from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', profile.id).maybeSingle(),
  ]);

  if (blockByMe || blockByThem) {
    return NextResponse.json({ blocked: true, username: profile.username });
  }

  return NextResponse.json({
    ...profile,
    follower_count: followerCount ?? 0,
    following_count: followingCount ?? 0,
    rated_count: ratedCount ?? 0,
    is_following: !!followRow,
    is_blocked: false,
    is_blocked_by: false,
  });
}
