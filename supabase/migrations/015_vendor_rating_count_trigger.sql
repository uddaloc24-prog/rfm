-- Migration 015: Auto-maintain vendors.total_rating_count from user_tags
--
-- Problem: total_rating_count was never incremented by the new rating system
--   (saveTag writes to user_tags, but no trigger updated the vendor counter).
--   This meant community rater counts were always 0 on the vendor profile.
--
-- Fix:
--   1. Trigger on user_tags INSERT → total_rating_count + 1
--   2. Trigger on user_tags DELETE → total_rating_count - 1 (floor 0)
--   3. Backfill current counts from actual user_tags data
--   4. Backfill community_score for all vendors with rankings

-- ── Step 1: Trigger function ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_vendor_rating_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.vendors
    SET total_rating_count = total_rating_count + 1
    WHERE id = NEW.vendor_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.vendors
    SET total_rating_count = GREATEST(0, total_rating_count - 1)
    WHERE id = OLD.vendor_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ── Step 2: Attach trigger ───────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_sync_vendor_rating_count ON public.user_tags;
CREATE TRIGGER trg_sync_vendor_rating_count
  AFTER INSERT OR DELETE ON public.user_tags
  FOR EACH ROW EXECUTE FUNCTION public.sync_vendor_rating_count();

-- ── Step 3: Backfill total_rating_count from actual user_tags data ─────────

UPDATE public.vendors v
SET total_rating_count = (
  SELECT COUNT(DISTINCT ut.user_id)
  FROM public.user_tags ut
  WHERE ut.vendor_id = v.id
);

-- ── Step 4: Backfill community_score for all vendors with rankings ──────────

DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT DISTINCT vendor_id FROM public.personal_rankings LOOP
    PERFORM public.update_vendor_community_score(v.vendor_id);
  END LOOP;
END;
$$;
