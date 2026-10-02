-- "What are you drinking?" tags. Run once in the Supabase SQL Editor.
alter table public.cheers add column if not exists drink_category text check (char_length(drink_category) <= 30);
alter table public.cheers add column if not exists drink_brand text check (char_length(drink_brand) <= 60);
