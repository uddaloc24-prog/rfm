import type { VendorCategory } from '@/lib/types';

export interface ActivityEntry {
  user_id: string;
  vendor_id: string;
  tag: 'good' | 'bad' | 'very_bad';
  created_at: string;
}

export interface AdminStats {
  totals: { users: number; vendors: number; ratings: number; comparisons: number };
  thisWeek: { newUsers: number; newRatings: number };
  alerts: { pendingVendors: number; flaggedVendors: number; vendorsWithNoCoords: number };
  topVendors: Array<{
    id: string;
    name: string;
    category: VendorCategory;
    neighbourhood: string | null;
    total_rating_count: number;
    community_score: number;
  }>;
  topUsers: Array<{
    id: string;
    display_name: string;
    username: string;
    city: string;
    rating_count: number;
  }>;
}

export type VendorSort = 'date_desc' | 'name_asc' | 'most_rated' | 'highest_score';
export type VendorStatusFilter = 'all' | 'pending' | 'verified' | 'flagged' | 'removed';
export type UserStatusFilter = 'all' | 'active' | 'banned' | 'private';
export type UserSort = 'newest' | 'most_ratings' | 'username_asc';
export type ActivityTagFilter = 'all' | 'good' | 'bad' | 'very_bad';

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
