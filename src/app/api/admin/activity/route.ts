import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    if (request.cookies.get('rfm_admin')?.value !== 'granted') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));

    const adminDb = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminDb
      .from('user_tags')
      .select('user_id, vendor_id, tag, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + 49);

    if (error) throw error;
    return NextResponse.json({ activities: data ?? [] });
  } catch (e: unknown) {
    console.error('[GET /api/admin/activity]', e);
    return NextResponse.json({ activities: [] });
  }
}
