'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Notif {
  id: string;
  type: string;
  is_read: boolean;
  created_at: string;
  actor?: { display_name: string; username: string; avatar_url: string | null };
  vendor?: { name: string; slug: string };
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function notifText(n: Notif): string {
  switch (n.type) {
    case 'new_follower': return `followed you`;
    case 'post_reaction': return `reacted to your post${n.vendor ? ` at ${n.vendor.name}` : ''}`;
    case 'post_comment': return `commented on your post${n.vendor ? ` at ${n.vendor.name}` : ''}`;
    case 'comment_reply': return `replied to your comment`;
    default: return 'sent you a notification';
  }
}

function notifIcon(type: string): string {
  switch (type) {
    case 'new_follower': return '👤';
    case 'post_reaction': return '🔥';
    case 'post_comment': return '💬';
    case 'comment_reply': return '↩️';
    default: return '🔔';
  }
}

export default function NotificationsClient() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/social/notifications');
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setLoading(false);
      // mark all read
      await fetch('/api/social/notifications', { method: 'PATCH' });
    };
    load();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#FDF8F2', maxWidth: 430, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', background: '#FDF8F2', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #F0EBE5', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#F0EBE5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#13132A" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: '#13132A', margin: 0 }}>Notifications</h1>
      </div>

      <div style={{ padding: '8px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E8611A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>🔔</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#13132A', margin: '0 0 6px' }}>All caught up</p>
            <p style={{ fontSize: 13, color: '#8A7E74' }}>Your notifications will appear here</p>
          </div>
        ) : (
          notifs.map(n => (
            <div
              key={n.id}
              style={{ padding: '14px 20px', borderBottom: '1px solid #F9F5F1', background: n.is_read ? '#FDF8F2' : 'rgba(232,97,26,0.04)', display: 'flex', gap: 12, alignItems: 'flex-start' }}
            >
              {/* Actor avatar or icon */}
              {n.actor ? (
                <Link href={`/profile/${n.actor.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E8611A', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {n.actor.avatar_url
                      ? <img src={n.actor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{n.actor.display_name?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                </Link>
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0EBE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {notifIcon(n.type)}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 3px', fontSize: 14, color: '#13132A', lineHeight: 1.4 }}>
                  {n.actor && (
                    <Link href={`/profile/${n.actor.username}`} style={{ fontWeight: 700, color: '#13132A', textDecoration: 'none' }}>
                      {n.actor.display_name}
                    </Link>
                  )}
                  {' '}{notifText(n)}
                  {n.vendor && (
                    <> — <Link href={`/v/${n.vendor.slug}`} style={{ color: '#E8611A', fontWeight: 600, textDecoration: 'none' }}>{n.vendor.name}</Link></>
                  )}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#B0A89E' }}>{timeAgo(n.created_at)}</p>
              </div>

              {!n.is_read && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8611A', flexShrink: 0, marginTop: 6 }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
