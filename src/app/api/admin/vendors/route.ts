import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const VALID_STATUSES = ['pending', 'verified', 'flagged', 'removed'];
const VALID_CATEGORIES = ['street_food', 'mess_tiffin', 'chai_snacks', 'restaurant', 'home_cook', 'other'];

export async function PATCH(request: NextRequest) {
  try {
    if (request.cookies.get('rfm_admin')?.value !== 'granted') {
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
    if (body.category !== undefined && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Build update payload — allow status + editable fields
    const EDITABLE = ['name', 'neighbourhood', 'hours', 'price_range', 'known_for', 'lat', 'lng'];
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    for (const field of EDITABLE) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    if (body.category !== undefined) updates.category = body.category;
    if (body.open_since !== undefined && body.open_since !== '') {
      const yr = parseInt(body.open_since, 10);
      if (!isNaN(yr) && yr > 1800 && yr <= new Date().getFullYear()) updates.open_since = yr;
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
    console.error('[PATCH /api/admin/vendors]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
