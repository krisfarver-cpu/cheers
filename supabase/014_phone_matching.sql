-- Find friends by phone number too. Run once in the Supabase SQL Editor.
-- Phones are only matched once verified by text (auth.users.phone_confirmed_at).
-- The phone sends one-way codes: SHA-256 of a lowercased email, or of a phone's digits with country code (e.g. 15551234567).
create or replace function public.match_contacts(hashes text[])
returns table (id uuid, username text, display_name text, avatar_url text, email_hash text, status text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  if coalesce(array_length(hashes, 1), 0) > 2000 then raise exception 'Too many contacts at once'; end if;

  return query
  select p.id, p.username, p.display_name, p.avatar_url,
    case when h.email_hash = any(hashes) then h.email_hash else h.phone_hash end,
    case
      when f.status = 'accepted' then 'friends'
      when f.requester_id = me then 'requested'
      when f.addressee_id = me then 'incoming'
      else 'none'
    end
  from auth.users u
  join public.profiles p on p.id = u.id
  cross join lateral (
    select encode(extensions.digest(lower(trim(u.email)), 'sha256'), 'hex') as email_hash,
           case when u.phone is not null and u.phone <> '' and u.phone_confirmed_at is not null
                then encode(extensions.digest(regexp_replace(u.phone, '\D', '', 'g'), 'sha256'), 'hex') end as phone_hash
  ) h
  left join public.friendships f
    on (f.requester_id = me and f.addressee_id = p.id) or (f.requester_id = p.id and f.addressee_id = me)
  where (h.email_hash = any(hashes) or h.phone_hash = any(hashes))
    and p.id <> me
    and p.discoverable
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = me and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = me)
    );
end;
$$;

revoke execute on function public.match_contacts(text[]) from public, anon;
grant execute on function public.match_contacts(text[]) to authenticated;
