-- Migration 016: Add onboarded column and fix flag for existing users
--
-- The onboarded column was never applied to production (migration 005 was skipped).
-- Step 1: Add the column (safe to run even if it already exists).
-- Step 2: Mark all users with real activity as onboarded = true.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

-- Mark users with any real activity as onboarded
UPDATE public.users
SET onboarded = true
WHERE onboarded = false
  AND (
    -- User set a real name during onboarding (not the trigger default)
    (display_name IS NOT NULL AND display_name != 'Anonymous')
    -- OR user has rated at least one vendor
    OR id IN (SELECT DISTINCT user_id FROM public.user_tags)
    -- OR user has ranking entries
    OR id IN (SELECT DISTINCT user_id FROM public.personal_rankings)
  );
