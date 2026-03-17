import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { Vendor, VendorCategory } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') as VendorCategory | null;
  const city = searchParams.get('city') ?? 'Bangalore';
  const q = searchParams.get('q');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 30;

  try {
    const supabase = await createClient();
    let query = supabase
      .from('vendors')
      .select('*')
      .eq('city', city)
      .in('status', ['verified', 'pending'])
      .order('daily_score', { ascending: false })
      .limit(limit);

    if (category && category !== ('all' as VendorCategory)) {
      query = query.eq('category', category);
    }

    if (q) {
      query = query.ilike('name', `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    const vendors: Vendor[] = (data ?? []).map((v) => ({ ...v, _source: 'db' as const }));
    return NextResponse.json({ vendors });
  } catch {
    return NextResponse.json({ vendors: [] });
  }
}
