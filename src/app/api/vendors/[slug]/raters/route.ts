import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const supabase = await createClient();

    // Resolve slug → vendor_id
    const { data: vendor, error: vendorErr } = await supabase
      .from('vendors')
      .select('id')
      .eq('slug', slug)
      .single();

    if (vendorErr || !vendor) {
      return NextResponse.json({ raters: [], count: 0 });
    }

    // Fetch user_ids from personal_rankings (SELECT open) and join users (publicly readable)
    const { data: rows, error } = await supabase
      .from('personal_rankings')
      .select('user_id, elo_score, users(id, username, display_name, avatar_url)')
      .eq('vendor_id', vendor.id)
      .order('elo_score', { ascending: false })
      .limit(50);

    if (error) throw error;

    const raters = (rows ?? [])
      .map((r) => {
        const user = Array.isArray(r.users) ? r.users[0] : r.users;
        if (!user) return null;
        return {
          id: (user as { id: string }).id,
          username: (user as { username: string }).username,
          display_name: (user as { display_name: string }).display_name,
          avatar_url: (user as { avatar_url?: string | null }).avatar_url ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ raters, count: raters.length });
  } catch {
    return NextResponse.json({ raters: [], count: 0 });
  }
}
