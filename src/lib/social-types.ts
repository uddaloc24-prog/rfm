export type RatingTag = 'good' | 'bad' | 'very_bad';
export type ReactionType = 'fire' | 'same' | 'want_to_go';
export type NotificationType =
  | 'new_follower'
  | 'post_reaction'
  | 'post_comment'
  | 'comment_reply'
  | 'bookmark_leaderboard';
export type FeedEventType = 'rated' | 'compared' | 'posted';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate_content' | 'fake';
export type ReportTarget = 'vendor_post' | 'comment' | 'profile';
export type ReactionTarget = 'vendor_post' | 'comment';

export interface SocialProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  neighborhood: string | null;
  avatar_url: string | null;
  is_list_private: boolean;
  is_banned: boolean;
  created_at: string;
  follower_count?: number;
  following_count?: number;
  rated_count?: number;
  is_following?: boolean;
  is_blocked?: boolean;
  is_blocked_by?: boolean;
}

export interface VendorPost {
  id: string;
  user_id: string;
  vendor_id: string;
  body: string | null;
  photo_url: string | null;
  rating_tag: RatingTag;
  is_deleted: boolean;
  created_at: string;
  edited_at: string | null;
  user?: Pick<SocialProfile, 'username' | 'display_name' | 'avatar_url'>;
  vendor?: { id: string; name: string; slug: string; neighbourhood: string | null };
  reaction_counts?: Record<ReactionType, number>;
  user_reactions?: ReactionType[];
  comment_count?: number;
  score?: number;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  parent_comment_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  user?: Pick<SocialProfile, 'username' | 'display_name' | 'avatar_url'>;
  replies?: Comment[];
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  target_type: string | null;
  target_id: string | null;
  read: boolean;
  reaction_actors: string[];
  created_at: string;
  updated_at: string;
  actor?: Pick<SocialProfile, 'username' | 'display_name' | 'avatar_url'>;
}

export interface FeedEvent {
  id: string;
  user_id: string;
  event_type: FeedEventType;
  vendor_id: string | null;
  post_id: string | null;
  reaction_score: number;
  created_at: string;
  user?: Pick<SocialProfile, 'username' | 'display_name' | 'avatar_url'>;
  vendor?: { id: string; name: string; slug: string; neighbourhood: string | null };
  vendor_post?: VendorPost;
  score?: number;
}

export interface Bookmark {
  id: string;
  user_id: string;
  vendor_id: string;
  created_at: string;
  vendor?: { id: string; name: string; slug: string; neighbourhood: string | null; category: string };
}
