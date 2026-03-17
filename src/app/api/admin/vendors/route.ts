import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const VALID_STATUSES = ['pending', 'verified', 'flagged', 'removed'];

export async function PATCH(request: NextRequest) {
  try {
    // Use session client only to verify admin identity
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!user || !adminEmail || user.email !== adminEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vendor_id, status } = body;

    if (!vendor_id) {
      return NextResponse.json({ error: 'vendor_id required' }, { status: 400 });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Build update payload — allow status + editable fields
    const EDITABLE = ['name', 'neighbourhood', 'hours', 'price_range', 'known_for', 'lat', 'lng'];
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    for (const field of EDITABLE) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Use service-role client to bypass RLS for admin mutations
    const adminDb = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminDb
      .from('vendors')
      .update(updates)
      .eq('id', vendor_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ vendor: data });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
