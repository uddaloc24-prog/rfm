import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function PATCH(request: NextRequest) {
  try {
    if (request.cookies.get('rfm_admin')?.value !== 'granted') {
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

export async function DELETE(request: NextRequest) {
  try {
    if (request.cookies.get('rfm_admin')?.value !== 'granted') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id } = await request.json();
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Delete public.users row first — cascades all ratings, rankings, tags, etc.
    const { error: dbError } = await adminDb.from('users').delete().eq('id', user_id);
    if (dbError) throw dbError;

    // Delete from auth.users (hard delete)
    const { error: authError } = await adminDb.auth.admin.deleteUser(user_id);
    if (authError) throw authError;

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
