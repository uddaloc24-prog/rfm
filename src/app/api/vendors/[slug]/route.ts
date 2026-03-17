import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { SEED_VENDORS } from '@/lib/seed-data';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      const seed = SEED_VENDORS.find((v) => v.slug === slug);
      if (!seed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ vendor: seed });
    }

    return NextResponse.json({ vendor: data });
  } catch {
    const seed = SEED_VENDORS.find((v) => v.slug === slug);
    if (!seed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ vendor: seed });
  }
}
