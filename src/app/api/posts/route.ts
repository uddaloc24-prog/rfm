import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { body, post_type = 'discovery', vendor_id } = await request.json();
    if (!body?.trim()) return NextResponse.json({ error: 'body is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: user.id, body, post_type, vendor_id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ post: data }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
