-- School Buddy: account restriction flag for the admin UI.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0001_roles.sql.

alter table public.profiles
  add column if not exists restricted boolean not null default false;

-- No new RLS policy needed: `restricted` is already covered by the existing
-- "own profile" / "admins view all" select policies on public.profiles, and
-- is only ever written by the service-role client in
-- web/app/api/admin/set-restricted/route.ts (which bypasses RLS entirely) —
-- never by a regular client.
