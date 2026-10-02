-- CHEERS! named groups. Run once in the Supabase SQL Editor.

------------------------------------------------------------
-- GROUPS AND MEMBERS
------------------------------------------------------------
create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 40),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  added_by  uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

-- Helpers (security definer so policies can use them without looping back on themselves)
create function public.is_group_member(g uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members m where m.group_id = g and m.user_id = auth.uid());
$$;

create function public.group_size(g uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.group_members m where m.group_id = g;
$$;

create function public.is_group_creator(g uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.groups x where x.id = g and x.created_by = auth.uid());
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "members see their groups"
  on public.groups for select to authenticated using (public.is_group_member(id));
create policy "members rename their groups"
  on public.groups for update to authenticated
  using (public.is_group_member(id)) with check (public.is_group_member(id));

create policy "members see who is in the group"
  on public.group_members for select to authenticated using (public.is_group_member(group_id));
create policy "members add their friends"
  on public.group_members for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and public.is_group_member(group_id)
    and public.are_friends((select auth.uid()), user_id)
    and not public.blocked_with(user_id)
    and public.group_size(group_id) < 30
  );
create policy "leave, or the creator removes someone"
  on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_group_creator(group_id));

-- Create a group with friends in one step
create function public.create_group(group_name text, member_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  gid uuid;
  m uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if coalesce(array_length(member_ids, 1), 0) > 29 then raise exception 'Groups can have up to 30 people'; end if;
  insert into public.groups (name, created_by) values (trim(group_name), me) returning id into gid;
  insert into public.group_members (group_id, user_id, added_by) values (gid, me, me);
  foreach m in array coalesce(member_ids, '{}'::uuid[]) loop
    if m <> me and public.are_friends(me, m) and not public.blocked_with(m) then
      insert into public.group_members (group_id, user_id, added_by) values (gid, m, me) on conflict do nothing;
    end if;
  end loop;
  return gid;
end;
$$;
revoke execute on function public.create_group(text, uuid[]) from public, anon;
grant execute on function public.create_group(text, uuid[]) to authenticated;

------------------------------------------------------------
-- CHEERS! CAN NOW GO TO A FRIEND OR A GROUP
------------------------------------------------------------
alter table public.cheers alter column recipient_id drop not null;
alter table public.cheers add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.cheers add constraint cheers_one_target check ((recipient_id is null) <> (group_id is null));
create index if not exists cheers_group_idx on public.cheers (group_id, created_at desc);

create function public.is_valid_group_reply(reply uuid, g uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cheers o where o.id = reply and o.group_id = g);
$$;

drop policy "send cheers to friends only" on public.cheers;
create policy "send cheers to friends or groups"
  on public.cheers for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and photo_path like (select auth.uid())::text || '/%'
    and (
      (recipient_id is not null and group_id is null
        and public.are_friends(sender_id, recipient_id)
        and (reply_to_id is null or public.is_valid_reply(reply_to_id, recipient_id)))
      or
      (group_id is not null and recipient_id is null
        and public.is_group_member(group_id)
        and (reply_to_id is null or public.is_valid_group_reply(reply_to_id, group_id)))
    )
  );

drop policy "see cheers you sent or received" on public.cheers;
create policy "see cheers you sent, received, or in your groups"
  on public.cheers for select to authenticated
  using (
    sender_id = (select auth.uid())
    or (
      (recipient_id = (select auth.uid()) or (group_id is not null and public.is_group_member(group_id)))
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = (select auth.uid()) and b.blocked_id = cheers.sender_id
      )
    )
  );

------------------------------------------------------------
-- LIKES AND CHEERS! ON GROUP POSTS
------------------------------------------------------------
create table public.group_reactions (
  cheers_id  uuid not null references public.cheers(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('like', 'cheers')),
  created_at timestamptz not null default now(),
  primary key (cheers_id, user_id, kind)
);

create function public.cheers_group(c uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select group_id from public.cheers where id = c;
$$;

alter table public.group_reactions enable row level security;
create policy "members see reactions"
  on public.group_reactions for select to authenticated using (public.is_group_member(public.cheers_group(cheers_id)));
create policy "members react"
  on public.group_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_group_member(public.cheers_group(cheers_id)));
create policy "undo your own reaction"
  on public.group_reactions for delete to authenticated using (user_id = (select auth.uid()));

-- Live updates and notifications for group reactions
alter publication supabase_realtime add table public.group_reactions;
create trigger notify_group_reactions
  after insert on public.group_reactions
  for each row execute function public.notify_cheers_webhook();

------------------------------------------------------------
-- PHOTOS: group members can see photos posted in their groups
------------------------------------------------------------
drop policy "view photos you sent or received" on storage.objects;
create policy "view photos you sent, received, or in your groups"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'cheers-photos'
    and (
      (storage.foldername(objects.name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.cheers c
        where c.photo_path = objects.name
          and (c.recipient_id = (select auth.uid()) or (c.group_id is not null and public.is_group_member(c.group_id)))
      )
    )
  );
