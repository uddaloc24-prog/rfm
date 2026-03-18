import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';
import AdminDashboard from './AdminDashboard';
import { User, Vendor } from '@/lib/types';

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (cookieStore.get('rfm_admin')?.value !== 'granted') redirect('/admin-login');

  const supabase = createAdminClient();

  const [
    { count: userCount },
    { count: vendorCount },
    { data: users },
    { data: vendors },
    { data: initialActivity },
    { data: authData },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('vendors').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('vendors').select('*').order('created_at', { ascending: false }).limit(200),
    supabase
      .from('user_tags')
      .select('user_id, vendor_id, tag, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Build id → email map from auth.users
  const emailMap: Record<string, string> = {};
  for (const au of (authData?.users ?? [])) {
    if (au.email) emailMap[au.id] = au.email;
  }

  return (
    <AdminDashboard
      stats={{
        userCount: userCount ?? 0,
        vendorCount: vendorCount ?? 0,
      }}
      users={(users ?? []) as User[]}
      vendors={(vendors ?? []) as Vendor[]}
      initialActivity={initialActivity ?? []}
      emailMap={emailMap}
    />
  );
}
