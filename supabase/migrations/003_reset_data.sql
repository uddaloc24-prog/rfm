-- Run this in the Supabase SQL Editor to wipe all user data for a fresh start.
-- Keeps: vendors (restaurant database)
-- Clears: ratings, comparisons, resets user onboarding flags

TRUNCATE TABLE comparisons CASCADE;
TRUNCATE TABLE ratings CASCADE;
UPDATE public.users SET onboarded = false, rating_count = 0;
