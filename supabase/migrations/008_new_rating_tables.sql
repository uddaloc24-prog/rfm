-- Migration 008: Replace rating system with tag + ELO comparison model
--
-- New tables:
--   personal_rankings  — per-user ELO score and rank position per vendor
--   user_tags          — sentiment tag (good / bad / very_bad) per user-vendor pair
--
-- Also updates the update_vendor_community_score RPC to read from
-- personal_rankings instead of ratings.
--
-- Run in Supabase SQL editor.

-- -----------------------------------------------------------------------
-- 1. personal_rankings
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.personal_rankings (
  user_id       uuid        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  vendor_id     uuid        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  elo_score     float       NOT NULL DEFAULT 1000,
  rank_position integer     NOT NULL DEFAULT 1,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, vendor_id)
);

-- Index for fetching a user's full ranked list quickly
CREATE INDEX IF NOT EXISTS personal_rankings_user_rank
  ON public.personal_rankings (user_id, rank_position ASC);

-- Index for community score computation (per vendor, all users)
CREATE INDEX IF NOT EXISTS personal_rankings_vendor
  ON public.personal_rankings (vendor_id);

-- -----------------------------------------------------------------------
-- 2. user_tags
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_tags (
  user_id    uuid        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  vendor_id  uuid        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  tag        text        NOT NULL CHECK (tag IN ('good', 'bad', 'very_bad')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS user_tags_user
  ON public.user_tags (user_id);

CREATE INDEX IF NOT EXISTS user_tags_vendor
  ON public.user_tags (vendor_id);

-- -----------------------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------------------

ALTER TABLE public.personal_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;

-- personal_rankings: anyone can read (needed for community score computation),
-- only the owner can write
DROP POLICY IF EXISTS "personal_rankings_select" ON public.personal_rankings;
CREATE POLICY "personal_rankings_select"
  ON public.personal_rankings FOR SELECT USING (true);

DROP POLICY IF EXISTS "personal_rankings_insert" ON public.personal_rankings;
CREATE POLICY "personal_rankings_insert"
  ON public.personal_rankings FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "personal_rankings_update" ON public.personal_rankings;
CREATE POLICY "personal_rankings_update"
  ON public.personal_rankings FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "personal_rankings_delete" ON public.personal_rankings;
CREATE POLICY "personal_rankings_delete"
  ON public.personal_rankings FOR DELETE USING (user_id = auth.uid());

-- user_tags: only the owner can read/write
DROP POLICY IF EXISTS "user_tags_own" ON public.user_tags;
CREATE POLICY "user_tags_own"
  ON public.user_tags FOR ALL USING (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- 4. Update update_vendor_community_score RPC
--    Now reads from personal_rankings.elo_score instead of ratings.personal_score.
--    GPS weight removed (new system doesn't track GPS).
--    Trust weight retained (rating_count-based, same formula as before).
--    eloToDisplayScore range is now 800-1200 → 1-10 to match DEFAULT_ELO=1000.
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_vendor_community_score(vendor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_score float;
  display_score float;
BEGIN
  -- Weighted average of elo_score across all users who have ranked this vendor.
  -- Trust weight: new raters (low rating_count) count 60%, experienced raters up to 100%.
  SELECT
    SUM(
      pr.elo_score *
      LEAST(1.0, 0.6 + (COALESCE(u.rating_count, 0)::float / 50.0) * 0.4)
    ) /
    NULLIF(SUM(
      LEAST(1.0, 0.6 + (COALESCE(u.rating_count, 0)::float / 50.0) * 0.4)
    ), 0)
  INTO new_score
  FROM public.personal_rankings pr
  JOIN public.users u ON u.id = pr.user_id
  WHERE pr.vendor_id = update_vendor_community_score.vendor_id;

  -- Map raw ELO average (800-1200 range) → display score (1-10).
  -- Mirrors TypeScript eloToDisplayScore() with DEFAULT_ELO=1000 base.
  IF new_score IS NOT NULL THEN
    display_score := GREATEST(1.0, LEAST(10.0,
      ((GREATEST(800.0, LEAST(1200.0, new_score)) - 800.0) / 400.0) * 9.0 + 1.0
    ));
  ELSE
    display_score := 0;
  END IF;

  UPDATE public.vendors
  SET community_score = display_score
  WHERE id = update_vendor_community_score.vendor_id;
END;
$$;

-- -----------------------------------------------------------------------
-- 5. Backfill community_score for all vendors that now have personal_rankings
--    (Only relevant after data is in the new tables; safe to run on empty tables.)
-- -----------------------------------------------------------------------

DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT DISTINCT vendor_id FROM public.personal_rankings LOOP
    PERFORM public.update_vendor_community_score(v.vendor_id);
  END LOOP;
END;
$$;
