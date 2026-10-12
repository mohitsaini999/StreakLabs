-- Run this in the Supabase SQL Editor after schema.sql.
-- The existing "default" row is claimed by the first account that signs in.

alter table public.app_state
  drop constraint if exists app_state_singleton_id;

alter table public.app_state enable row level security;

revoke all on table public.app_state from anon;
grant select, insert, update on table public.app_state to authenticated;

drop policy if exists "Users can read their own app state" on public.app_state;
drop policy if exists "Users can create their own app state" on public.app_state;
drop policy if exists "Users can update their own app state" on public.app_state;

create policy "Users can read their own app state"
  on public.app_state
  for select
  to authenticated
  using (id = (select auth.uid())::text);

create policy "Users can create their own app state"
  on public.app_state
  for insert
  to authenticated
  with check (id = (select auth.uid())::text);

create policy "Users can update their own app state"
  on public.app_state
  for update
  to authenticated
  using (id = (select auth.uid())::text)
  with check (id = (select auth.uid())::text);
