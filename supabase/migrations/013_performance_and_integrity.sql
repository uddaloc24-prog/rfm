-- Migration 013: Performance & Integrity
-- Run this in Supabase SQL Editor.
-- ============================================================

-- 1. RECALCULATE USER RANKS (RPC)
--    Replaces N individual UPDATE queries with a single SQL statement.
--    Called by the API after every comparison instead of rating-service.ts recalculateAllRanks.
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_user_ranks(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.personal_rankings pr
  SET rank_position = r.new_rank
  FROM (
    SELECT
      vendor_id,
      ROW_NUMBER() OVER (ORDER BY elo_score DESC, updated_at DESC) AS new_rank
    FROM public.personal_rankings
    WHERE user_id = p_user_id
  ) r
  WHERE pr.user_id = p_user_id
    AND pr.vendor_id = r.vendor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_user_ranks(uuid) TO authenticated;

-- ============================================================
-- 2. FLAGS: Prevent a user from flagging the same vendor twice
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'flags_user_vendor_unique'
      AND conrelid = 'public.flags'::regclass
  ) THEN
    ALTER TABLE public.flags
      ADD CONSTRAINT flags_user_vendor_unique UNIQUE (user_id, vendor_id);
  END IF;
END;
$$;

-- Index to speed up the check_auto_flag trigger
CREATE INDEX IF NOT EXISTS flags_vendor_reason
  ON public.flags (vendor_id, reason);

-- ============================================================
-- 3. HANDLE NEW USER: Collision-safe username generation
--    The old trigger would crash (rolling back signup) if two users share
--    the first 8 chars of their UUID. This version retries with a suffix.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username text;
  final_username text;
  suffix int := 0;
BEGIN
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    'user_' || replace(substr(new.id::text, 1, 12), '-', '')
  );
  final_username := base_username;

  LOOP
    BEGIN
      INSERT INTO public.users (id, username, display_name)
      VALUES (
        new.id,
        final_username,
        coalesce(new.raw_user_meta_data->>'full_name',
                 new.raw_user_meta_data->>'display_name',
                 'Anonymous')
      );
      EXIT; -- success
    EXCEPTION WHEN unique_violation THEN
      suffix := suffix + 1;
      final_username := base_username || '_' || suffix;
    END;
  END LOOP;

  RETURN new;
END;
$$;

-- ============================================================
-- 4. INDEXES: lat/lng for proximity search, comparisons for dedup
-- ============================================================
CREATE INDEX IF NOT EXISTS vendors_lat_lng
  ON public.vendors (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS comparisons_user_vendors
  ON public.comparisons (user_id, winner_vendor_id, loser_vendor_id);

-- ============================================================
-- 5. RLS: cache auth.uid() per-query (not per-row)
--    Wrapping in (SELECT auth.uid()) prevents re-evaluation per row.
--    Apply to the most-queried tables.
-- ============================================================

-- personal_rankings
DROP POLICY IF EXISTS "personal_rankings_own" ON public.personal_rankings;
CREATE POLICY "personal_rankings_select_own" ON public.personal_rankings
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "personal_rankings_insert_own" ON public.personal_rankings
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "personal_rankings_update_own" ON public.personal_rankings
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "personal_rankings_delete_own" ON public.personal_rankings
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- user_tags: replace FOR ALL with explicit policies
DROP POLICY IF EXISTS "user_tags_own" ON public.user_tags;
CREATE POLICY "user_tags_select_own" ON public.user_tags
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "user_tags_insert_own" ON public.user_tags
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "user_tags_update_own" ON public.user_tags
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "user_tags_delete_own" ON public.user_tags
  FOR DELETE USING ((SELECT auth.uid()) = user_id);
