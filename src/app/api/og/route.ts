import { NextRequest, NextResponse } from 'next/server';
import { SEED_VENDORS } from '@/lib/seed-data';

// Minimal OG image response — returns an SVG for now
// Replace with @vercel/og for production-quality images
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get('slug') ?? '';

  let name = 'Real Food Map';
  let score = '';
  let neighbourhood = 'Bangalore';
  let category = 'Food';

  const seedVendor = SEED_VENDORS.find((v) => v.slug === slug);
  if (seedVendor) {
    name = seedVendor.name;
    score = seedVendor.community_score.toFixed(1);
    neighbourhood = seedVendor.neighbourhood ?? 'Bangalore';
  } else {
    try {
      const { createClient } = await import('@/lib/supabase-server');
      const supabase = await createClient();
      const { data } = await supabase
        .from('vendors')
        .select('name, community_score, neighbourhood, category')
        .eq('slug', slug)
        .single();
      if (data) {
        name = data.name;
        score = data.community_score.toFixed(1);
        neighbourhood = data.neighbourhood ?? 'Bangalore';
        category = data.category;
      }
    } catch {
      // fallback to defaults
    }
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E8611A"/>
      <stop offset="100%" stop-color="#F4A425"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="630" fill="rgba(0,0,0,0.3)"/>
  <!-- rfm. wordmark -->
  <text x="80" y="100" font-family="Georgia, serif" font-size="52" font-weight="900" fill="rgba(253,248,242,0.9)">rfm.</text>
  <!-- Vendor name -->
  <text x="80" y="280" font-family="Georgia, serif" font-size="72" font-weight="900" fill="#FDF8F2" width="1040">${escapeXml(name)}</text>
  <!-- Neighbourhood -->
  <text x="80" y="360" font-family="Arial, sans-serif" font-size="36" fill="rgba(253,248,242,0.8)">📍 ${escapeXml(neighbourhood)}</text>
  <!-- Score -->
  ${score ? `
  <rect x="80" y="420" width="200" height="100" rx="16" fill="rgba(0,0,0,0.4)"/>
  <text x="180" y="490" font-family="Georgia, serif" font-size="64" font-weight="900" fill="#F4A425" text-anchor="middle">${score}</text>
  <text x="290" y="505" font-family="Arial, sans-serif" font-size="28" fill="rgba(253,248,242,0.7)">/10</text>
  ` : ''}
  <!-- Category -->
  <text x="80" y="580" font-family="Arial, sans-serif" font-size="28" fill="rgba(253,248,242,0.6)">${escapeXml(category.replace('_', ' '))}</text>
  <text x="1120" y="580" font-family="Arial, sans-serif" font-size="28" fill="rgba(253,248,242,0.6)" text-anchor="end">rfm.in</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
