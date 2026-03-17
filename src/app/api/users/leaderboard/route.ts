import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const city = searchParams.get('city');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  try {
    const supabase = await createClient();

    let query = supabase
      .from('users')
      .select('id, username, display_name, city, rating_count, avatar_url, created_at')
      .eq('is_banned', false)
      .gt('rating_count', 0)
      .order('rating_count', { ascending: false })
      .limit(limit);

    if (city) {
      query = query.eq('city', city);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ users: data ?? [] });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
