-- Migration 016: Global Ranking Schema
-- Adds community_scores table, global score RPC, and hourly pg_cron schedule.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- 1. comparisons.inferred — CONFIRMED ABSENT (no-op)
--    The comparisons table was created in 001_initial.sql with columns:
--      id, user_id, winner_vendor_id, loser_vendor_id, rating_session_id, created_at
--    No `inferred` column exists or is needed. No schema changes required.
-- ============================================================

DO $$
BEGIN
  -- Verify `inferred` column is absent from comparisons. This block is intentionally
  -- a no-op. If the column already existed for some reason, we would detect it here.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'comparisons'
      AND column_name  = 'inferred'
  ) THEN
    RAISE NOTICE 'comparisons.inferred column already exists — no action taken.';
  ELSE
    RAISE NOTICE 'comparisons.inferred column is absent as expected — no-op confirmed.';
  END IF;
END;
$$;

-- ============================================================
-- 2. vendors.lat / vendors.lng — CONFIRMED PRESENT (no-op)
--    Both columns (float8) were defined in 001_initial.sql.
--    Do NOT add duplicate latitude/longitude columns.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'vendors'
      AND column_name  = 'lat'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'vendors'
      AND column_name  = 'lng'
  ) THEN
    RAISE NOTICE 'vendors.lat and vendors.lng are already present — no-op confirmed.';
  ELSE
    RAISE EXCEPTION 'Expected vendors.lat and vendors.lng to exist but one or both are missing. Aborting migration.';
  END IF;
END;
$$;

-- ============================================================
-- 3. community_scores table — CREATE (does not yet exist)
--    Stores pre-computed global/community ranking data per vendor.
--    Populated by calculate_and_upsert_global_scores() RPC (see below).
--    Only vendors with >= 15 qualifying users appear here.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.community_scores (
  vendor_id            uuid        PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,
  global_score         float       NOT NULL DEFAULT 0,
  good_count           int         NOT NULL DEFAULT 0,
  bad_count            int         NOT NULL DEFAULT 0,
  very_bad_count       int         NOT NULL DEFAULT 0,
  total_ratings        int         NOT NULL DEFAULT 0,
  qualified_user_count int         NOT NULL DEFAULT 0,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- RLS: enable row level security
ALTER TABLE public.community_scores ENABLE ROW LEVEL SECURITY;

-- Public SELECT: anyone can read global scores
CREATE POLICY "community_scores_public_read"
  ON public.community_scores
  FOR SELECT
  USING (true);

-- INSERT: service_role only (written by the cron RPC, not by end-users)
CREATE POLICY "community_scores_service_insert"
  ON public.community_scores
  FOR INSERT
  WITH CHECK (false);  -- blocked for all non-service_role; service_role bypasses RLS

-- UPDATE: service_role only
CREATE POLICY "community_scores_service_update"
  ON public.community_scores
  FOR UPDATE
  USING (false);  -- blocked for all non-service_role; service_role bypasses RLS

-- Index: fast ORDER BY global_score DESC for leaderboard queries
CREATE INDEX IF NOT EXISTS community_scores_global_score
  ON public.community_scores (global_score DESC);

-- ============================================================
-- 4. calculate_and_upsert_global_scores() RPC
--
-- Algorithm per qualifying vendor (>= 15 distinct users in personal_rankings):
--
--   For each user u who has ranked vendor v:
--     total_count = total vendors ranked by u
--     percentile_i = (total_count - rank_position) / NULLIF(total_count - 1, 0)
--     Edge case: if total_count = 1, user has only one vendor → percentile = 1.0
--
--   base_score  = AVG(percentile_i) across all qualifying users for this vendor
--
--   Tag counts from user_tags (tag IN 'good','bad','very_bad'):
--     good_ratio      = good_count      / NULLIF(total_tags, 0)
--     very_bad_ratio  = very_bad_count  / NULLIF(total_tags, 0)
--
--   sentiment_multiplier = 1 + (good_ratio * 0.2) - (very_bad_ratio * 0.3)
--   global_score         = base_score * sentiment_multiplier
--
--   UPSERT into community_scores.
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_and_upsert_global_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id            uuid;
  v_global_score         float;
  v_good_count           int;
  v_bad_count            int;
  v_very_bad_count       int;
  v_total_ratings        int;
  v_qualified_user_count int;
  v_base_score           float;
  v_good_ratio           float;
  v_very_bad_ratio       float;
  v_sentiment_multiplier float;
BEGIN
  -- Iterate over all vendors that have at least 15 distinct users in personal_rankings
  FOR v_vendor_id IN
    SELECT vendor_id
    FROM public.personal_rankings
    GROUP BY vendor_id
    HAVING COUNT(DISTINCT user_id) >= 15
  LOOP

    -- ── Compute percentile-based base score ─────────────────────────────────
    --
    -- For each user, we need:
    --   total_count   = how many vendors that user has ranked (their list size)
    --   rank_position = this vendor's rank within that user's list (1 = best)
    --
    -- percentile_i:
    --   If total_count = 1  → 1.0  (only vendor, treat as top)
    --   Else                → (total_count - rank_position) / (total_count - 1)
    --     rank_position=1, total=5  → (5-1)/(5-1) = 1.0  (top)
    --     rank_position=5, total=5  → (5-5)/(5-1) = 0.0  (bottom)
    --
    SELECT
      COUNT(DISTINCT pr.user_id),
      AVG(
        CASE
          WHEN user_totals.total_count = 1 THEN 1.0
          ELSE (user_totals.total_count::float - pr.rank_position::float)
               / (user_totals.total_count::float - 1.0)
        END
      )
    INTO
      v_qualified_user_count,
      v_base_score
    FROM public.personal_rankings pr
    JOIN (
      -- Subquery: total vendors ranked per user
      SELECT user_id, COUNT(*) AS total_count
      FROM public.personal_rankings
      GROUP BY user_id
    ) user_totals ON user_totals.user_id = pr.user_id
    WHERE pr.vendor_id = v_vendor_id;

    -- ── Fetch tag counts from user_tags ──────────────────────────────────────
    SELECT
      COUNT(*) FILTER (WHERE tag = 'good'),
      COUNT(*) FILTER (WHERE tag = 'bad'),
      COUNT(*) FILTER (WHERE tag = 'very_bad'),
      COUNT(*)
    INTO
      v_good_count,
      v_bad_count,
      v_very_bad_count,
      v_total_ratings
    FROM public.user_tags
    WHERE vendor_id = v_vendor_id;

    -- ── Sentiment multiplier ─────────────────────────────────────────────────
    v_good_ratio      := v_good_count::float      / NULLIF(v_total_ratings, 0);
    v_very_bad_ratio  := v_very_bad_count::float  / NULLIF(v_total_ratings, 0);

    -- Coalesce in case there are zero tags (no user_tags rows for this vendor)
    v_good_ratio     := COALESCE(v_good_ratio, 0.0);
    v_very_bad_ratio := COALESCE(v_very_bad_ratio, 0.0);

    v_sentiment_multiplier := 1.0
      + (v_good_ratio     * 0.2)
      - (v_very_bad_ratio * 0.3);

    -- ── Final global score ───────────────────────────────────────────────────
    v_global_score := COALESCE(v_base_score, 0.0) * v_sentiment_multiplier;

    -- ── UPSERT into community_scores ─────────────────────────────────────────
    INSERT INTO public.community_scores (
      vendor_id,
      global_score,
      good_count,
      bad_count,
      very_bad_count,
      total_ratings,
      qualified_user_count,
      updated_at
    )
    VALUES (
      v_vendor_id,
      v_global_score,
      v_good_count,
      v_bad_count,
      v_very_bad_count,
      v_total_ratings,
      v_qualified_user_count,
      now()
    )
    ON CONFLICT (vendor_id) DO UPDATE SET
      global_score         = EXCLUDED.global_score,
      good_count           = EXCLUDED.good_count,
      bad_count            = EXCLUDED.bad_count,
      very_bad_count       = EXCLUDED.very_bad_count,
      total_ratings        = EXCLUDED.total_ratings,
      qualified_user_count = EXCLUDED.qualified_user_count,
      updated_at           = EXCLUDED.updated_at;

  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_and_upsert_global_scores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_and_upsert_global_scores() TO service_role;

-- ============================================================
-- 5. pg_cron: run calculate_and_upsert_global_scores() every hour
--
-- Prerequisites:
--   - pg_cron extension must be enabled in your Supabase project
--     (Database → Extensions → pg_cron → Enable)
--   - pg_cron runs in the postgres database; the cron.schedule() call
--     is idempotent — if a job with this name already exists it is updated.
--
-- Schedule: '0 * * * *' = top of every hour (UTC)
-- ============================================================

SELECT cron.schedule(
  'global-score-refresh',
  '0 * * * *',
  $$SELECT public.calculate_and_upsert_global_scores()$$
);
