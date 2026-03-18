'use client';

import { User, Vendor, CATEGORY_EMOJI, TAG_EMOJI, TAG_LABELS } from '@/lib/types';
import { timeAgo, type ActivityEntry, type ActivityTagFilter } from './admin-types';

const TAG_FILTER_OPTIONS: { value: ActivityTagFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'good', label: `${TAG_EMOJI.good} ${TAG_LABELS.good}` },
  { value: 'bad', label: `${TAG_EMOJI.bad} ${TAG_LABELS.bad}` },
  { value: 'very_bad', label: `${TAG_EMOJI.very_bad} ${TAG_LABELS.very_bad}` },
];

const TAG_COLORS: Record<ActivityEntry['tag'], string> = {
  good: '#25D366',
  bad: '#F4A425',
  very_bad: '#EF4444',
};

interface Props {
  activities: ActivityEntry[];
  userMap: Map<string, User>;
  vendorMap: Map<string, Vendor>;
  tagFilter: ActivityTagFilter;
  onTagFilter: (f: ActivityTagFilter) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
}

export default function AdminActivityFeed({
  activities,
  userMap,
  vendorMap,
  tagFilter,
  onTagFilter,
  hasMore,
  onLoadMore,
  loading,
}: Props) {
  const filtered = tagFilter === 'all' ? activities : activities.filter((a) => a.tag === tagFilter);

  return (
    <div>
      {/* Tag filter pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {TAG_FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onTagFilter(value)}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: `1px solid ${tagFilter === value ? '#E8611A' : '#E8E2DC'}`,
              background: tagFilter === value ? '#E8611A' : 'transparent',
              color: tagFilter === value ? '#FFFFFF' : '#9B8E84',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Activity cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map((a, i) => {
          const u = userMap.get(a.user_id);
          const v = vendorMap.get(a.vendor_id);
          return (
            <div
              key={`${a.user_id}-${a.vendor_id}-${i}`}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E8E2DC',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
              }}
            >
              <span style={{ color: '#9B8E84', minWidth: '60px', fontSize: '11px' }}>
                {timeAgo(a.created_at)}
              </span>
              <span style={{ fontWeight: 600, color: '#1A1205' }}>{u?.display_name ?? 'Unknown'}</span>
              <span style={{ color: '#9B8E84' }}>rated</span>
              <span style={{ fontWeight: 600, color: '#1A1205' }}>
                {v ? `${CATEGORY_EMOJI[v.category]} ${v.name}` : 'Unknown vendor'}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  background: TAG_COLORS[a.tag] + '22',
                  color: TAG_COLORS[a.tag],
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                {TAG_EMOJI[a.tag]}
              </span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9B8E84', padding: '40px', fontSize: '14px' }}>
            No activity yet
          </p>
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={onLoadMore}
            disabled={loading}
            style={{
              padding: '8px 24px',
              borderRadius: '10px',
              border: '1px solid #E8E2DC',
              background: loading ? '#E8E2DC' : '#FFFFFF',
              color: '#1A1205',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Loading…' : 'Load 50 more'}
          </button>
        </div>
      )}
    </div>
  );
}
