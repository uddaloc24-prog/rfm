import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get IDs of users who have set their profile to private
    const { data: privateUsers } = await supabase
      .from('users')
      .select('id')
      .eq('is_private', true);

    const privateIds = new Set((privateUsers ?? []).map((u: { id: string }) => u.id));

    // Fetch recent ratings with vendor info
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        personal_score,
        created_at,
        user_id,
        vendor:vendors(id, name, slug, category, neighbourhood, city, lat, lng)
      `)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) throw error;

    // Filter out private users
    const publicRatings = (data ?? []).filter((r: { user_id: string }) => !privateIds.has(r.user_id));

    // Fetch user profiles for the remaining raters
    const raterIds = [...new Set(publicRatings.map((r: { user_id: string }) => r.user_id))];
    const { data: users } = raterIds.length > 0
      ? await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', raterIds)
      : { data: [] };

    const userMap = new Map((users ?? []).map((u: { id: string }) => [u.id, u]));

    const result = publicRatings
      .slice(0, 30)
      .map((r: { user_id: string; personal_score: number; created_at: string; vendor: unknown }) => ({
        ...r,
        user: userMap.get(r.user_id) ?? null,
      }));

    return NextResponse.json({ ratings: result });
  } catch {
    return NextResponse.json({ ratings: [] });
  }
}
