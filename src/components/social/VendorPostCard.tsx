'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { VendorPost } from '@/lib/social-types';

const TAG_EMOJI: Record<string, string> = { good: '😋', bad: '😕', very_bad: '🤢' };
const TAG_LABEL: Record<string, string> = { good: 'Loved it', bad: 'Meh', very_bad: 'Bad' };
const REACTION_DEFS = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'same', emoji: '✅', label: 'Same' },
  { type: 'want_to_go', emoji: '👀', label: 'Want to go' },
];

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  post: VendorPost;
  currentUserId: string;
  onDeleted?: (id: string) => void;
  showVendorName?: boolean;
}

export default function VendorPostCard({ post, currentUserId, onDeleted, showVendorName }: Props) {
  const [reactions, setReactions] = useState<Record<string, number>>(post.reaction_counts ?? {});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set(post.user_reactions ?? []));
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body ?? '');
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const isOwn = post.user_id === currentUserId;
  const canEdit = isOwn && (Date.now() - new Date(post.created_at).getTime()) < 15 * 60 * 1000;

  const handleReact = async (type: string) => {
    if (isOwn) return;
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
      body: JSON.stringify({ target_type: 'vendor_post', target_id: post.id, reaction_type: type }),
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    const res = await fetch(`/api/social/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: editBody }),
    });
    if (res.ok) setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    const res = await fetch(`/api/social/posts/${post.id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleted(true);
      onDeleted?.(post.id);
    }
    setShowMenu(false);
  };

  if (deleted) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0EBE5', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <Link href={`/profile/${post.user?.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E8611A', overflow: 'hidden' }}>
            {post.user?.avatar_url
              ? <img src={post.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>
                  {post.user?.display_name?.[0]?.toUpperCase()}
                </div>
            }
          </div>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#13132A' }}>
            <Link href={`/profile/${post.user?.username}`} style={{ color: '#13132A', textDecoration: 'none' }}>
              {post.user?.display_name}
            </Link>
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#8A7E74' }}>
            {timeAgo(post.created_at)}{post.edited_at ? ' · edited' : ''}
          </p>
        </div>

        {/* Rating tag badge */}
        {post.rating_tag && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: '#FDF8F2', border: '1px solid #E8E2DC', flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>{TAG_EMOJI[post.rating_tag]}</span>
            <span style={{ fontSize: 11, color: '#8A7E74', fontWeight: 500 }}>{TAG_LABEL[post.rating_tag]}</span>
          </div>
        )}

        {/* Owner menu */}
        {isOwn && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(p => !p)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A7E74', fontSize: 18 }}>⋯</button>
            {showMenu && (
              <div style={{ position: 'absolute', right: 0, top: 36, background: '#fff', border: '1px solid #E8E2DC', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 20, minWidth: 120, overflow: 'hidden' }}>
                {canEdit && (
                  <button onClick={() => { setEditing(true); setShowMenu(false); }} style={{ display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: 13, color: '#13132A', cursor: 'pointer' }}>Edit</button>
                )}
                <button onClick={handleDelete} style={{ display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: 13, color: '#EF4444', cursor: 'pointer' }}>Delete</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vendor name (when shown in feed context) */}
      {showVendorName && post.vendor && (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#E8611A', fontWeight: 600 }}>@ {post.vendor.name}</p>
      )}

      {/* Body */}
      {editing ? (
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            maxLength={280}
            rows={3}
            style={{ width: '100%', borderRadius: 10, border: '1.5px solid #E8611A', padding: '8px 12px', fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
            <button onClick={() => setEditing(false)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E8E2DC', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#8A7E74' }}>Cancel</button>
            <button onClick={handleSaveEdit} disabled={saving} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#E8611A', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        post.body && <p style={{ fontSize: 14, color: '#13132A', margin: '0 0 10px', lineHeight: 1.6 }}>{post.body}</p>
      )}

      {/* Photo */}
      {post.photo_url && !editing && (
        <img src={post.photo_url} alt="" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 260, display: 'block', marginBottom: 10 }} />
      )}

      {/* Reactions + comments row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
        {!isOwn && REACTION_DEFS.map(r => {
          const count = reactions[r.type] ?? 0;
          const active = myReactions.has(r.type);
          return (
            <button key={r.type} onClick={() => handleReact(r.type)} title={r.label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, border: `1.5px solid ${active ? '#E8611A' : '#E8E2DC'}`, background: active ? 'rgba(232,97,26,0.08)' : '#fff', cursor: 'pointer', fontSize: 13, color: active ? '#E8611A' : '#8A7E74', fontWeight: active ? 700 : 400, minHeight: 30 }}>
              <span>{r.emoji}</span>{count > 0 && <span>{count}</span>}
            </button>
          );
        })}

        <button
          onClick={() => setShowComments(p => !p)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, border: '1.5px solid #E8E2DC', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#8A7E74', minHeight: 30 }}
        >
          <span>💬</span>
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
      </div>

      {/* Comments inline (lazy) */}
      {showComments && (
        <InlineComments
          postId={post.id}
          currentUserId={currentUserId}
          onCountChange={n => setCommentCount(n)}
        />
      )}
    </div>
  );
}

function InlineComments({ postId, currentUserId, onCountChange }: { postId: string; currentUserId: string; onCountChange: (n: number) => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  interface Comment {
    id: string;
    user_id: string;
    body: string;
    created_at: string;
    parent_id: string | null;
    user?: { display_name: string; username: string; avatar_url: string | null };
  }

  const load = async () => {
    const res = await fetch(`/api/social/comments?post_id=${postId}`);
    const data = await res.json();
    setComments(data.comments ?? []);
    setLoading(false);
    onCountChange((data.comments ?? []).length);
  };

  // Load on mount
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/social/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, body }),
    });
    if (res.ok) {
      setBody('');
      await load();
    }
    setSubmitting(false);
  };

  const deleteComment = async (id: string) => {
    await fetch(`/api/social/comments?id=${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0EBE5' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#8A7E74', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {comments.length === 0 && <p style={{ fontSize: 13, color: '#8A7E74', margin: 0 }}>No comments yet. Be the first!</p>}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E8611A', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                {c.user?.display_name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#13132A' }}>{c.user?.display_name}</span>
                  {' '}<span style={{ color: '#13132A' }}>{c.body}</span>
                </p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#8A7E74' }}>{timeAgo(c.created_at)}</span>
                  {c.user_id === currentUserId && (
                    <button onClick={() => deleteComment(c.id)} style={{ fontSize: 11, color: '#EF4444', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
          placeholder="Add a comment…"
          maxLength={280}
          style={{ flex: 1, borderRadius: 99, border: '1.5px solid #E8E2DC', padding: '7px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          onClick={submit}
          disabled={submitting || !body.trim()}
          style={{ padding: '7px 16px', borderRadius: 99, border: 'none', background: '#E8611A', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: (!body.trim() || submitting) ? 0.5 : 1 }}
        >
          Post
        </button>
      </div>
    </div>
  );
}
