-- School Buddy: wipe all teacher/student accounts and everything tied to
-- them, for a clean slate before re-seeding.
--
-- Deliberately does NOT touch: admin/vice_principal accounts (so you don't
-- get locked out of your own login) or the schools table (the tenant
-- itself). Only teacher and student profiles/auth accounts are removed,
-- along with every row that belongs to the school's operational data
-- (subjects, classes, rosters, materials, assignments, submissions,
-- schedule) — none of which is ever owned by an admin/VP account anyway.
--
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run, and safe to run
-- even if you haven't applied every migration yet — each delete is skipped
-- if that table doesn't exist on this database.

-- 1. Content tables, children first so no foreign key blocks a later
-- delete. to_regclass(...) is null for a table that doesn't exist yet
-- (e.g. you're on an older migration), so that statement is just skipped
-- instead of erroring out.
do $$
begin
  if to_regclass('public.submissions') is not null then delete from public.submissions; end if;
  if to_regclass('public.assignment_answer_keys') is not null then delete from public.assignment_answer_keys; end if;
  if to_regclass('public.assignments') is not null then delete from public.assignments; end if;
  if to_regclass('public.materials') is not null then delete from public.materials; end if;
  if to_regclass('public.class_schedule') is not null then delete from public.class_schedule; end if;
  if to_regclass('public.enrollments') is not null then delete from public.enrollments; end if;
  if to_regclass('public.classes') is not null then delete from public.classes; end if;
  if to_regclass('public.subjects') is not null then delete from public.subjects; end if;
  if to_regclass('public.class_groups') is not null then delete from public.class_groups; end if;
  if to_regclass('public.ai_requests') is not null then delete from public.ai_requests; end if;
end $$;

-- 2. Teacher/student accounts. Captured into a temp table first, since
-- deleting auth.users cascades profiles away — if we queried
-- "profiles where role in (...)" again after that delete, there'd be
-- nothing left to match.
create temporary table _flush_target_users as
select id from public.profiles where role in ('teacher', 'student');

delete from auth.identities where user_id in (select id from _flush_target_users);
delete from auth.users where id in (select id from _flush_target_users);
-- profiles rows for these users are removed automatically via
-- "on delete cascade" from auth.users -> profiles (0001_roles.sql).

drop table _flush_target_users;

-- Verify:
-- select role, count(*) from public.profiles group by role;
-- select count(*) from public.subjects; select count(*) from public.class_groups;
