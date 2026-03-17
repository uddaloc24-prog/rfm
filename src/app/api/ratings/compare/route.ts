import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { processComparison } from '@/lib/rating-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { winner_vendor_id, loser_vendor_id } = await request.json();
    if (!winner_vendor_id || !loser_vendor_id) {
      return NextResponse.json(
        { error: 'winner_vendor_id and loser_vendor_id are required' },
        { status: 400 },
      );
    }

    // Saves comparison, runs ELO update + rank recalculation, refreshes community_score.
    await processComparison(supabase, user.id, winner_vendor_id, loser_vendor_id);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
