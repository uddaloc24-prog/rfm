import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    if (request.cookies.get('rfm_admin')?.value !== 'granted') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminDb = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers },
      { count: totalVendors },
      { count: totalRatings },
      { count: totalComparisons },
      { count: newUsers },
      { count: newRatings },
      { count: pendingVendors },
      { count: flaggedVendors },
      { count: vendorsWithNoCoords },
      { data: topVendors },
      { data: topUsers },
    ] = await Promise.all([
      adminDb.from('users').select('id', { count: 'exact', head: true }),
      adminDb.from('vendors').select('id', { count: 'exact', head: true }),
      adminDb.from('user_tags').select('user_id', { count: 'exact', head: true }),
      adminDb.from('comparisons').select('id', { count: 'exact', head: true }),
      adminDb.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      adminDb.from('user_tags').select('user_id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      adminDb.from('vendors').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      adminDb.from('vendors').select('id', { count: 'exact', head: true }).eq('status', 'flagged'),
      adminDb.from('vendors').select('id', { count: 'exact', head: true }).is('lat', null).neq('status', 'removed'),
      adminDb
        .from('vendors')
        .select('id, name, category, neighbourhood, total_rating_count, community_score, status')
        .neq('status', 'removed')
        .order('total_rating_count', { ascending: false })
        .limit(5),
      adminDb
        .from('users')
        .select('id, display_name, username, city, rating_count')
        .eq('is_banned', false)
        .order('rating_count', { ascending: false })
        .limit(5),
    ]);

    return NextResponse.json({
      totals: {
        users: totalUsers ?? 0,
        vendors: totalVendors ?? 0,
        ratings: totalRatings ?? 0,
        comparisons: totalComparisons ?? 0,
      },
      thisWeek: {
        newUsers: newUsers ?? 0,
        newRatings: newRatings ?? 0,
      },
      alerts: {
        pendingVendors: pendingVendors ?? 0,
        flaggedVendors: flaggedVendors ?? 0,
        vendorsWithNoCoords: vendorsWithNoCoords ?? 0,
      },
      topVendors: topVendors ?? [],
      topUsers: topUsers ?? [],
    });
  } catch (e: unknown) {
    console.error('[GET /api/admin/stats]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
