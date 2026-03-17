import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { VendorCategory } from '@/lib/types';

const PLACES_API = 'https://places.googleapis.com/v1/places:searchText';

// Map Google Places primary types to our categories
const TYPE_CATEGORY: Record<string, VendorCategory> = {
  street_food_restaurant: 'street_food',
  fast_food_restaurant: 'street_food',
  meal_delivery: 'mess_tiffin',
  meal_takeaway: 'mess_tiffin',
  cafe: 'chai_snacks',
  coffee_shop: 'chai_snacks',
  tea_house: 'chai_snacks',
  juice_shop: 'chai_snacks',
  restaurant: 'restaurant',
  indian_restaurant: 'restaurant',
  south_indian_restaurant: 'restaurant',
  vegetarian_restaurant: 'restaurant',
};

const PRICE_MAP: Record<string, string> = {
  PRICE_LEVEL_FREE: '₹Free',
  PRICE_LEVEL_INEXPENSIVE: '₹50–₹200',
  PRICE_LEVEL_MODERATE: '₹200–₹500',
  PRICE_LEVEL_EXPENSIVE: '₹500–₹1200',
  PRICE_LEVEL_VERY_EXPENSIVE: '₹1200+',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function extractNeighbourhood(address: string): string | null {
  // "Shanthi Sagar, 1st Cross, Malleswaram, Bengaluru, Karnataka 560003, India"
  // Take the part(s) between the first comma and "Bengaluru" / "Bangalore"
  const parts = address.split(',').map((p) => p.trim());
  const cityIdx = parts.findIndex((p) => /bangalore|bengaluru/i.test(p));
  if (cityIdx > 1) {
    return parts.slice(1, cityIdx).join(', ').slice(0, 80);
  }
  return parts[1] ?? null;
}

function guessCategory(types: string[]): VendorCategory {
  for (const t of types) {
    if (TYPE_CATEGORY[t]) return TYPE_CATEGORY[t];
  }
  return 'restaurant';
}

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryType?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  priceLevel?: string;
  editorialSummary?: { text: string };
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

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 });
  }

  const { query = 'restaurants in Bangalore India', maxResults = 20 } = await req.json().catch(() => ({}));

  try {
    const res = await fetch(PLACES_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.types',
          'places.primaryType',
          'places.regularOpeningHours',
          'places.priceLevel',
          'places.editorialSummary',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: 12.9716, longitude: 77.5946 },
            radius: 20000,
          },
        },
        maxResultCount: Math.min(maxResults, 20),
        languageCode: 'en',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Places API error: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const places: PlaceResult[] = data.places ?? [];

    if (places.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: 0, message: 'No results from Places API' });
    }

    const supabase = createAdminClient();

    // Fetch existing vendor names to avoid duplicates
    const { data: existing } = await supabase
      .from('vendors')
      .select('name')
      .eq('city', 'Bangalore');
    const existingNames = new Set((existing ?? []).map((v: { name: string }) => v.name.toLowerCase()));

    const toInsert: Array<Record<string, unknown>> = [];
    let skipped = 0;

    for (const place of places) {
      const name = place.displayName?.text;
      if (!name) continue;
      if (existingNames.has(name.toLowerCase())) { skipped++; continue; }

      const address = place.formattedAddress ?? '';
      const neighbourhood = extractNeighbourhood(address);
      const types = place.types ?? [];
      const category = place.primaryType ? (TYPE_CATEGORY[place.primaryType] ?? guessCategory(types)) : guessCategory(types);
      const hours = place.regularOpeningHours?.weekdayDescriptions?.slice(0, 2).join(' | ') ?? null;
      const price_range = place.priceLevel ? (PRICE_MAP[place.priceLevel] ?? null) : null;
      const known_for = place.editorialSummary?.text?.slice(0, 200) ?? null;
      const uniqueSuffix = place.id.slice(-6);

      toInsert.push({
        name,
        slug: `${slugify(name)}-${uniqueSuffix}`,
        category,
        neighbourhood,
        city: 'Bangalore',
        lat: place.location?.latitude ?? null,
        lng: place.location?.longitude ?? null,
        hours,
        price_range,
        known_for,
        status: 'pending',
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({ inserted: 0, skipped, message: 'All results already exist' });
    }

    const { error } = await supabase.from('vendors').insert(toInsert);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ inserted: toInsert.length, skipped });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
