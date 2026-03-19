-- =============================================================================
-- Migration 017: Social Layer
-- =============================================================================
-- Adds the full social graph and vendor review post system:
--   - New user profile columns (neighborhood, privacy, username change tracking)
--   - Enums for rating tags, reactions, notifications, feed events, reports
--   - vendor_posts   — per-user review posts on vendors (distinct from `posts`)
--   - reactions      — fire / same / want_to_go on posts and comments
--   - comments       — threaded comments on vendor_posts
--   - bookmarks      — save vendors to try later (auto-removed when rated)
--   - notifications  — in-app notification inbox
--   - feed_events    — activity stream rows (rated, compared, posted)
--   - reports        — user reports on posts, comments, profiles
--   - blocks         — user-to-user blocking
-- Triggers:
--   - trg_delete_bookmark_on_rate       auto-clear bookmark when user_tags inserted
--   - trg_sync_reaction_score           keep feed_events.reaction_score in sync
--   - trg_soft_delete_vendor_posts      null out body/photo on soft delete
--   - trg_soft_delete_comments          replace body with '[deleted]' on soft delete
-- RLS: enabled on all new tables with block-aware policies
-- =============================================================================


-- =============================================================================
-- SECTION 1: ALTER TABLE users — add social profile columns
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_list_private boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_username_change_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;


-- =============================================================================
-- SECTION 2: ENUMS
-- =============================================================================

-- Rating sentiment tag for vendor_posts
DO $$ BEGIN
  CREATE TYPE rating_tag_enum AS ENUM ('good', 'bad', 'very_bad');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reaction types on posts and comments
DO $$ BEGIN
  CREATE TYPE reaction_type_enum AS ENUM ('fire', 'same', 'want_to_go');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notification categories
DO $$ BEGIN
  CREATE TYPE notification_type_enum AS ENUM (
    'new_follower',
    'post_reaction',
    'post_comment',
    'comment_reply',
    'bookmark_leaderboard'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Activity feed event categories
DO $$ BEGIN
  CREATE TYPE feed_event_type_enum AS ENUM ('rated', 'compared', 'posted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Report reason options
DO $$ BEGIN
  CREATE TYPE report_reason_enum AS ENUM (
    'spam',
    'harassment',
    'inappropriate_content',
    'fake'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- What kind of content is being reported
DO $$ BEGIN
  CREATE TYPE report_target_enum AS ENUM ('vendor_post', 'comment', 'profile');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- What a notification points at
DO $$ BEGIN
  CREATE TYPE notification_target_enum AS ENUM ('vendor_post', 'comment', 'vendor', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- What a reaction is attached to
DO $$ BEGIN
  CREATE TYPE reaction_target_enum AS ENUM ('vendor_post', 'comment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =============================================================================
-- SECTION 3: vendor_posts
-- One review post per user per vendor. Distinct from the community `posts` table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS vendor_posts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id    uuid        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  body         text,
  photo_url    text,
  rating_tag   rating_tag_enum NOT NULL,
  needs_review boolean     DEFAULT false,
  is_deleted   boolean     DEFAULT false,
  deleted_at   timestamptz,
  edited_at    timestamptz,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, vendor_id)
);


-- =============================================================================
-- SECTION 4: reactions
-- Users react to vendor_posts or comments with fire / same / want_to_go.
-- =============================================================================

CREATE TABLE IF NOT EXISTS reactions (
  id            uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid                   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type   reaction_target_enum   NOT NULL,
  target_id     uuid                   NOT NULL,
  reaction_type reaction_type_enum     NOT NULL,
  created_at    timestamptz            DEFAULT now(),
  UNIQUE (user_id, target_type, target_id, reaction_type)
);


-- =============================================================================
-- SECTION 5: comments
-- Threaded comments on vendor_posts. Self-reference guard via CHECK.
-- =============================================================================

CREATE TABLE IF NOT EXISTS comments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id           uuid        NOT NULL REFERENCES vendor_posts(id) ON DELETE CASCADE,
  parent_comment_id uuid        REFERENCES comments(id),
  body              text        NOT NULL,
  needs_review      boolean     DEFAULT false,
  is_deleted        boolean     DEFAULT false,
  deleted_at        timestamptz,
  created_at        timestamptz DEFAULT now(),
  CHECK (parent_comment_id != id)
);


-- =============================================================================
-- SECTION 6: bookmarks
-- Save a vendor to try later. Auto-removed when the user rates the vendor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookmarks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id  uuid        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, vendor_id)
);


-- =============================================================================
-- SECTION 7: notifications
-- In-app notification inbox. Written by server-side triggers / edge functions.
-- Clients may only SELECT and UPDATE (mark read) their own rows.
-- reaction_actors accumulates UUIDs so "Alice and 3 others reacted" is cheap.
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id              uuid                       PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    uuid                       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id        uuid                       REFERENCES users(id) ON DELETE SET NULL,
  type            notification_type_enum     NOT NULL,
  target_type     notification_target_enum,
  target_id       uuid,
  read            boolean                    DEFAULT false,
  reaction_actors uuid[]                     DEFAULT '{}',
  created_at      timestamptz                DEFAULT now(),
  updated_at      timestamptz                DEFAULT now()
);


-- =============================================================================
-- SECTION 8: feed_events
-- One row per user action surfaced in the community feed.
-- reaction_score is kept in sync by trg_sync_reaction_score.
-- =============================================================================

CREATE TABLE IF NOT EXISTS feed_events (
  id                uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid                  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type        feed_event_type_enum  NOT NULL,
  vendor_id         uuid                  REFERENCES vendors(id) ON DELETE CASCADE,
  post_id           uuid                  REFERENCES vendor_posts(id) ON DELETE SET NULL,
  reaction_score    integer               DEFAULT 0,
  reaction_score_cap integer              DEFAULT 50,
  is_deleted        boolean               DEFAULT false,
  created_at        timestamptz           DEFAULT now()
);


-- =============================================================================
-- SECTION 9: reports
-- Users report posts, comments, or profiles. One report per user per target.
-- No SELECT policy — only admins read via service role.
-- =============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id           uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type  report_target_enum  NOT NULL,
  target_id    uuid                NOT NULL,
  reason       report_reason_enum  NOT NULL,
  created_at   timestamptz         DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);


-- =============================================================================
-- SECTION 10: blocks
-- User-to-user blocking. Self-block guard via CHECK.
-- =============================================================================

CREATE TABLE IF NOT EXISTS blocks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);


-- =============================================================================
-- SECTION 11: follows — add self-follow guard (safe to re-apply)
-- =============================================================================

ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_no_self_follow;
ALTER TABLE follows ADD CONSTRAINT follows_no_self_follow CHECK (follower_id != following_id);


-- =============================================================================
-- SECTION 12: INDEXES
-- =============================================================================

-- follows (may already exist from 001; IF NOT EXISTS is safe)
CREATE INDEX IF NOT EXISTS idx_follows_follower   ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following  ON follows (following_id);

-- feed_events
CREATE INDEX IF NOT EXISTS idx_feed_events_user_created ON feed_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_events_created      ON feed_events (created_at DESC);

-- vendor_posts
CREATE INDEX IF NOT EXISTS idx_vendor_posts_vendor_created ON vendor_posts (vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_posts_user_created   ON vendor_posts (user_id, created_at DESC);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_parent       ON comments (parent_comment_id);

-- reactions
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions (target_type, target_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, read, created_at DESC);

-- bookmarks
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks (user_id);

-- blocks
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks (blocked_id);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports (target_type, target_id);


-- =============================================================================
-- SECTION 13: ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE vendor_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks          ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 14: RLS POLICIES
-- All policies use (SELECT auth.uid()) to enable per-query uid caching,
-- avoiding repeated per-row function evaluations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- vendor_posts policies
-- ---------------------------------------------------------------------------

-- SELECT: all authenticated users; exclude soft-deleted and blocked users' posts
CREATE POLICY "vendor_posts_select" ON vendor_posts
  FOR SELECT TO authenticated
  USING (
    is_deleted = false
    AND user_id NOT IN (
      SELECT blocked_id FROM blocks WHERE blocker_id = (SELECT auth.uid())
    )
    AND user_id NOT IN (
      SELECT blocker_id FROM blocks WHERE blocked_id = (SELECT auth.uid())
    )
  );

-- INSERT: own posts only; banned users blocked
CREATE POLICY "vendor_posts_insert" ON vendor_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND NOT EXISTS (
      SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND is_banned = true
    )
  );

-- UPDATE: own posts only (used for soft delete and edit)
CREATE POLICY "vendor_posts_update" ON vendor_posts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- No DELETE policy: use soft delete (is_deleted = true) instead


-- ---------------------------------------------------------------------------
-- reactions policies
-- ---------------------------------------------------------------------------

CREATE POLICY "reactions_select" ON reactions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "reactions_insert" ON reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND NOT EXISTS (
      SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND is_banned = true
    )
  );

CREATE POLICY "reactions_delete" ON reactions
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);


-- ---------------------------------------------------------------------------
-- comments policies
-- ---------------------------------------------------------------------------

-- SELECT: exclude comments from users the caller has blocked (or who blocked them)
CREATE POLICY "comments_select" ON comments
  FOR SELECT TO authenticated
  USING (
    user_id NOT IN (
      SELECT blocked_id FROM blocks WHERE blocker_id = (SELECT auth.uid())
    )
    AND user_id NOT IN (
      SELECT blocker_id FROM blocks WHERE blocked_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "comments_insert" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND NOT EXISTS (
      SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND is_banned = true
    )
  );

CREATE POLICY "comments_update" ON comments
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ---------------------------------------------------------------------------
-- bookmarks policies
-- ---------------------------------------------------------------------------

CREATE POLICY "bookmarks_select" ON bookmarks
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "bookmarks_insert" ON bookmarks
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "bookmarks_delete" ON bookmarks
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);


-- ---------------------------------------------------------------------------
-- notifications policies
-- ---------------------------------------------------------------------------

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = recipient_id);

-- UPDATE: recipients may mark their own notifications as read
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = recipient_id)
  WITH CHECK ((SELECT auth.uid()) = recipient_id);

-- No INSERT policy from client: notifications are created by server triggers / edge functions


-- ---------------------------------------------------------------------------
-- feed_events policies
-- ---------------------------------------------------------------------------

-- SELECT: exclude events from blocked users (both directions)
CREATE POLICY "feed_events_select" ON feed_events
  FOR SELECT TO authenticated
  USING (
    is_deleted = false
    AND user_id NOT IN (
      SELECT blocked_id FROM blocks WHERE blocker_id = (SELECT auth.uid())
    )
    AND user_id NOT IN (
      SELECT blocker_id FROM blocks WHERE blocked_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "feed_events_insert" ON feed_events
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND NOT EXISTS (
      SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND is_banned = true
    )
  );


-- ---------------------------------------------------------------------------
-- reports policies
-- ---------------------------------------------------------------------------

CREATE POLICY "reports_insert" ON reports
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = reporter_id
    AND NOT EXISTS (
      SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND is_banned = true
    )
  );

-- No SELECT from client: reports are read-only via service role / admin routes


-- ---------------------------------------------------------------------------
-- blocks policies
-- ---------------------------------------------------------------------------

CREATE POLICY "blocks_select" ON blocks
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = blocker_id
    OR (SELECT auth.uid()) = blocked_id
  );

CREATE POLICY "blocks_insert" ON blocks
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = blocker_id);

CREATE POLICY "blocks_delete" ON blocks
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = blocker_id);


-- ---------------------------------------------------------------------------
-- follows — update INSERT policy to add block guard
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "follows_insert" ON follows;

CREATE POLICY "follows_insert" ON follows
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = follower_id
    AND follower_id != following_id
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = following_id
        AND blocked_id = (SELECT auth.uid())
    )
  );


-- =============================================================================
-- SECTION 15: TRIGGERS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Trigger 1: Auto-delete bookmark when a user rates a vendor
-- Fires AFTER INSERT on user_tags (one row = one completed rating)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_delete_bookmark_on_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM bookmarks
  WHERE user_id = NEW.user_id AND vendor_id = NEW.vendor_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_bookmark_on_rate ON user_tags;
CREATE TRIGGER trg_delete_bookmark_on_rate
  AFTER INSERT ON user_tags
  FOR EACH ROW
  EXECUTE FUNCTION fn_delete_bookmark_on_rate();


-- ---------------------------------------------------------------------------
-- Trigger 2: Keep feed_events.reaction_score in sync with reactions count
-- Fires AFTER INSERT OR DELETE on reactions; capped at reaction_score_cap
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_sync_reaction_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id uuid;
  v_count   integer;
BEGIN
  -- Determine the affected post
  IF TG_OP = 'INSERT' THEN
    v_post_id := NEW.target_id;
  ELSE
    v_post_id := OLD.target_id;
  END IF;

  -- Only process reactions that target a vendor_post
  IF (TG_OP = 'INSERT' AND NEW.target_type = 'vendor_post')
     OR (TG_OP = 'DELETE' AND OLD.target_type = 'vendor_post') THEN

    SELECT COUNT(*) INTO v_count
    FROM reactions
    WHERE target_type = 'vendor_post' AND target_id = v_post_id;

    UPDATE feed_events
    SET reaction_score = LEAST(v_count, reaction_score_cap)
    WHERE post_id = v_post_id;

  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_reaction_score ON reactions;
CREATE TRIGGER trg_sync_reaction_score
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_reaction_score();


-- ---------------------------------------------------------------------------
-- Trigger 3: Soft-delete cleanup
-- On vendor_posts: null out body and photo_url, stamp deleted_at
-- On comments:     replace body with '[deleted]', stamp deleted_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_soft_delete_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_TABLE_NAME = 'vendor_posts'
     AND NEW.is_deleted = true
     AND OLD.is_deleted = false
  THEN
    NEW.body      := null;
    NEW.photo_url := null;
    NEW.deleted_at := now();
  END IF;

  IF TG_TABLE_NAME = 'comments'
     AND NEW.is_deleted = true
     AND OLD.is_deleted = false
  THEN
    NEW.body      := '[deleted]';
    NEW.deleted_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_soft_delete_vendor_posts ON vendor_posts;
CREATE TRIGGER trg_soft_delete_vendor_posts
  BEFORE UPDATE ON vendor_posts
  FOR EACH ROW
  WHEN (NEW.is_deleted = true AND OLD.is_deleted = false)
  EXECUTE FUNCTION fn_soft_delete_cleanup();

DROP TRIGGER IF EXISTS trg_soft_delete_comments ON comments;
CREATE TRIGGER trg_soft_delete_comments
  BEFORE UPDATE ON comments
  FOR EACH ROW
  WHEN (NEW.is_deleted = true AND OLD.is_deleted = false)
  EXECUTE FUNCTION fn_soft_delete_cleanup();


-- =============================================================================
-- SECTION 16: needs_review columns (report threshold flag for admin review)
-- Already included in CREATE TABLE above; these are safe fallback ADDs.
-- =============================================================================

ALTER TABLE vendor_posts ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;
ALTER TABLE comments      ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;


-- =============================================================================
-- END OF MIGRATION 017_social_layer.sql
-- =============================================================================
