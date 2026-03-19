import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEED_VENDORS } from '@/lib/seed-data';
import { Vendor } from '@/lib/types';
import VendorProfileClient from './VendorProfileClient';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getVendor(slug: string): Promise<Vendor | null> {
  try {
    const { createClient } = await import('@/lib/supabase-server');
    const supabase = await createClient();
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('slug', slug)
      .single();
    return data as Vendor | null;
  } catch {
    return SEED_VENDORS.find((v) => v.slug === slug) ?? null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendor(slug);
  if (!vendor) return { title: 'Not Found' };

  const score = vendor.community_score.toFixed(1);
  const title = `${vendor.name} — ${score} on Real Food Map`;
  const description = `${vendor.known_for ?? vendor.category} in ${vendor.neighbourhood}, Bangalore. Community score: ${score}/10.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://rfm.in/v/${vendor.slug}`,
      images: [
        {
          url: `/api/og?slug=${vendor.slug}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function VendorPage({ params }: Props) {
  const { slug } = await params;
  const vendor = await getVendor(slug);
  if (!vendor) notFound();

  // Get current user + bookmark status (best-effort, non-blocking)
  let currentUserId = '';
  let isBookmarked = false;
  try {
    const { createClient, getUser } = await import('@/lib/supabase-server');
    const user = await getUser();
    if (user) {
      currentUserId = user.id;
      const supabase = await createClient();
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('vendor_id', vendor.id)
        .maybeSingle();
      isBookmarked = !!data;
    }
  } catch { /* non-fatal */ }

  return <VendorProfileClient vendor={vendor} currentUserId={currentUserId} isBookmarked={isBookmarked} />;
}
