create table public.waitlist (
  id         bigint generated always as identity primary key,
  email      text not null unique check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source     text check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

create policy "join the waitlist"
  on public.waitlist for insert to anon, authenticated
  with check (true);
