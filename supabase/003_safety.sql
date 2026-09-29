-- CHEERS! safety features: blocking, reporting.
-- Run this in the SQL Editor after the earlier files.

------------------------------------------------------------
-- BLOCKS
------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "see people you blocked"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "unblock people"
  on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));
-- New blocks go through block_user() below so the friendship is removed at the same time.

-- True if you and `other` have blocked each other in either direction
create function public.blocked_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = auth.uid())
  );
$$;

create function public.block_user(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  if target = me then raise exception 'You can''t block yourself'; end if;

  insert into public.blocks (blocker_id, blocked_id) values (me, target)
  on conflict do nothing;

  -- Ends the friendship and any pending request, so no more CHEERS! either way
  delete from public.friendships
  where (requester_id = me and addressee_id = target)
     or (requester_id = target and addressee_id = me);
end;
$$;

revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
revoke execute on function public.blocked_with(uuid) from public, anon;
grant execute on function public.blocked_with(uuid) to authenticated;

-- Blocked people can't send friend requests
drop policy "send friend requests" on public.friendships;
create policy "send friend requests"
  on public.friendships for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and not public.blocked_with(addressee_id)
  );

-- Hide CHEERS! from people you've blocked
drop policy "see cheers you sent or received" on public.cheers;
create policy "see cheers you sent or received"
  on public.cheers for select to authenticated
  using (
    sender_id = (select auth.uid())
    or (
      recipient_id = (select auth.uid())
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = (select auth.uid()) and b.blocked_id = cheers.sender_id
      )
    )
  );

------------------------------------------------------------
-- REPORTS (review these in Table Editor > reports)
------------------------------------------------------------
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid default auth.uid() references public.profiles(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  cheers_id        uuid references public.cheers(id) on delete set null,
  photo_path       text,
  reason           text not null check (reason in ('nudity', 'harassment', 'violence', 'underage', 'spam', 'other')),
  details          text check (char_length(details) <= 500),
  status           text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at       timestamptz not null default now()
);

create index reports_open_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

-- People can file reports but never read them; you review them in the dashboard
create policy "file a report"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
