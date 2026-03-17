import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Toggle: try insert, if conflict then delete
    const { error: insertError } = await supabase
      .from('likes')
      .insert({ user_id: user.id, post_id: id });

    if (insertError?.code === '23505') {
      // Already liked — unlike
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', id);
      return NextResponse.json({ liked: false });
    }

    if (insertError) throw insertError;
    return NextResponse.json({ liked: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
