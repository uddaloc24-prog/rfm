import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/vendors?ids=uuid1,uuid2,...
// Used by the rate page to fetch vendor details for comparison cards.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ids = searchParams.get('ids');
  if (!ids) return NextResponse.json({ vendors: [] });

  const idList = ids.split(',').filter(Boolean).slice(0, 10);
  if (idList.length === 0) return NextResponse.json({ vendors: [] });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .in('id', idList);
    if (error) throw error;
    return NextResponse.json({ vendors: data ?? [] });
  } catch (e: unknown) {
    console.error('[GET /api/vendors]', e);
    return NextResponse.json({ vendors: [] });
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, known_for, open_since, hours, price_range,
            lat, lng, address_text, neighbourhood, city = 'Bangalore' } = body;

    const VALID_CATEGORIES = ['street_food', 'mess_tiffin', 'chai_snacks', 'restaurant', 'home_cook', 'other'];

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'name must be 100 characters or less' }, { status: 400 });
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }
    if (neighbourhood && typeof neighbourhood === 'string' && neighbourhood.length > 100) {
      return NextResponse.json({ error: 'neighbourhood must be 100 characters or less' }, { status: 400 });
    }
    if (lat !== undefined && lat !== null && (typeof lat !== 'number' || lat < -90 || lat > 90)) {
      return NextResponse.json({ error: 'lat must be a number between -90 and 90' }, { status: 400 });
    }
    if (lng !== undefined && lng !== null && (typeof lng !== 'number' || lng < -180 || lng > 180)) {
      return NextResponse.json({ error: 'lng must be a number between -180 and 180' }, { status: 400 });
    }
    if (open_since !== undefined && open_since !== null) {
      const year = Number(open_since);
      if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
        return NextResponse.json({ error: 'open_since must be a valid year between 1900 and now' }, { status: 400 });
      }
    }

    // Check for duplicates: proximity-based when lat/lng provided, else name-based
    if (lat && lng) {
      const { data: nearby } = await supabase
        .from('vendors')
        .select('id, name, lat, lng')
        .eq('city', city);

      const duplicate = nearby?.find(
        (v) => v.lat && v.lng && distanceMeters(lat, lng, v.lat, v.lng) < 100
      );
      if (duplicate) {
        const { data: existingVendor } = await supabase
          .from('vendors').select('*').eq('id', duplicate.id).single();
        return NextResponse.json(
          { error: 'A similar place already exists nearby', vendor: existingVendor },
          { status: 409 }
        );
      }
    } else {
      // Name-based dedup when no coordinates
      const { data: sameName } = await supabase
        .from('vendors')
        .select('id')
        .eq('city', city)
        .ilike('name', name)
        .limit(1)
        .single();
      if (sameName) {
        const { data: existingVendor } = await supabase
          .from('vendors').select('*').eq('id', sameName.id).single();
        return NextResponse.json(
          { error: 'A place with this name already exists', vendor: existingVendor },
          { status: 409 }
        );
      }
    }

    const slug = `${slugify(name)}-${Date.now().toString(36)}`;
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        name,
        slug,
        category: category ?? 'other',
        known_for,
        open_since,
        hours,
        price_range,
        lat: lat ?? null,
        lng: lng ?? null,
        address_text,
        neighbourhood,
        city,
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ vendor: data }, { status: 201 });
  } catch (e: unknown) {
    console.error('[POST /api/vendors]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
