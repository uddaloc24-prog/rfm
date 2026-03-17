-- Add onboarded column to users (silently failing in onboarding PATCH)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

-- Store which vibe tier each rating started in (loved / alright / meh)
-- Enables Beli-accurate tier-segregated binary search comparisons
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS initial_vibe text
  CHECK (initial_vibe IN ('loved', 'alright', 'meh'));

-- Track skipped comparisons (Too Tough button)
ALTER TABLE public.comparisons
  ADD COLUMN IF NOT EXISTS is_skipped boolean NOT NULL DEFAULT false;
