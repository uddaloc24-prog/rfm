'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedEvent } from '@/lib/social-types';
import Link from 'next/link';

const TAG_EMOJI: Record<string, string> = { good: '😋', bad: '😕', very_bad: '🤢' };
const EVENT_LABEL: Record<string, string> = { rated: 'rated', compared: 'compared picks at', posted: 'posted about' };

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SocialFeedClient({ currentUserId }: { currentUserId: string }) {
  const [tab, setTab] = useState<'following' | 'community'>('following');
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const loadingMore = useRef(false);

  const loadFeed = useCallback(async (mode: string, append = false, appendCursor?: string) => {
    if (loadingMore.current && append) return;
    loadingMore.current = true;
    if (!append) setLoading(true);

    const params = new URLSearchParams({ mode });
    if (append && appendCursor) params.set('cursor', appendCursor);

    const res = await fetch(`/api/social/feed?${params}`);
    const data = await res.json();
    setEvents(prev => append ? [...prev, ...(data.events ?? [])] : (data.events ?? []));
    setCursor(data.nextCursor ?? null);
    setHasMore(!!data.nextCursor);
    setLoading(false);
    loadingMore.current = false;
  }, []);

  useEffect(() => {
    setEvents([]);
    setCursor(null);
    setHasMore(false);
    loadFeed(tab);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: '100vh', background: '#FDF8F2', maxWidth: 430, margin: '0 auto', paddingBottom: 80 }}>
      <div style={{ padding: '16px 20px 12px', background: '#FDF8F2', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: '#13132A', margin: '0 0 14px' }}>rfm. feed</h1>
        <div style={{ display: 'flex', gap: 0, background: '#F0EBE5', borderRadius: 10, padding: 3 }}>
          {(['following', 'community'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0', borderRadius: 8,
              background: tab === t ? '#fff' : 'transparent', border: 'none',
              fontWeight: tab === t ? 700 : 500, fontSize: 13,
              color: tab === t ? '#13132A' : '#8A7E74', cursor: 'pointer',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
              {t === 'following' ? 'Following' : 'Community'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px' }}>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E8611A', borderTopColor: 'transparent', borderRadius: '50%' }} />
          </div>
          : events.length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontSize: 40, margin: '0 0 12px' }}>🍽️</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#13132A', margin: '0 0 6px' }}>
                {tab === 'following' ? 'Nothing from people you follow' : 'No community activity yet'}
              </p>
              <p style={{ fontSize: 13, color: '#8A7E74' }}>
                {tab === 'following' ? 'Follow people to see their food activity here' : 'Be the first to rate a place!'}
              </p>
            </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              {events.map(event => <FeedCard key={event.id} event={event} currentUserId={currentUserId} />)}
              {hasMore && (
                <button onClick={() => loadFeed(tab, true, cursor ?? undefined)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #E8E2DC', background: '#fff', fontSize: 13, color: '#8A7E74', cursor: 'pointer', marginBottom: 8 }}>
                  Load more
                </button>
              )}
            </div>
        }
      </div>
    </div>
  );
}

function FeedCard({ event, currentUserId }: { event: FeedEvent; currentUserId: string }) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());

  const handleReact = async (type: string) => {
    if (!event.post_id || event.user_id === currentUserId) return;
    const wasActive = myReactions.has(type);
    setMyReactions(prev => {
      const next = new Set(prev);
      wasActive ? next.delete(type) : next.add(type);
      return next;
    });
    setReactions(prev => ({ ...prev, [type]: Math.max(0, (prev[type] ?? 0) + (wasActive ? -1 : 1)) }));
    await fetch('/api/social/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: 'vendor_post', target_id: event.post_id, reaction_type: type }),
    });
  };

  const isOwnPost = event.user_id === currentUserId;
  const reactionDefs = [{ type: 'fire', emoji: '🔥' }, { type: 'same', emoji: '✅' }, { type: 'want_to_go', emoji: '👀' }];

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #F0EBE5', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <Link href={`/profile/${event.user?.username}`} style={{ textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E8611A', overflow: 'hidden', flexShrink: 0 }}>
            {event.user?.avatar_url
              ? <img src={event.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700 }}>{event.user?.display_name?.[0]?.toUpperCase()}</div>
            }
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            <Link href={`/profile/${event.user?.username}`} style={{ fontWeight: 700, color: '#13132A', textDecoration: 'none' }}>{event.user?.display_name}</Link>
            {' '}<span style={{ color: '#8A7E74' }}>{EVENT_LABEL[event.event_type] ?? event.event_type}</span>{' '}
            {event.vendor && <Link href={`/v/${event.vendor.slug}`} style={{ fontWeight: 600, color: '#E8611A', textDecoration: 'none' }}>{event.vendor.name}</Link>}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#8A7E74' }}>{timeAgo(event.created_at)}</p>
        </div>
        {event.vendor_post?.rating_tag && <span style={{ fontSize: 22 }}>{TAG_EMOJI[event.vendor_post.rating_tag]}</span>}
      </div>

      {event.vendor_post?.body && <p style={{ fontSize: 14, color: '#13132A', margin: '0 0 10px', lineHeight: 1.55 }}>{event.vendor_post.body}</p>}
      {event.vendor_post?.photo_url && <img src={event.vendor_post.photo_url} alt="" style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 260, display: 'block', marginBottom: 10 }} />}
      {event.vendor?.neighbourhood && <p style={{ fontSize: 11, color: '#8A7E74', margin: '0 0 8px' }}>📍 {event.vendor.neighbourhood}</p>}

      {event.post_id && !isOwnPost && (
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {reactionDefs.map(r => {
            const count = (reactions[r.type] ?? 0) + (event.reaction_score && r.type === 'fire' ? 0 : 0);
            const active = myReactions.has(r.type);
            return (
              <button key={r.type} onClick={() => handleReact(r.type)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, border: `1.5px solid ${active ? '#E8611A' : '#E8E2DC'}`, background: active ? 'rgba(232,97,26,0.08)' : '#fff', cursor: 'pointer', fontSize: 12, color: active ? '#E8611A' : '#8A7E74', fontWeight: active ? 700 : 400, minHeight: 30 }}>
                <span>{r.emoji}</span>{count > 0 && <span>{count}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
