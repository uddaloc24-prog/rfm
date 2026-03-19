'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface Notif {
  id: string;
  type: string;
  actor?: { display_name: string; username: string };
  vendor?: { name: string; slug: string };
  created_at: string;
  is_read: boolean;
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
    case 'new_follower': return `${n.actor?.display_name ?? 'Someone'} followed you`;
    case 'post_reaction': return `${n.actor?.display_name ?? 'Someone'} reacted to your post at ${n.vendor?.name ?? 'a place'}`;
    case 'post_comment': return `${n.actor?.display_name ?? 'Someone'} commented on your post`;
    case 'comment_reply': return `${n.actor?.display_name ?? 'Someone'} replied to your comment`;
    default: return 'New notification';
  }
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/social/notifications').then(r => r.json()).then(d => {
      setCount(d.unread_count ?? 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = async () => {
    setOpen(p => !p);
    if (!loaded) {
      const res = await fetch('/api/social/notifications');
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setLoaded(true);
      setCount(0);
      // Mark all read
      await fetch('/api/social/notifications', { method: 'PATCH' });
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}
      >
        🔔
        {count > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 48, width: 300, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #F0EBE5', overflow: 'hidden', zIndex: 50 }}>
          <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #F0EBE5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#13132A' }}>Notifications</span>
            <Link href="/notifications" onClick={() => setOpen(false)} style={{ fontSize: 12, color: '#E8611A', textDecoration: 'none' }}>See all</Link>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {!loaded && <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: '#8A7E74' }}>Loading…</div>}
            {loaded && notifs.length === 0 && <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: '#8A7E74' }}>No notifications yet</div>}
            {notifs.slice(0, 8).map(n => (
              <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid #F9F5F1', background: n.is_read ? '#fff' : 'rgba(232,97,26,0.04)' }}>
                <p style={{ margin: '0 0 2px', fontSize: 13, color: '#13132A', lineHeight: 1.4 }}>{notifText(n)}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#B0A89E' }}>{timeAgo(n.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
