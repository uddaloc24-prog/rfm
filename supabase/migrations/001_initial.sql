-- ============================================================
-- Real Food Map — Initial Schema Migration
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type vendor_category as enum (
  'street_food',
  'mess_tiffin',
  'chai_snacks',
  'restaurant',
  'home_cook',
  'other'
);

create type vendor_status as enum (
  'pending',
  'verified',
  'flagged',
  'removed'
);

create type post_type as enum (
  'discovery',
  'ask',
  'milestone'
);

create type flag_reason as enum (
  'doesnt_exist',
  'wrong_location',
  'duplicate',
  'closed',
  'other'
);

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text not null,
  city         text not null default 'Bangalore',
  bio          text,
  rating_count int not null default 0,
  avg_score    float,
  city_rank    int,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Auto-create user profile on sign-up
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Anonymous')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- VENDORS
-- ============================================================

create table public.vendors (
  id                 uuid primary key default uuid_generate_v4(),
  name               text not null,
  slug               text unique not null,
  category           vendor_category not null default 'other',
  known_for          text,
  open_since         int,
  hours              text,
  price_range        text,
  lat                float8,
  lng                float8,
  address_text       text,
  neighbourhood      text,
  city               text not null default 'Bangalore',
  status             vendor_status not null default 'pending',
  verification_count int not null default 0,
  community_score    float not null default 0,
  daily_count        int not null default 0,
  daily_score        float not null default 0,
  total_rating_count int not null default 0,
  hero_photo_url     text,
  created_by         uuid references public.users(id) on delete set null,
  created_at         timestamptz not null default now()
);

-- Indexes
create index vendors_city_status_daily on public.vendors (city, status, daily_score desc);
create index vendors_slug on public.vendors (slug);
create index vendors_category on public.vendors (city, category, community_score desc);

-- Auto-verify when verification_count reaches 3
create function public.check_vendor_verification()
returns trigger language plpgsql
as $$
begin
  if new.verification_count >= 3 and new.status = 'pending' then
    new.status := 'verified';
  end if;
  return new;
end;
$$;

create trigger auto_verify_vendor
  before update on public.vendors
  for each row execute procedure public.check_vendor_verification();

-- Reset daily_count and daily_score at midnight IST (UTC+5:30 = 18:30 UTC previous day)
-- This is handled by a cron job / scheduled function in Supabase

-- ============================================================
-- RATINGS
-- ============================================================

create table public.ratings (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  vendor_id      uuid not null references public.vendors(id) on delete cascade,
  personal_score float not null default 1500,
  gps_lat        float8,
  gps_lng        float8,
  gps_verified   bool not null default false,
  photo_url      text,
  note           text,
  created_at     timestamptz not null default now(),
  unique (user_id, vendor_id)
);

create index ratings_user_id on public.ratings (user_id, personal_score desc);
create index ratings_vendor_id on public.ratings (vendor_id, created_at desc);

-- ============================================================
-- COMPARISONS
-- ============================================================

create table public.comparisons (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users(id) on delete cascade,
  winner_vendor_id  uuid not null references public.vendors(id) on delete cascade,
  loser_vendor_id   uuid not null references public.vendors(id) on delete cascade,
  rating_session_id uuid,
  created_at        timestamptz not null default now()
);

create index comparisons_user_id on public.comparisons (user_id, created_at desc);

-- ============================================================
-- POSTS
-- ============================================================

create table public.posts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  body        text not null,
  post_type   post_type not null default 'discovery',
  vendor_id   uuid references public.vendors(id) on delete set null,
  like_count  int not null default 0,
  reply_count int not null default 0,
  created_at  timestamptz not null default now()
);

create index posts_created_at on public.posts (created_at desc);
create index posts_user_id on public.posts (user_id, created_at desc);

-- ============================================================
-- LIKES
-- ============================================================

create table public.likes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

-- Keep like_count in sync
create function public.update_like_count()
returns trigger language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger likes_count_trigger
  after insert or delete on public.likes
  for each row execute procedure public.update_like_count();

-- ============================================================
-- FOLLOWS
-- ============================================================

create table public.follows (
  follower_id  uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- ============================================================
-- FLAGS
-- ============================================================

create table public.flags (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  vendor_id  uuid not null references public.vendors(id) on delete cascade,
  reason     flag_reason not null default 'other',
  created_at timestamptz not null default now()
);

-- Auto-flag vendor when 5+ flags with same reason
create function public.check_auto_flag()
returns trigger language plpgsql
as $$
declare
  flag_count int;
begin
  select count(*) into flag_count
  from public.flags
  where vendor_id = new.vendor_id and reason = new.reason;

  if flag_count >= 5 then
    update public.vendors set status = 'flagged' where id = new.vendor_id;
  end if;
  return new;
end;
$$;

create trigger auto_flag_vendor
  after insert on public.flags
  for each row execute procedure public.check_auto_flag();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.vendors enable row level security;
alter table public.ratings enable row level security;
alter table public.comparisons enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.flags enable row level security;

-- Users: public read, self-write
create policy "Users are publicly readable" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- Vendors: public read, auth create, no self-delete
create policy "Vendors are publicly readable" on public.vendors for select using (status != 'removed');
create policy "Auth users can create vendors" on public.vendors for insert with check (auth.uid() is not null);
create policy "Vendors can be updated by moderators" on public.vendors for update using (auth.uid() = created_by);

-- Ratings: public read, own write
create policy "Ratings are publicly readable" on public.ratings for select using (true);
create policy "Auth users can create ratings" on public.ratings for insert with check (auth.uid() = user_id);
create policy "Users can update own ratings" on public.ratings for update using (auth.uid() = user_id);

-- Comparisons: private
create policy "Users see own comparisons" on public.comparisons for select using (auth.uid() = user_id);
create policy "Auth users can create comparisons" on public.comparisons for insert with check (auth.uid() = user_id);

-- Posts: public read, own write
create policy "Posts are publicly readable" on public.posts for select using (true);
create policy "Auth users can create posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);

-- Likes: public read, own write
create policy "Likes are publicly readable" on public.likes for select using (true);
create policy "Auth users can like" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on public.likes for delete using (auth.uid() = user_id);

-- Follows: public read, own write
create policy "Follows are publicly readable" on public.follows for select using (true);
create policy "Auth users can follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Flags: auth insert only
create policy "Auth users can flag" on public.flags for insert with check (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime for live vendor updates on home screen
alter publication supabase_realtime add table public.vendors;
alter publication supabase_realtime add table public.posts;
