-- Run this in the SQL Editor after schema.sql.
-- Lets the sign-up screen check whether a username is taken before an account exists.
create function public.username_available(name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where username = lower(name));
$$;

grant execute on function public.username_available(text) to anon, authenticated;
