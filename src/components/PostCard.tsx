'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/types';

interface PostCardProps {
  post: Post;
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = ['#E8611A', '#F4A425', '#25D366', '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#8B5CF6'];

function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function PostCard({ post }: PostCardProps) {
  const user = post.user;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);

  if (!user) return null;

  async function handleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
    } catch {
      // Revert on error
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm text-white"
          style={{ background: avatarColor(user.username) }}
        >
          {getInitials(user.display_name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-body font-semibold text-sm truncate" style={{ color: '#1A1205' }}>
              {user.display_name}
            </span>
            {post.post_type === 'ask' && (
              <span
                className="shrink-0 font-body text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(244,164,37,0.12)', color: '#D4881A', border: '1px solid rgba(244,164,37,0.25)' }}
              >
                Asking
              </span>
            )}
            {post.post_type === 'milestone' && (
              <span
                className="shrink-0 font-body text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                Milestone
              </span>
            )}
          </div>
          <span className="font-body text-xs" style={{ color: '#9B8E84' }}>
            @{user.username} · {timeAgo(post.created_at)}
          </span>
        </div>
      </div>

      {/* Body */}
      <p className="font-body text-sm leading-relaxed mt-3" style={{ color: '#1A1205' }}>
        {post.body}
      </p>

      {/* Venue chip */}
      {post.post_type === 'discovery' && post.vendor && (
        <Link
          href={`/v/${post.vendor.slug}`}
          className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-xl active:opacity-70"
          style={{ background: 'rgba(232,97,26,0.07)', border: '1px solid rgba(232,97,26,0.18)' }}
        >
          <span className="text-sm">📍</span>
          <span className="font-body text-xs font-semibold" style={{ color: '#E8611A' }}>
            {post.vendor.name}
          </span>
          {post.vendor.neighbourhood && (
            <span className="font-body text-xs" style={{ color: '#9B8E84' }}>
              · {post.vendor.neighbourhood}
            </span>
          )}
        </Link>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-5 mt-3 pt-3"
        style={{ borderTop: '1px solid #F0EBE5' }}
      >
        <button onClick={handleLike} className="flex items-center gap-1.5 active:opacity-70">
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? '#E8611A' : 'none'}>
            <path
              d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
              stroke={liked ? '#E8611A' : '#C4B9B0'}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-body text-xs" style={{ color: liked ? '#E8611A' : '#9B8E84' }}>{likeCount}</span>
        </button>

        <button className="flex items-center gap-1.5 active:opacity-70">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#C4B9B0" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span className="font-body text-xs" style={{ color: '#9B8E84' }}>{post.reply_count}</span>
        </button>

        <button className="flex items-center gap-1.5 ml-auto active:opacity-70">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#C4B9B0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-body text-xs" style={{ color: '#9B8E84' }}>Share</span>
        </button>
      </div>
    </div>
  );
}
