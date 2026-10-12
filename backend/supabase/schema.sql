-- StreakLabs' first Supabase persistence table.
-- This stores one shared app state document for the current single-user prototype.
-- Add authentication and per-user tables/policies before making the API public.

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint app_state_singleton_id check (id = 'default')
);

alter table public.app_state enable row level security;

-- The backend connects with SUPABASE_SECRET_KEY. It is kept on the server and
-- receives service_role access. Browser roles receive no access to this table.
revoke all on table public.app_state from anon, authenticated;
grant all on table public.app_state to service_role;
