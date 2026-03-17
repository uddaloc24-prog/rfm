import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminDashboard from './AdminDashboard';
import { User, Vendor } from '@/lib/types';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email !== adminEmail) redirect('/');

  const [
    { count: userCount },
    { count: vendorCount },
    { count: ratingCount },
    { count: comparisonCount },
    { data: users },
    { data: vendors },
    { data: recentRatings },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('vendors').select('id', { count: 'exact', head: true }),
    supabase.from('ratings').select('id', { count: 'exact', head: true }),
    supabase.from('comparisons').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('vendors').select('*').order('created_at', { ascending: false }).limit(200),
    supabase
      .from('ratings')
      .select('personal_score, created_at, user_id, vendor_id')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <AdminDashboard
      stats={{
        userCount: userCount ?? 0,
        vendorCount: vendorCount ?? 0,
        ratingCount: ratingCount ?? 0,
        comparisonCount: comparisonCount ?? 0,
      }}
      users={(users ?? []) as User[]}
      vendors={(vendors ?? []) as Vendor[]}
      recentRatings={recentRatings ?? []}
    />
  );
}
