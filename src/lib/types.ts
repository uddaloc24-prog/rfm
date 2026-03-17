export type VendorCategory =
  | 'street_food'
  | 'mess_tiffin'
  | 'chai_snacks'
  | 'restaurant'
  | 'home_cook'
  | 'other';

export type VendorStatus = 'pending' | 'verified' | 'flagged' | 'removed';
export type PostType = 'discovery' | 'ask' | 'milestone';
export type FlagReason =
  | 'doesnt_exist'
  | 'wrong_location'
  | 'duplicate'
  | 'closed'
  | 'other';

export interface User {
  id: string;
  username: string;
  display_name: string;
  city: string;
  bio?: string | null;
  rating_count: number;
  avg_score?: number | null;
  city_rank?: number | null;
  avatar_url?: string | null;
  onboarded?: boolean;
  is_private?: boolean;
  is_banned?: boolean;
  banned_at?: string | null;
  ban_reason?: string | null;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  category: VendorCategory;
  known_for?: string | null;
  open_since?: number | null;
  hours?: string | null;
  price_range?: string | null;
  lat?: number | null;
  lng?: number | null;
  address_text?: string | null;
  neighbourhood?: string | null;
  city: string;
  status: VendorStatus;
  verification_count: number;
  community_score: number;
  daily_count: number;
  daily_score: number;
  total_rating_count: number;
  hero_photo_url?: string | null;
  created_by?: string | null;
  created_at: string;
  _source?: 'db' | 'osm';
}

export interface Rating {
  id: string;
  user_id: string;
  vendor_id: string;
  personal_score: number;
  gps_lat?: number | null;
  gps_lng?: number | null;
  gps_verified: boolean;
  photo_url?: string | null;
  note?: string | null;
  created_at: string;
}

export interface Comparison {
  id: string;
  user_id: string;
  winner_vendor_id: string;
  loser_vendor_id: string;
  rating_session_id?: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  body: string;
  post_type: PostType;
  vendor_id?: string | null;
  like_count: number;
  reply_count: number;
  created_at: string;
  user?: User;
  vendor?: Vendor;
}

/** @deprecated Use PersonalRanking + UserTag. Kept for admin/seed-data references. */
export interface RatedVendor {
  vendor: Vendor;
  personal_score: number;
  rank?: number;
  gps_verified: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// New rating system (Sprint 6)
// ---------------------------------------------------------------------------

/** Sentiment tag a user assigns to a vendor. */
export type Tag = 'good' | 'bad' | 'very_bad';

/** Display label + emoji for each tag. */
export const TAG_LABELS: Record<Tag, string> = {
  good:     'Loved it',
  bad:      'Meh',
  very_bad: 'Bad',
};

export const TAG_EMOJI: Record<Tag, string> = {
  good:     '😋',
  bad:      '😕',
  very_bad: '🤢',
};

/** A user's ELO score + rank for a specific vendor. */
export interface PersonalRanking {
  user_id: string;
  vendor_id: string;
  elo_score: number;
  rank_position: number;
  updated_at: string;
  vendor?: Vendor;
}

/** A user's sentiment tag for a specific vendor. */
export interface UserTag {
  user_id: string;
  vendor_id: string;
  tag: Tag;
  created_at: string;
}

/** Combined row returned by /api/ratings/my-map. */
export interface RatedVendorRow {
  rank: number;
  elo_score: number;
  tag: Tag;
  vendor: Vendor;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<VendorCategory, string> = {
  street_food: 'Street Food',
  mess_tiffin: 'Mess & Tiffin',
  chai_snacks: 'Chai & Snacks',
  restaurant: 'Restaurant',
  home_cook: 'Home Cook',
  other: 'Other',
};

export const CATEGORY_EMOJI: Record<VendorCategory, string> = {
  street_food: '🛺',
  mess_tiffin: '🍱',
  chai_snacks: '☕',
  restaurant: '🍽️',
  home_cook: '🏠',
  other: '🥘',
};
