import { Vendor } from '@/lib/types';
import HomeClient from './HomeClient';

export const revalidate = 60;

async function getVendors(): Promise<Vendor[]> {
  try {
    const { createClient } = await import('@/lib/supabase-server');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('city', 'Bangalore')
      .in('status', ['verified', 'pending'])
      .order('community_score', { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data as Vendor[];
  } catch {
    return [];
  }
}

export default async function Home() {
  const vendors = await getVendors();
  return <HomeClient initialVendors={vendors} />;
}
