import { Post } from '@/lib/types';
import CommunityClient from './CommunityClient';

async function getPosts(): Promise<Post[]> {
  try {
    const { createClient } = await import('@/lib/supabase-server');
    const supabase = await createClient();
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        user:users(*),
        vendor:vendors(id, name, slug, neighbourhood, category)
      `)
      .order('created_at', { ascending: false })
      .limit(20);
    return (data as Post[]) ?? [];
  } catch {
    return [];
  }
}

export default async function CommunityPage() {
  const posts = await getPosts();
  return <CommunityClient initialPosts={posts} />;
}
