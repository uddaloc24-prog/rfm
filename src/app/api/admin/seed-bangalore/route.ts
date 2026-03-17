import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { VendorCategory } from '@/lib/types';

const AMENITY_CATEGORY: Record<string, VendorCategory> = {
  restaurant: 'restaurant',
  cafe: 'chai_snacks',
  fast_food: 'street_food',
  food_court: 'mess_tiffin',
  bar: 'restaurant',
  ice_cream: 'chai_snacks',
};

interface OsmElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function POST(req: NextRequest) {
  // Admin-only: verify caller is the admin user
  try {
    const { createClient } = await import('@/lib/supabase-server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!user || !adminEmail || user.email !== adminEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    void req; // suppress unused param warning
    // Query Overpass for well-known Bangalore food places
    // (has cuisine tag = more established/documented places)
    const query = `[out:json][timeout:20];
(
  node["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]["name"]["cuisine"](12.7,77.3,13.3,77.9);
  way["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]["name"]["cuisine"](12.7,77.3,13.3,77.9);
  node["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]["name"]["website"](12.7,77.3,13.3,77.9);
  way["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]["name"]["website"](12.7,77.3,13.3,77.9);
);
out center 60;`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000);

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('Overpass fetch failed');
    const osmData = await res.json();

    const supabase = createAdminClient();

    // Fetch existing vendor names (to avoid duplicates)
    const { data: existing } = await supabase
      .from('vendors')
      .select('name')
      .eq('city', 'Bangalore');
    const existingNames = new Set((existing ?? []).map((v: { name: string }) => v.name.toLowerCase()));

    const toInsert: Array<Record<string, unknown>> = [];

    for (const el of (osmData.elements ?? []) as OsmElement[]) {
      const tags = el.tags ?? {};
      if (!tags.name) continue;
      if (existingNames.has(tags.name.toLowerCase())) continue;

      const lat = el.lat ?? el.center?.lat ?? null;
      const lng = el.lon ?? el.center?.lon ?? null;
      const amenity = tags.amenity as string;
      const neighbourhood =
        tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter'] || null;

      toInsert.push({
        name: tags.name,
        slug: `${slugify(tags.name)}-${el.id.toString(36)}`,
        category: AMENITY_CATEGORY[amenity] ?? 'restaurant',
        neighbourhood,
        city: 'Bangalore',
        lat,
        lng,
        address_text: tags['addr:street'] ? `${tags['addr:housenumber'] ?? ''} ${tags['addr:street']}`.trim() : null,
        status: 'pending',
        known_for: tags.cuisine ?? null,
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({ inserted: 0, message: 'Already seeded or no results' });
    }

    // Insert in batches of 20
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 20) {
      const batch = toInsert.slice(i, i + 20);
      const { error } = await supabase.from('vendors').insert(batch);
      if (!error) inserted += batch.length;
    }

    return NextResponse.json({ inserted });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
