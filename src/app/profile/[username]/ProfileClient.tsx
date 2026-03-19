'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { SocialProfile, VendorPost, Bookmark } from '@/lib/social-types';
import Link from 'next/link';

const TAG_EMOJI: Record<string, string> = { good: '😋', bad: '😕', very_bad: '🤢' };
const TAG_COLOR: Record<string, string> = { good: '#25D366', bad: '#F4A425', very_bad: '#EF4444' };

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ProfileClient({
  username,
  currentUserId,
}: {
  username: string;
  currentUserId: string;
}) {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'rated' | 'posts' | 'want'>('posts');
  const [posts, setPosts] = useState<VendorPost[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwner = profile?.id === currentUserId;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/social/profile/${username}`);
    const data = await res.json();
    if (data.blocked) { setBlocked(true); setLoading(false); return; }
    setProfile(data);
    setLoading(false);
  }, [username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const loadPosts = useCallback(async () => {
    if (!profile) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('vendor_posts')
      .select('*, vendor:vendors!vendor_posts_vendor_id_fkey(id, name, slug, neighbourhood)')
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);
    setPosts((data as VendorPost[]) ?? []);
  }, [profile]);

  const loadBookmarks = useCallback(async () => {
    if (!profile || !isOwner) return;
    const res = await fetch('/api/social/bookmarks');
    const data = await res.json();
    setBookmarks(data.bookmarks ?? []);
  }, [profile, isOwner]);

  useEffect(() => {
    if (tab === 'posts') loadPosts();
    if (tab === 'want') loadBookmarks();
  }, [tab, loadPosts, loadBookmarks]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    await fetch('/api/social/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ following_id: profile.id }),
    });
    await loadProfile();
    setFollowLoading(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FDF8F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E8611A', borderTopColor: 'transparent', borderRadius: '50%' }} />
    </div>
  );

  if (blocked) return (
    <div style={{ minHeight: '100vh', background: '#FDF8F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
      <p style={{ fontSize: 48 }}>🚫</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#13132A' }}>This profile is not available</p>
    </div>
  );

  if (!profile) return null;

  type ProfileTab = 'posts' | 'rated' | 'want';
  const tabs: ProfileTab[] = ['posts', 'rated', ...(isOwner ? ['want' as ProfileTab] : [])];

  return (
    <div style={{ minHeight: '100vh', background: '#FDF8F2', maxWidth: 430, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, background: '#FDF8F2', zIndex: 10 }}>
        <Link href="/" style={{ color: '#8A7E74', fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>←</Link>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#13132A' }}>{profile.display_name}</span>
      </div>

      {/* Avatar + Stats */}
      <div style={{ padding: '0 20px 20px', display: 'flex', gap: 20, alignItems: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#E8611A', overflow: 'hidden', flexShrink: 0 }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 32, fontWeight: 700 }}>{profile.display_name[0]?.toUpperCase()}</div>
          }
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 20 }}>
          {[{ label: 'Rated', value: profile.rated_count ?? 0 }, { label: 'Following', value: profile.following_count ?? 0 }, { label: 'Followers', value: profile.follower_count ?? 0 }].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#13132A' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#8A7E74' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div style={{ padding: '0 20px 14px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#13132A', margin: 0 }}>{profile.display_name}</p>
        <p style={{ fontSize: 12, color: '#8A7E74', margin: '2px 0' }}>@{profile.username}</p>
        {profile.bio && <p style={{ fontSize: 13, color: '#13132A', margin: '6px 0 0', lineHeight: 1.5 }}>{profile.bio}</p>}
        {profile.neighborhood && <p style={{ fontSize: 12, color: '#8A7E74', margin: '4px 0 0' }}>📍 {profile.neighborhood}</p>}
      </div>

      {/* Action button */}
      <div style={{ padding: '0 20px 16px' }}>
        {isOwner
          ? <Link href="/profile/edit" style={{ display: 'block', width: '100%', padding: 10, borderRadius: 10, border: '1.5px solid #E8E2DC', background: 'transparent', color: '#13132A', fontWeight: 600, fontSize: 14, textAlign: 'center', textDecoration: 'none' }}>Edit Profile</Link>
          : <button onClick={handleFollow} disabled={followLoading} style={{ width: '100%', padding: 10, borderRadius: 10, border: profile.is_following ? '1.5px solid #E8611A' : 'none', background: profile.is_following ? 'transparent' : '#E8611A', color: profile.is_following ? '#E8611A' : '#fff', fontWeight: 700, fontSize: 14, cursor: followLoading ? 'not-allowed' : 'pointer' }}>
            {followLoading ? '…' : profile.is_following ? 'Following' : 'Follow'}
          </button>
        }
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E8E2DC', marginBottom: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #E8611A' : '2px solid transparent', color: tab === t ? '#E8611A' : '#8A7E74', fontWeight: tab === t ? 700 : 400, fontSize: 13, cursor: 'pointer' }}>
            {t === 'rated' ? 'Rated' : t === 'posts' ? 'Posts' : 'Want to Go'}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px' }}>
        {/* Posts tab */}
        {tab === 'posts' && (
          posts.length === 0
            ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A7E74' }}>No posts yet</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.map(post => (
                <div key={post.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E2DC', padding: 16 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{TAG_EMOJI[post.rating_tag]}</span>
                    {post.vendor && (
                      <Link href={`/v/${(post.vendor as { slug: string }).slug}`} style={{ fontSize: 14, fontWeight: 700, color: '#E8611A', textDecoration: 'none' }}>
                        {(post.vendor as { name: string }).name}
                      </Link>
                    )}
                    {post.vendor && (post.vendor as { neighbourhood?: string }).neighbourhood && (
                      <span style={{ fontSize: 11, color: '#8A7E74' }}>{(post.vendor as { neighbourhood: string }).neighbourhood}</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8A7E74' }}>{timeAgo(post.created_at)}</span>
                  </div>
                  {post.body && <p style={{ fontSize: 14, color: '#13132A', margin: 0, lineHeight: 1.5 }}>{post.body}</p>}
                  {post.photo_url && <img src={post.photo_url} alt="" style={{ width: '100%', borderRadius: 8, marginTop: 8, objectFit: 'cover', maxHeight: 240 }} />}
                </div>
              ))}
            </div>
        )}

        {/* Rated tab */}
        {tab === 'rated' && (
          (profile.is_list_private && !isOwner)
            ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A7E74' }}>🔒 This list is private</div>
            : <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A7E74', fontSize: 13 }}>Rated list coming soon</div>
        )}

        {/* Want to Go tab (owner only) */}
        {tab === 'want' && isOwner && (
          bookmarks.length === 0
            ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A7E74' }}>No saved places yet</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bookmarks.map(bm => (
                <div key={bm.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E2DC', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Link href={`/v/${bm.vendor?.slug}`} style={{ fontSize: 14, fontWeight: 700, color: '#13132A', textDecoration: 'none' }}>{bm.vendor?.name}</Link>
                    {bm.vendor?.neighbourhood && <p style={{ fontSize: 12, color: '#8A7E74', margin: '2px 0 0' }}>{bm.vendor.neighbourhood}</p>}
                  </div>
                  <Link href={`/rate?vendor=${bm.vendor_id}`} style={{ padding: '6px 14px', borderRadius: 8, background: '#E8611A', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Rate →</Link>
                </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}
