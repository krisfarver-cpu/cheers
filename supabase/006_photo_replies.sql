-- CHEERS! back with a photo. Run in the Supabase SQL Editor.
alter table public.cheers add column if not exists reply_to_id uuid references public.cheers(id) on delete set null;
create index if not exists cheers_reply_to_idx on public.cheers (reply_to_id);

-- A reply must answer a CHEERS! that the recipient sent to you
drop policy "send cheers to friends only" on public.cheers;
create policy "send cheers to friends only"
  on public.cheers for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.are_friends(sender_id, recipient_id)
    and photo_path like (select auth.uid())::text || '/%'
    and (
      reply_to_id is null
      or exists (
        select 1 from public.cheers o
        where o.id = reply_to_id
          and o.recipient_id = (select auth.uid())
          and o.sender_id = recipient_id
      )
    )
  );
