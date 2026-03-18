import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { VendorCategory } from '@/lib/types';

const PLACES_API = 'https://places.googleapis.com/v1/places:searchText';

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

const NEIGHBOURHOODS = [
  'Indiranagar', 'Koramangala', 'Jayanagar', 'Malleswaram', 'Whitefield',
  'BTM Layout', 'HSR Layout', 'Marathahalli', 'Rajajinagar', 'Basavanagudi',
  'JP Nagar', 'Banashankari', 'Yelahanka', 'Hebbal', 'Richmond Town',
  'Shivajinagar', 'MG Road', 'Frazer Town', 'Ulsoor', 'Sadashivanagar',
  'Vijayanagar', 'Nagarbhavi', 'Electronic City', 'Bannerghatta Road',
  'Old Airport Road', 'Benson Town', 'Cox Town', 'RT Nagar', 'Mathikere',
  'Peenya', 'Seshadripuram', 'Chamrajpet', 'Jayanagar 4th Block', 'Domlur',
];

const QUERY_TYPES = [
  'best restaurants',
  'street food darshini',
  'cafe coffee shop',
  'mess tiffin home food',
];

// 34 neighbourhoods × 4 query types = 136 total queries
export const ALL_BULK_QUERIES = NEIGHBOURHOODS.flatMap((n) =>
  QUERY_TYPES.map((qt) => `${qt} in ${n} Bangalore India`)
);

const BATCH_SIZE = 3; // queries per call (keeps well under Vercel 10s timeout)

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function extractNeighbourhood(address: string): string | null {
  const parts = address.split(',').map((p) => p.trim());
  const cityIdx = parts.findIndex((p) => /bangalore|bengaluru/i.test(p));
  if (cityIdx > 1) return parts.slice(1, cityIdx).join(', ').slice(0, 80);
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

async function fetchPlaces(query: string, apiKey: string): Promise<PlaceResult[]> {
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
          radius: 25000,
        },
      },
      maxResultCount: 20,
      languageCode: 'en',
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.places ?? [];
}

export async function GET() {
  return NextResponse.json({
    totalQueries: ALL_BULK_QUERIES.length,
    totalBatches: Math.ceil(ALL_BULK_QUERIES.length / BATCH_SIZE),
    batchSize: BATCH_SIZE,
  });
}

export async function POST(req: NextRequest) {
  if (req.cookies.get('rfm_admin')?.value !== 'granted') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 });
  }

  const { batchIndex = 0 } = await req.json().catch(() => ({}));
  const totalBatches = Math.ceil(ALL_BULK_QUERIES.length / BATCH_SIZE);

  if (batchIndex >= totalBatches) {
    return NextResponse.json({ done: true, inserted: 0, skipped: 0, batchIndex, totalBatches });
  }

  const batchQueries = ALL_BULK_QUERIES.slice(
    batchIndex * BATCH_SIZE,
    batchIndex * BATCH_SIZE + BATCH_SIZE
  );

  const supabase = createAdminClient();

  // Load existing Google Place IDs to deduplicate efficiently
  const { data: existingSlugRows } = await supabase
    .from('vendors')
    .select('slug')
    .eq('city', 'Bangalore');

  // Also load existing names for duplicate checking
  const { data: existingNameRows } = await supabase
    .from('vendors')
    .select('name')
    .eq('city', 'Bangalore');

  const existingNames = new Set(
    (existingNameRows ?? []).map((v: { name: string }) => v.name.toLowerCase())
  );
  const existingSlugs = new Set(
    (existingSlugRows ?? []).map((v: { slug: string }) => v.slug)
  );

  const toInsert: Array<Record<string, unknown>> = [];
  const seenThisBatch = new Set<string>();
  let skipped = 0;

  for (const query of batchQueries) {
    const places = await fetchPlaces(query, apiKey);

    for (const place of places) {
      const name = place.displayName?.text;
      if (!name) continue;

      const nameLower = name.toLowerCase();
      if (existingNames.has(nameLower) || seenThisBatch.has(nameLower)) {
        skipped++;
        continue;
      }

      const address = place.formattedAddress ?? '';
      const neighbourhood = extractNeighbourhood(address);
      const types = place.types ?? [];
      const category = place.primaryType
        ? (TYPE_CATEGORY[place.primaryType] ?? guessCategory(types))
        : guessCategory(types);
      const hours =
        place.regularOpeningHours?.weekdayDescriptions?.slice(0, 2).join(' | ') ?? null;
      const price_range = place.priceLevel ? (PRICE_MAP[place.priceLevel] ?? null) : null;
      const known_for = place.editorialSummary?.text?.slice(0, 200) ?? null;

      // Ensure unique slug
      const baseSlug = slugify(name);
      const suffix = place.id.slice(-6);
      const slug = `${baseSlug}-${suffix}`;

      if (existingSlugs.has(slug)) {
        skipped++;
        continue;
      }

      toInsert.push({
        name,
        slug,
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

      seenThisBatch.add(nameLower);
      existingNames.add(nameLower);
      existingSlugs.add(slug);
    }
  }

  let inserted = 0;
  if (toInsert.length > 0) {
    const { error } = await supabase.from('vendors').insert(toInsert);
    if (error) {
      console.error('[bulk-import] Insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    inserted = toInsert.length;
  }

  const done = batchIndex + 1 >= totalBatches;
  return NextResponse.json({
    done,
    inserted,
    skipped,
    batchIndex,
    totalBatches,
    nextBatch: done ? null : batchIndex + 1,
    queriesProcessed: batchQueries,
  });
}
