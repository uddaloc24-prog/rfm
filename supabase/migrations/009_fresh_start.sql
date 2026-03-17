-- Migration 009: Fresh start — clear all user data, reset vendor stats
--
-- Keeps: vendor records (names, slugs, locations, categories, etc.)
-- Clears: all user accounts and everything they generated
--         (ratings, comparisons, posts, likes, follows, flags,
--          personal_rankings, user_tags)
-- Resets: vendor community stats back to zero so real usage builds them
--
-- Run in Supabase SQL editor.
-- After running, also delete accounts from:
--   Supabase Dashboard → Authentication → Users
-- (Those are in auth.users which can't be cleared via SQL editor)

-- -----------------------------------------------------------------------
-- 1. Clear all user-generated data
--    Deleting from public.users cascades to every FK child table:
--      ratings, comparisons, posts, likes, follows, flags,
--      personal_rankings, user_tags
--    vendors.created_by is SET NULL (vendor records are kept).
-- -----------------------------------------------------------------------
DELETE FROM public.users;

-- -----------------------------------------------------------------------
-- 2. Reset vendor community stats to zero
--    All existing stats were either fake seed data or from test accounts.
--    Real usage will rebuild them organically.
-- -----------------------------------------------------------------------
UPDATE public.vendors
SET
  community_score    = 0,
  daily_count        = 0,
  daily_score        = 0,
  total_rating_count = 0,
  verification_count = 0,
  status             = 'pending';

