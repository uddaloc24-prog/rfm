'use client';

import { useState, useEffect } from 'react';
import { NewsItem } from '@/app/api/news/route';
import BottomNav from '@/components/BottomNav';

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

export default function FeedClient() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((data) => setNews(data.news ?? []))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []);

  return (
    <div className="min-h-dvh safe-bottom" style={{ background: '#FAFAF8' }}>
      <div className="h-10" />

      <header className="px-5 py-3">
        <h1 className="font-display font-bold text-xl" style={{ color: '#1A1205' }}>
          Food News
        </h1>
      </header>

      <div className="px-5 flex flex-col gap-3 pb-28">
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
        {news.map((item, i) => (
          <NewsCard key={i} item={item} />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
