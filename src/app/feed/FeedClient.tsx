'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { NewsItem } from '@/app/api/news/route';
import BottomNav from '@/components/BottomNav';
import { Post, CATEGORY_EMOJI, CATEGORY_LABELS, VendorCategory } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const AVATAR_COLORS = ['#E8611A', '#F4A425', '#25D366', '#6366F1', '#EC4899', '#14B8A6'];
function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

const POST_VERB: Record<string, string> = {
  discovery: 'shared a discovery',
  ask: 'is asking for recs',
  milestone: 'hit a milestone',
};

// ---------------------------------------------------------------------------
// Guide cards (horizontal scroll)
// ---------------------------------------------------------------------------

const GUIDE_CARDS: { category: VendorCategory; desc: string }[] = [
  { category: 'street_food', desc: 'Street eats in Bangalore' },
  { category: 'mess_tiffin', desc: 'Best mess & tiffin spots' },
  { category: 'chai_snacks', desc: 'Chai & snack corners' },
  { category: 'restaurant', desc: 'Sit-down restaurants' },
];

function GuideCards() {
  return (
    <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
      {GUIDE_CARDS.map(({ category, desc }) => (
        <Link
          key={category}
          href={`/search?category=${category}`}
          className="shrink-0 rounded-2xl px-4 py-3 flex flex-col gap-1 active:opacity-70 transition-opacity"
          style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', minWidth: '140px' }}
        >
          <span className="text-2xl">{CATEGORY_EMOJI[category]}</span>
          <p className="font-body text-xs font-semibold leading-tight" style={{ color: '#1A1205' }}>
            {CATEGORY_LABELS[category]}
          </p>
          <p className="font-body text-[10px] leading-snug" style={{ color: '#9B8E84' }}>{desc}</p>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post card
// ---------------------------------------------------------------------------

function PostCard({ post }: { post: Post }) {
  const username = post.user?.username ?? 'someone';
  const displayName = post.user?.display_name ?? username;
  const verb = POST_VERB[post.post_type] ?? 'posted';

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
          style={{ background: avatarColor(username) }}
        >
          {getInitials(displayName)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-body text-sm font-semibold" style={{ color: '#1A1205' }}>
              {displayName}
            </span>
            <span className="font-body text-xs" style={{ color: '#9B8E84' }}>{verb}</span>
            {post.vendor && (
              <Link href={`/v/${post.vendor.slug}`} className="font-body text-xs font-semibold active:opacity-70" style={{ color: '#E8611A' }}>
                {post.vendor.name}
              </Link>
            )}
          </div>

          {/* Body */}
          {post.body && (
            <p
              className="font-body text-sm mt-1 leading-relaxed line-clamp-2"
              style={{ color: '#4A3F38' }}
            >
              {post.body}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 mt-2">
            <span className="font-body text-[10px]" style={{ color: '#C4B9B0' }}>
              {timeAgo(post.created_at)}
            </span>
            {post.like_count > 0 && (
              <span className="font-body text-[10px]" style={{ color: '#C4B9B0' }}>
                ♥ {post.like_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// News card (unchanged from original)
// ---------------------------------------------------------------------------

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl p-4 active:scale-[0.98] transition-transform"
      style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', textDecoration: 'none' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-body font-semibold text-sm leading-snug mb-1.5" style={{ color: '#1A1205' }}>
            {item.title}
          </p>
          {item.snippet && (
            <p className="font-body text-xs leading-relaxed mb-2" style={{ color: '#9B8E84' }}>
              {item.snippet}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span
              className="font-body text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(232,97,26,0.08)', color: '#E8611A' }}
            >
              {item.source}
            </span>
            {item.pubDate && (
              <span className="font-body text-[10px]" style={{ color: '#C4B9B0' }}>
                {timeAgo(item.pubDate)}
              </span>
            )}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
          <path d="M7 17L17 7M17 7H7M17 7v10" stroke="#C4B9B0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: '#E8E2DC' }} />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-3 rounded-full" style={{ background: '#E8E2DC', width: '60%' }} />
          <div className="h-3 rounded-full" style={{ background: '#E8E2DC', width: '90%' }} />
          <div className="h-3 rounded-full" style={{ background: '#E8E2DC', width: '40%' }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FeedClient() {
  const [activeTab, setActiveTab] = useState<'feed' | 'news'>('feed');

  // Feed (posts) state
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // News state
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsFetched, setNewsFetched] = useState(false);

  // Load posts on mount
  useEffect(() => {
    fetch('/api/feed')
      .then((r) => r.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]))
      .finally(() => setFeedLoading(false));
  }, []);

  // Lazy-load news only when News tab is first selected
  useEffect(() => {
    if (activeTab !== 'news' || newsFetched) return;
    setNewsLoading(true);
    setNewsFetched(true);
    fetch('/api/news')
      .then((r) => r.json())
      .then((data) => setNews(data.news ?? []))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, [activeTab, newsFetched]);

  return (
    <div className="min-h-dvh safe-bottom" style={{ background: '#FAFAF8' }}>
      <div className="h-10" />

      {/* Header */}
      <header className="px-5 pt-3 pb-2">
        <h1 className="font-display font-bold text-xl mb-3" style={{ color: '#1A1205' }}>Feed</h1>

        {/* Sub-tabs */}
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: '#F0EBE5' }}
        >
          {(['feed', 'news'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-xl font-body text-sm font-semibold transition-all active:opacity-70"
              style={{
                background: activeTab === tab ? '#FFFFFF' : 'transparent',
                color: activeTab === tab ? '#1A1205' : '#9B8E84',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {tab === 'feed' ? 'Activity' : 'News'}
            </button>
          ))}
        </div>
      </header>

      {/* ── FEED TAB ── */}
      {activeTab === 'feed' && (
        <div className="pb-28">
          {/* Ask friends prompt */}
          <div className="px-5 py-2">
            <Link
              href="/community"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl active:opacity-70 transition-opacity"
              style={{ background: 'rgba(232,97,26,0.06)', border: '1px dashed rgba(232,97,26,0.3)' }}
            >
              <span className="text-lg">💬</span>
              <span className="font-body text-sm" style={{ color: '#E8611A' }}>
                Ask your friends for recs…
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-auto shrink-0">
                <path d="M9 18l6-6-6-6" stroke="#E8611A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* Guide cards */}
          <div className="pt-1 pb-3">
            <p className="px-5 font-body text-xs font-semibold mb-2 tracking-wide" style={{ color: '#9B8E84' }}>
              EXPLORE CATEGORIES
            </p>
            <GuideCards />
          </div>

          {/* Activity feed */}
          <div className="px-5">
            <p className="font-body text-xs font-semibold mb-3 tracking-wide" style={{ color: '#9B8E84' }}>
              RECENT ACTIVITY
            </p>

            {feedLoading && (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {!feedLoading && posts.length === 0 && (
              <div className="rounded-2xl p-10 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
                <p className="text-4xl mb-3">🍽️</p>
                <p className="font-body text-sm font-semibold mb-1" style={{ color: '#1A1205' }}>No posts yet</p>
                <p className="font-body text-xs" style={{ color: '#9B8E84' }}>Be the first to share a discovery!</p>
                <Link
                  href="/community"
                  className="inline-block mt-4 px-6 py-2.5 rounded-xl font-body text-sm font-semibold active:opacity-70"
                  style={{ background: '#E8611A', color: '#FFFFFF' }}
                >
                  Post something →
                </Link>
              </div>
            )}

            {posts.length > 0 && (
              <div className="flex flex-col gap-3">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NEWS TAB ── */}
      {activeTab === 'news' && (
        <div className="px-5 flex flex-col gap-3 pb-28 pt-2">
          {newsLoading && (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', height: '96px' }} />
              ))}
            </div>
          )}
          {!newsLoading && news.length === 0 && (
            <div className="rounded-2xl p-10 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
              <p className="text-4xl mb-3">📰</p>
              <p className="font-body text-sm" style={{ color: '#9B8E84' }}>Could not load news right now.</p>
            </div>
          )}
          {news.map((item) => (
            <NewsCard key={item.link} item={item} />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
