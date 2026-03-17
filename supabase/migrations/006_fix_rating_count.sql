-- Create the missing RPC (called by existing code at src/app/api/ratings/route.ts:110)
CREATE OR REPLACE FUNCTION public.increment_user_rating_count(user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users SET rating_count = rating_count + 1 WHERE id = user_id;
END;
$$;

-- Trigger to auto-maintain going forward (INSERT and DELETE on ratings)
CREATE OR REPLACE FUNCTION public.sync_rating_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET rating_count = rating_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET rating_count = GREATEST(rating_count - 1, 0) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_rating_change ON public.ratings;
CREATE TRIGGER on_rating_change
  AFTER INSERT OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.sync_rating_count();

-- Backfill all existing users
UPDATE public.users u
SET rating_count = (SELECT COUNT(*) FROM public.ratings r WHERE r.user_id = u.id);

-- RPC to recompute a vendor's community_score from all user ratings
-- Mirrors the TypeScript communityScore() function in src/lib/elo.ts
CREATE OR REPLACE FUNCTION public.update_vendor_community_score(vendor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_score float;
BEGIN
  SELECT
    SUM(r.personal_score *
        CASE WHEN r.gps_verified THEN 1.0 ELSE 0.4 END *
        LEAST(1.0, 0.6 + (COALESCE(u.rating_count, 0)::float / 50.0) * 0.4)
    ) /
    NULLIF(SUM(
        CASE WHEN r.gps_verified THEN 1.0 ELSE 0.4 END *
        LEAST(1.0, 0.6 + (COALESCE(u.rating_count, 0)::float / 50.0) * 0.4)
    ), 0)
  INTO new_score
  FROM public.ratings r
  JOIN public.users u ON u.id = r.user_id
  WHERE r.vendor_id = update_vendor_community_score.vendor_id;

  UPDATE public.vendors
  SET community_score = COALESCE(new_score, 0)
  WHERE id = update_vendor_community_score.vendor_id;
END;
$$;

-- Backfill community_score for all vendors that have ratings
DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT DISTINCT vendor_id FROM public.ratings LOOP
    PERFORM public.update_vendor_community_score(v.vendor_id);
  END LOOP;
END;
$$;
