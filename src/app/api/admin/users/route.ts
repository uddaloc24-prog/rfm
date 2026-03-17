import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!user || !adminEmail || user.email !== adminEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id, action, reason } = await request.json();
    if (!user_id || !['ban', 'unban'].includes(action)) {
      return NextResponse.json({ error: 'user_id and action (ban|unban) required' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    if (action === 'ban') {
      const { error } = await adminDb
        .from('users')
        .update({ is_banned: true, banned_at: new Date().toISOString(), ban_reason: reason ?? null })
        .eq('id', user_id);
      if (error) throw error;

      // Revoke active sessions immediately
      try {
        await adminDb.auth.admin.signOut(user_id);
      } catch { /* non-fatal */ }
    } else {
      const { error } = await adminDb
        .from('users')
        .update({ is_banned: false, banned_at: null, ban_reason: null })
        .eq('id', user_id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
