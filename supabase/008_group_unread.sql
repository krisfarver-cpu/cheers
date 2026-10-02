-- Unread markers for groups. Run once in the Supabase SQL Editor.
alter table public.group_members add column if not exists last_read_at timestamptz not null default now();

-- Each person can move only their own read marker, and nothing else
create policy "update your own read marker"
  on public.group_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.group_members from authenticated, anon;
grant update (last_read_at) on public.group_members to authenticated;
