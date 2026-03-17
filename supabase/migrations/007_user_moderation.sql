ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_reason text;
