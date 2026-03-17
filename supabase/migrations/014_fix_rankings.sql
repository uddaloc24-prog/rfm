-- Migration 014: Fix missing personal_rankings rows + recalculate all user ranks
--
-- Problem 1: Some vendors may be in user_tags but missing from personal_rankings
--   (caused by a silent upsert failure in an earlier saveTag call).
--   This made processComparison throw "expected 2 rows, got 1", causing comparisons
--   to silently fail and leaving all ELO scores at DEFAULT=1000.
--
-- Problem 2: rank_position was stale for any user whose comparisons failed,
--   because recalculate_user_ranks never ran successfully for them.
--
-- This migration is safe to run multiple times.

-- ── Step 1: Backfill missing personal_rankings from user_tags ────────────────

INSERT INTO public.personal_rankings (user_id, vendor_id, elo_score, rank_position, updated_at)
SELECT
  ut.user_id,
  ut.vendor_id,
  1000 AS elo_score,
  1    AS rank_position,
  now() AS updated_at
FROM public.user_tags ut
WHERE NOT EXISTS (
  SELECT 1 FROM public.personal_rankings pr
  WHERE pr.user_id  = ut.user_id
    AND pr.vendor_id = ut.vendor_id
)
ON CONFLICT (user_id, vendor_id) DO NOTHING;

-- ── Step 2: Recalculate rank_position for every user ────────────────────────
-- Calls the existing recalculate_user_ranks RPC for each distinct user.

DO $$
DECLARE u record;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.personal_rankings LOOP
    PERFORM public.recalculate_user_ranks(u.user_id);
  END LOOP;
END;
$$;
