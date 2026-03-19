import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

const RESERVED = ['admin','support','help','about','login','signup','feed','map','community',
  'explore','settings','null','undefined','api','static','cdn','www','mail','root','system'];
const USERNAME_RE = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/;

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  if (body.username !== undefined) {
    const u = String(body.username).toLowerCase().trim();
    if (!USERNAME_RE.test(u)) {
      errors.username = 'Username must be 3–20 chars, letters/numbers/underscore, no leading/trailing/consecutive underscores';
    } else if (/_{2,}/.test(u)) {
      errors.username = 'No consecutive underscores allowed';
    } else if (RESERVED.includes(u)) {
      errors.username = 'This username is not available';
    } else {
      const { data: current } = await supabase
        .from('users').select('username, last_username_change_at').eq('id', user.id).single();
      if (current?.username !== u) {
        if (current?.last_username_change_at) {
          const daysSince = (Date.now() - new Date(current.last_username_change_at).getTime()) / 86400000;
          if (daysSince < 30) {
            errors.username = `You can change your username again in ${Math.ceil(30 - daysSince)} days`;
          }
        }
        if (!errors.username) {
          const { data: taken } = await supabase.from('users').select('id').eq('username', u).neq('id', user.id).maybeSingle();
          if (taken) { errors.username = 'Username already taken'; }
          else { updates.username = u; updates.last_username_change_at = new Date().toISOString(); }
        }
      }
    }
  }

  if (body.display_name !== undefined) {
    const dn = stripHtml(String(body.display_name)).slice(0, 40);
    if (dn.length < 1) errors.display_name = 'Display name required';
    else updates.display_name = dn;
  }

  if (body.bio !== undefined) updates.bio = stripHtml(String(body.bio)).slice(0, 120) || null;
  if (body.neighborhood !== undefined) updates.neighborhood = stripHtml(String(body.neighborhood)).slice(0, 60) || null;
  if (typeof body.is_list_private === 'boolean') updates.is_list_private = body.is_list_private;
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url || null;

  if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 422 });
  if (Object.keys(updates).length === 0) return NextResponse.json({ message: 'Nothing to update' });

  updates.updated_at = new Date().toISOString();
  const { error } = await supabase.from('users').update(updates).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
