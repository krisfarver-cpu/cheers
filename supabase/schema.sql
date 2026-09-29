-- CHEERS! database schema
-- Paste this whole file into Supabase Dashboard > SQL Editor and run it once.

------------------------------------------------------------
-- PROFILES (one per user, created automatically at sign-up)
------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any signed-in user can look up profiles (needed to find friends by username)
create policy "profiles are visible to signed-in users"
  on public.profiles for select to authenticated using (true);

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(lower(new.raw_user_meta_data->>'username'),
             'user_' || substr(replace(new.id::text, '-', ''), 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'New friend')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- PUSH TOKENS (private to each user)
------------------------------------------------------------
create table public.push_tokens (
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "users manage their own push tokens"
  on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

------------------------------------------------------------
-- FRIENDSHIPS
------------------------------------------------------------
create type public.friend_status as enum ('pending', 'accepted');

create table public.friendships (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       public.friend_status not null default 'pending',
  created_at   timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Only one friendship row per pair, no matter who asked first
create unique index friendships_one_per_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friendships enable row level security;

create policy "see friendships you are part of"
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "send friend requests"
  on public.friendships for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');

create policy "accept requests sent to you"
  on public.friendships for update to authenticated
  using (addressee_id = (select auth.uid()))
  with check (addressee_id = (select auth.uid()) and status = 'accepted');

create policy "remove friendships you are part of"
  on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

------------------------------------------------------------
-- CHEERS (the historical log)
------------------------------------------------------------
create table public.cheers (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  recipient_id    uuid not null references public.profiles(id) on delete cascade,
  photo_path      text not null,
  location_name   text check (char_length(location_name) <= 80),
  created_at      timestamptz not null default now(),
  opened_at       timestamptz,
  liked_at        timestamptz,
  cheered_back_at timestamptz,
  check (sender_id <> recipient_id)
);

create index cheers_recipient_idx on public.cheers (recipient_id, created_at desc);
create index cheers_sender_idx    on public.cheers (sender_id, created_at desc);

alter table public.cheers enable row level security;

create policy "see cheers you sent or received"
  on public.cheers for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

create policy "send cheers to friends only"
  on public.cheers for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.are_friends(sender_id, recipient_id)
    and photo_path like (select auth.uid())::text || '/%'
  );

create policy "recipient can react"
  on public.cheers for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- Recipients may only change the reaction columns, never the photo or sender
revoke update on public.cheers from authenticated, anon;
grant update (opened_at, liked_at, cheered_back_at) on public.cheers to authenticated;

-- Live updates in the app
alter publication supabase_realtime add table public.cheers;

------------------------------------------------------------
-- PHOTO STORAGE (private bucket; files live under <sender_id>/...)
------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('cheers-photos', 'cheers-photos', false)
on conflict (id) do nothing;

create policy "upload into your own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cheers-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "view photos you sent or received"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'cheers-photos'
    and (
      (storage.foldername(objects.name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.cheers c
        where c.photo_path = objects.name
          and c.recipient_id = (select auth.uid())
      )
    )
  );
