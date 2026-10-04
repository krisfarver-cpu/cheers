-- Partner insights: anonymous-in-reports usage counts for IB Cheers. Run once in the SQL Editor.

-- 1. App events (Find it taps, featured card views and taps). The app can add its own events but never read them.
create table if not exists public.analytics_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  partner    text not null default 'indianabev',
  event      text not null check (event in ('find_it_click', 'feature_view', 'feature_tap')),
  brand      text check (char_length(brand) <= 60),
  category   text check (char_length(category) <= 30),
  feature_id uuid,
  cheers_id  uuid
);
create index if not exists analytics_events_lookup on public.analytics_events (partner, event, created_at);
alter table public.analytics_events enable row level security;
drop policy if exists "log your own events" on public.analytics_events;
create policy "log your own events" on public.analytics_events for insert to authenticated
  with check (user_id = (select auth.uid()));

-- 2. Who may see a partner's insights. Managed only here in the dashboard.
create table if not exists public.partner_admins (
  user_id uuid not null references auth.users(id) on delete cascade,
  partner text not null,
  primary key (user_id, partner)
);
alter table public.partner_admins enable row level security;

-- 3. The report. Totals only; any brand, category, place, or link seen by fewer than min_people people is left out.
create or replace function public.partner_insights(p text default 'indianabev', days int default 30, min_people int default 5)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(days, 365)));
  k int := greatest(min_people, 3);
  out jsonb;
begin
  if not exists (select 1 from public.partner_admins a where a.user_id = auth.uid() and a.partner = p) then
    raise exception 'Not authorized to view these insights';
  end if;

  with drinks as (
    -- one row per shared drink: a photo sent to several friends counts once
    select distinct on (c.sender_id, c.photo_path)
      c.sender_id, c.created_at,
      nullif(trim(c.drink_brand), '') as brand, c.drink_category as category,
      nullif(trim(c.location_name), '') as place,
      coalesce(c.drink_brand is not null and public.is_partner_brand(c.drink_brand, p), false) as carried
    from public.cheers c
    where c.created_at >= since and (c.drink_category is not null or nullif(trim(c.drink_brand), '') is not null)
    order by c.sender_id, c.photo_path, c.created_at
  ),
  ev as (select * from public.analytics_events e where e.partner = p and e.created_at >= since)
  select jsonb_build_object(
    'since', since, 'min_people', k,
    'totals', (select jsonb_build_object(
        'tagged_drinks', count(*),
        'people', case when count(distinct sender_id) >= k then count(distinct sender_id) end,
        'carried_drinks', count(*) filter (where carried),
        'find_it_clicks', (select count(*) from ev where event = 'find_it_click')) from drinks),
    'brands', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'drinks', n, 'carried', carried) order by n desc), '[]')
               from (select max(brand) as name, count(*) as n, bool_or(carried) as carried from drinks
                     where brand is not null group by lower(brand) having count(distinct sender_id) >= k
                     order by count(*) desc limit 15) b),
    'categories', (select coalesce(jsonb_agg(jsonb_build_object('name', category, 'drinks', n) order by n desc), '[]')
               from (select category, count(*) as n from drinks where category is not null
                     group by category having count(distinct sender_id) >= k) x),
    'places', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'drinks', n) order by n desc), '[]')
               from (select max(place) as name, count(*) as n from drinks where place is not null
                     group by lower(place) having count(distinct sender_id) >= k order by count(*) desc limit 10) x),
    'weeks', (select coalesce(jsonb_agg(jsonb_build_object('week', wk, 'drinks', n) order by wk), '[]')
               from (select date_trunc('week', created_at)::date as wk, count(*) as n from drinks group by 1) x),
    'weekdays', (select coalesce(jsonb_agg(jsonb_build_object('dow', d, 'drinks', n) order by d), '[]')
               from (select extract(dow from created_at at time zone 'America/Chicago')::int as d, count(*) as n from drinks group by 1) x),
    'find_it', (select coalesce(jsonb_agg(jsonb_build_object('brand', name, 'clicks', n, 'people', u) order by n desc), '[]')
               from (select max(brand) as name, count(*) as n, count(distinct user_id) as u from ev
                     where event = 'find_it_click' and brand is not null group by lower(brand)
                     having count(distinct user_id) >= k order by count(*) desc limit 15) x),
    'features', (select coalesce(jsonb_agg(jsonb_build_object('title', f.title, 'viewers', v.viewers, 'taps', v.taps) order by f.created_at desc), '[]')
               from public.partner_features f
               join (select feature_id, count(distinct user_id) filter (where event = 'feature_view') as viewers,
                            count(*) filter (where event = 'feature_tap') as taps
                     from ev where feature_id is not null group by feature_id) v on v.feature_id = f.id
               where f.partner = p and v.viewers >= k)
  ) into out;
  return out;
end;
$$;
revoke execute on function public.partner_insights(text, int, int) from public, anon;
grant execute on function public.partner_insights(text, int, int) to authenticated;
