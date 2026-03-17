'use client';

import { useState } from 'react';
import { Post } from '@/lib/types';
import PostCard from '@/components/PostCard';
import BottomNav from '@/components/BottomNav';
import PostModal from '@/components/PostModal';

type FilterTab = 'all' | 'discovery' | 'ask';

interface CommunityClientProps {
  initialPosts: Post[];
}

export default function CommunityClient({ initialPosts }: CommunityClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showPostModal, setShowPostModal] = useState(false);

  function handleNewPost(post: Post) {
    setPosts((prev) => [post, ...prev]);
  }

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.post_type === filter);

  return (
    <div className="min-h-dvh safe-bottom" style={{ background: '#FAFAF8' }}>
      {showPostModal && (
        <PostModal onClose={() => setShowPostModal(false)} onPost={handleNewPost} />
      )}

      <div className="h-10" />

      <header className="px-5 py-3">
        <h1 className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>
          Community
        </h1>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 px-5 pb-3">
        {(['all', 'discovery', 'ask'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className="px-4 py-1.5 rounded-full font-body text-xs font-medium capitalize"
            style={
              filter === tab
                ? { background: '#E8611A', color: '#FFFFFF', border: '1px solid #E8611A' }
                : { background: '#FFFFFF', color: '#9B8E84', border: '1px solid #E8E2DC' }
            }
          >
            {tab === 'all' ? 'All' : tab === 'discovery' ? 'Discoveries' : 'Asking'}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="px-5 flex flex-col gap-3 pb-28">
        {filtered.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl p-10 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
            <p className="text-4xl mb-3">💬</p>
            <p className="font-body text-sm" style={{ color: '#9B8E84' }}>No posts yet. Be the first to share!</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-[84px] right-5">
        <button
          onClick={() => setShowPostModal(true)}
          className="fab-enter flex items-center gap-2 px-5 py-3.5 rounded-full active:scale-95 transition-transform"
          style={{ background: '#E8611A', boxShadow: '0 6px 24px rgba(232,97,26,0.35)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-body font-semibold text-sm" style={{ color: '#FFFFFF' }}>Post</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
