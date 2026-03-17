import { NewsItem } from '@/app/api/news/route';

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return '';
  }
}

export default function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-2xl p-4 block active:opacity-70"
      style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
    >
      <div className="flex items-center gap-2 mb-2">
        {item.source && (
          <span className="font-body text-xs font-semibold" style={{ color: '#E8611A' }}>
            {item.source}
          </span>
        )}
        {item.pubDate && (
          <span className="font-body text-xs" style={{ color: '#C4B9B0' }}>
            · {timeAgo(item.pubDate)}
          </span>
        )}
      </div>
      <h3
        className="font-body font-semibold text-sm leading-snug mb-1.5"
        style={{ color: '#1A1205' }}
      >
        {item.title}
      </h3>
      {item.snippet && (
        <p className="font-body text-xs leading-relaxed" style={{ color: '#9B8E84' }}>
          {item.snippet}
        </p>
      )}
      <div className="flex items-center gap-1 mt-2.5">
        <span className="font-body text-xs" style={{ color: '#C4B9B0' }}>
          Read more
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 17L17 7M17 7H7M17 7v10"
            stroke="#C4B9B0"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </a>
  );
}
