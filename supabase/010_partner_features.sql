-- "New this week" cards for partner apps. Edit rows in Table Editor > partner_features.
create table if not exists public.partner_features (
  id         uuid primary key default gen_random_uuid(),
  partner    text not null default 'indianabev',
  title      text not null check (char_length(title) <= 60),
  body       text check (char_length(body) <= 140),
  link_url   text check (link_url is null or link_url ~ '^https://'),
  active     boolean not null default true,
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.partner_features enable row level security;

-- The app can read only what's live right now; changes are made in the dashboard
drop policy if exists "read live features" on public.partner_features;
create policy "read live features" on public.partner_features for select to authenticated
  using (active and now() >= starts_at and (ends_at is null or now() < ends_at));

insert into public.partner_features (title, body, link_url)
values ('See what’s new this week', 'Tap to explore the Indiana Beverage portfolio.', 'https://www.indianabev.com/');
