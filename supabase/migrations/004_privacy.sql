-- Add privacy flag to users. Public by default.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;
