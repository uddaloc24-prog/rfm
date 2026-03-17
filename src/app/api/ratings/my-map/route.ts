import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Two parallel queries — avoids relying on an undefined FK between
    // personal_rankings and user_tags in PostgREST.
    const [rankingsRes, tagsRes] = await Promise.all([
      supabase
        .from('personal_rankings')
        // Order by elo_score DESC so rank is always derived from actual ELO, not the
        // cached rank_position field (which can be stale if recalculate_user_ranks failed).
        .select('elo_score, updated_at, vendor_id, vendors(*)')
        .eq('user_id', user.id)
        .order('elo_score', { ascending: false })
        .order('updated_at', { ascending: false }),
      supabase
        .from('user_tags')
        .select('vendor_id, tag')
        .eq('user_id', user.id),
    ]);

    if (rankingsRes.error) throw rankingsRes.error;

    const tagMap = new Map(
      (tagsRes.data ?? []).map((t) => [t.vendor_id, t.tag as string])
    );

    // If personal_rankings has data, use it (normal path).
    if (rankingsRes.data && rankingsRes.data.length > 0) {
      const ratings = rankingsRes.data
        .map((r, i) => {
          // PostgREST can return the FK embed as an array or a single object — normalise.
          const vendor = Array.isArray(r.vendors)
            ? (r.vendors[0] ?? null)
            : (r.vendors ?? null);
          if (!vendor) return null; // skip if vendor was deleted or join failed
          return {
            rank: i + 1,          // computed from elo_score sort order — always accurate
            elo_score: r.elo_score,
            updated_at: r.updated_at,
            tag: tagMap.get(r.vendor_id) ?? 'good',
            vendor,
          };
        })
        .filter(Boolean);
      return NextResponse.json({ ratings });
    }

    // Fallback: personal_rankings is empty but user_tags has data.
    // This happens when saveTag wrote user_tags but the personal_rankings
    // upsert failed, or when old ratings exist without new comparison data.
    if (tagsRes.data && tagsRes.data.length > 0) {
      const vendorIds = tagsRes.data.map((t) => t.vendor_id);
      const { data: vendorRows } = await supabase
        .from('vendors')
        .select('*')
        .in('id', vendorIds);
      const vendorMap = new Map((vendorRows ?? []).map((v) => [v.id, v]));

      const ratings = tagsRes.data
        .filter((t) => vendorMap.has(t.vendor_id))
        .map((t, i) => ({
          rank: i + 1,
          elo_score: 1000,
          updated_at: new Date().toISOString(),
          tag: t.tag as string,
          vendor: vendorMap.get(t.vendor_id)!,
        }));
      return NextResponse.json({ ratings });
    }

    return NextResponse.json({ ratings: [] });
  } catch {
    return NextResponse.json({ ratings: [] });
  }
}
