import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { SEED_POSTS } from '@/lib/seed-data';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '0', 10);
  const limit = 20;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:users(id, username, display_name, city, rating_count, created_at),
        vendor:vendors(id, name, slug, neighbourhood, category)
      `)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (error) throw error;
    return NextResponse.json({ posts: data, page, hasMore: (data?.length ?? 0) === limit });
  } catch {
    return NextResponse.json({ posts: SEED_POSTS, page: 0, hasMore: false });
  }
}
