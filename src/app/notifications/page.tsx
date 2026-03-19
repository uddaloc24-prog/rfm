import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase-server';
import NotificationsClient from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getUser();
  if (!user) redirect('/auth');
  return <NotificationsClient />;
}
