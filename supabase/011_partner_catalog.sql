-- Partner settings and brand catalog. Run once in the Supabase SQL Editor.
-- Edit in Table Editor: partner_settings (one row per partner) and partner_brands (import a CSV).

create table if not exists public.partner_settings (
  partner     text primary key,
  -- "Find it" link. Put {brand} in it to drop in the drink's brand, e.g. https://example.com/search?q={brand}
  find_it_url text check (find_it_url is null or find_it_url ~ '^https://'),
  updated_at  timestamptz not null default now()
);
alter table public.partner_settings enable row level security;
drop policy if exists "read partner settings" on public.partner_settings;
create policy "read partner settings" on public.partner_settings for select to authenticated using (true);
insert into public.partner_settings (partner, find_it_url)
values ('indianabev', 'https://www.indianabev.com/') on conflict (partner) do nothing;

create table if not exists public.partner_brands (
  id         uuid primary key default gen_random_uuid(),
  partner    text not null default 'indianabev',
  name       text not null check (char_length(name) between 1 and 60),
  category   text check (char_length(category) <= 30),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists partner_brands_unique on public.partner_brands (partner, lower(name));
alter table public.partner_brands enable row level security;
drop policy if exists "read active brands" on public.partner_brands;
create policy "read active brands" on public.partner_brands for select to authenticated using (active);
