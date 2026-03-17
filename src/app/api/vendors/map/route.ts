import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') ?? 'Bangalore';

    const cutoff = new Date(Date.now() - 86400000).toISOString();

    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('id, name, slug, category, neighbourhood, city, lat, lng, community_score, status')
      .eq('city', city)
      .in('status', ['verified', 'pending'])
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (error) throw error;

    // Get recent rating counts for hot pins
    const { data: recentRatings } = await supabase
      .from('ratings')
      .select('vendor_id')
      .gte('created_at', cutoff);

    const recentMap: Record<string, number> = {};
    for (const r of recentRatings ?? []) {
      recentMap[r.vendor_id] = (recentMap[r.vendor_id] ?? 0) + 1;
    }

    const result = (vendors ?? []).map((v) => ({
      ...v,
      recent_count: recentMap[v.id] ?? 0,
    }));

    return NextResponse.json({ vendors: result });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
