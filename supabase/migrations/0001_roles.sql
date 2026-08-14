-- School Buddy: role-based profiles (admin / teacher / student)
--
-- This repo has no Supabase CLI project linked, so run this once by hand:
-- Supabase Dashboard -> SQL Editor -> paste and run, against the project
-- referenced by EXPO_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'student' check (role in ('admin', 'teacher', 'student')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- security definer avoids RLS self-recursion when checking role from inside a policy.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

-- Auto-create a profile row whenever an admin provisions a new account
-- (Supabase Dashboard -> Authentication -> Users -> Add user). Set the "role"
-- field in that dialog's User Metadata JSON, e.g.
--   {"role": "teacher", "full_name": "Jane Doe"}
-- to set it at creation time; it defaults to "student" otherwise. This only
-- runs on INSERT, so a user later editing their own metadata client-side
-- cannot retroactively change their stored role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    case
      when new.raw_user_meta_data ->> 'role' in ('admin', 'teacher', 'student')
        then new.raw_user_meta_data ->> 'role'
      else 'student'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any accounts created before this migration ran.
insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  raw_user_meta_data ->> 'full_name',
  case
    when raw_user_meta_data ->> 'role' in ('admin', 'teacher', 'student')
      then raw_user_meta_data ->> 'role'
    else 'student'
  end
from auth.users
on conflict (id) do nothing;
