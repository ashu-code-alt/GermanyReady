-- ─────────────────────────────────────────────────────────────────────────────
-- GermanyReady — Analytics helper functions (used by analytics-report Edge Fn)
-- Run via: supabase db push  OR  paste into SQL Editor
-- These functions use SECURITY DEFINER so they bypass RLS when called from
-- the Edge Function with the service role key.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Weekly event counts (last 12 weeks) ───────────────────────────────────────
-- Returns: week (Mon), event, count
create or replace function analytics_weekly_events()
returns table (week date, event text, cnt bigint)
language sql security definer
as $$
  select
    date_trunc('week', created_at)::date as week,
    event,
    count(*)                             as cnt
  from public.events
  where created_at >= now() - interval '12 weeks'
  group by 1, 2
  order by 1 desc, 3 desc;
$$;

-- ── Weekly new user signups (last 12 weeks) ───────────────────────────────────
-- Returns: week (Mon), new_users
create or replace function analytics_weekly_users()
returns table (week date, new_users bigint)
language sql security definer
as $$
  select
    date_trunc('week', created_at)::date as week,
    count(*)                             as new_users
  from public.profiles
  where created_at >= now() - interval '12 weeks'
  group by 1
  order by 1 desc;
$$;

-- ── Week-1 cohort retention ───────────────────────────────────────────────────
-- For each signup cohort week, how many users came back in the next week?
-- Returns: signup_week, cohort_size, returned_w1, retention_pct
create or replace function analytics_cohort_retention()
returns table (
  signup_week   date,
  cohort_size   bigint,
  returned_w1   bigint,
  retention_pct numeric
)
language sql security definer
as $$
  with signups as (
    select
      id as user_id,
      date_trunc('week', created_at)::date as signup_week
    from public.profiles
    where created_at >= now() - interval '12 weeks'
  ),
  w1_activity as (
    select distinct
      user_id,
      date_trunc('week', created_at)::date as active_week
    from public.events
  )
  select
    s.signup_week,
    count(distinct s.user_id)                                         as cohort_size,
    count(distinct a.user_id)                                         as returned_w1,
    round(
      count(distinct a.user_id)::numeric / nullif(count(distinct s.user_id),0) * 100,
      1
    )                                                                 as retention_pct
  from signups s
  left join w1_activity a
    on  a.user_id    = s.user_id
    and a.active_week = s.signup_week + interval '1 week'
  group by s.signup_week
  order by s.signup_week desc;
$$;

-- Grant execute to service role only (Edge Functions use service role)
grant execute on function analytics_weekly_events()    to service_role;
grant execute on function analytics_weekly_users()     to service_role;
grant execute on function analytics_cohort_retention() to service_role;

-- Revoke from public/anon (safety)
revoke execute on function analytics_weekly_events()    from public, anon, authenticated;
revoke execute on function analytics_weekly_users()     from public, anon, authenticated;
revoke execute on function analytics_cohort_retention() from public, anon, authenticated;
