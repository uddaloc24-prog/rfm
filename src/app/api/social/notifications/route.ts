import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

const MAX_NOTIFICATIONS = 200;

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('notifications')
    .select(`id, type, target_type, target_id, read, reaction_actors, created_at, updated_at,
      actor:users!notifications_actor_id_fkey(username, display_name, avatar_url)`)
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_NOTIFICATIONS);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadCount = (data ?? []).filter(n => !n.read).length;
  return NextResponse.json({ notifications: data ?? [], unread_count: unreadCount });
}

export async function PATCH(_req: NextRequest) {
  // Mark all as read
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('notifications').update({ read: true }).eq('recipient_id', user.id).eq('read', false);
  return NextResponse.json({ success: true });
}
