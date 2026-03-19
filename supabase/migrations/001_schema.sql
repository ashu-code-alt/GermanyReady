-- ─────────────────────────────────────────────────────────────────────────────
-- GermanyReady — Supabase schema
-- Run once in Supabase Dashboard → SQL Editor, or via `supabase db push`
-- ─────────────────────────────────────────────────────────────────────────────

-- ── PROFILES ─────────────────────────────────────────────────────────────────
-- One row per user; holds plan / Stripe info.
create table if not exists public.profiles (
  id                      uuid        primary key references auth.users on delete cascade,
  plan                    text        not null default 'free',         -- 'free' | 'pro'
  stripe_customer_id      text        unique,
  stripe_subscription_id  text        unique,
  plan_expires_at         timestamptz,                                  -- null = active sub or free
  mock_count_month        integer     not null default 0,
  mock_count_reset_at     timestamptz not null default date_trunc('month', now()),
  created_at              timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner access"
  on public.profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- ── PROGRESS ─────────────────────────────────────────────────────────────────
-- One row per user; stores the entire localStorage 'et5' blob as JSONB.
create table if not exists public.progress (
  user_id     uuid        primary key references auth.users on delete cascade,
  data        jsonb       not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "progress: owner access"
  on public.progress for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── EVENTS ───────────────────────────────────────────────────────────────────
-- Analytics events (quiz_started, mock_completed, paywall_viewed, etc.)
create table if not exists public.events (
  id          bigserial   primary key,
  user_id     uuid        references auth.users on delete set null,
  session_id  text,
  event       text        not null,
  props       jsonb,
  ts          timestamptz not null default now()
);

alter table public.events enable row level security;

-- Users can only insert their own events (or anonymous events with null user_id)
create policy "events: insert own"
  on public.events for insert
  with check (auth.uid() = user_id or user_id is null);

-- No select for regular users — analytics dashboard uses service-role key
create policy "events: no read"
  on public.events for select
  using (false);

-- Indexes for analytics queries
create index if not exists events_user_ts  on public.events (user_id, ts desc);
create index if not exists events_event_ts on public.events (event, ts desc);

-- ── TRIGGERS ─────────────────────────────────────────────────────────────────

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update progress.updated_at on every upsert
create or replace function public.touch_progress_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists progress_touch_updated on public.progress;
create trigger progress_touch_updated
  before update on public.progress
  for each row execute procedure public.touch_progress_updated_at();
