-- Migration 012: Backfill personal_rankings from user_tags
--
-- Fixes users who have tags saved but no entries in personal_rankings.
-- This can happen if:
--   (a) the personal_rankings upsert silently failed in an earlier version, or
--   (b) old ratings from the pre-Sprint-6 system left rating_count > 0
--       but the new tables are empty.
--
-- Safe to run multiple times — ON CONFLICT DO NOTHING is idempotent.

INSERT INTO personal_rankings (user_id, vendor_id, elo_score, rank_position, updated_at)
SELECT
  ut.user_id,
  ut.vendor_id,
  1000 AS elo_score,
  ROW_NUMBER() OVER (
    PARTITION BY ut.user_id
    ORDER BY ut.created_at ASC
  ) AS rank_position,
  now() AS updated_at
FROM user_tags ut
WHERE NOT EXISTS (
  SELECT 1 FROM personal_rankings pr
  WHERE pr.user_id = ut.user_id
    AND pr.vendor_id = ut.vendor_id
)
ON CONFLICT (user_id, vendor_id) DO NOTHING;
