import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import SocialFeedClient from './SocialFeedClient';

export default async function SocialFeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');
  return <SocialFeedClient currentUserId={user.id} />;
}
