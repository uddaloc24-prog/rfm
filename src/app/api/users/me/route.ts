import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const allowed = ['display_name', 'bio', 'city', 'avatar_url', 'onboarded', 'is_private', 'username'];
    const updates = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k))
    );

    // Uniqueness check for username
    if (updates.username) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', updates.username)
        .neq('id', user.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
