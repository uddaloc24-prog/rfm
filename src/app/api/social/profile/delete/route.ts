import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

export async function POST() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Soft delete all posts and comments
  await supabase.from('vendor_posts').update({ is_deleted: true }).eq('user_id', user.id);
  await supabase.from('comments').update({ is_deleted: true }).eq('user_id', user.id);

  // Hard delete social graph + notifications
  await Promise.all([
    supabase.from('follows').delete().or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
    supabase.from('reactions').delete().eq('user_id', user.id),
    supabase.from('bookmarks').delete().eq('user_id', user.id),
    supabase.from('notifications').delete().eq('recipient_id', user.id),
    supabase.from('blocks').delete().or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
  ]);

  // Anonymize profile
  await supabase.from('users').update({
    username: `deleted_${user.id.slice(0, 8)}`,
    display_name: 'Deleted User',
    bio: null,
    avatar_url: null,
    neighborhood: null,
    is_banned: true,
  }).eq('id', user.id);

  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
