-- School Buddy: split "class" into two levels.
--
-- Until now, one `classes` row bundled subject + teacher + period + room +
-- its own roster, so two subjects for the same physical group of students
-- (e.g. Class 9's Maths and Science) showed up as two unrelated rows with
-- duplicate names and duplicate rosters. This adds `class_groups` — the
-- shared-roster "Class 9" — and makes `classes` rows subject offerings
-- within a group (still owning their own teacher/period/room/assignments/
-- materials/schedule, per the existing "don't duplicate subject on
-- children" principle from 0008_subjects.sql).
--
-- Existing same-named classes in the same school are auto-merged into one
-- group (their rosters are unioned); any teacher who teaches a subject in a
-- group can manage its shared roster.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0008_subjects.sql.

create table if not exists public.class_groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

alter table public.class_groups enable row level security;

-- classes.class_group_id -------------------------------------------------

alter table public.classes add column if not exists class_group_id uuid;

-- Backfill: one class_groups row per distinct (school, class name) pair —
-- this is the auto-merge. Two existing classes named "Class 9" in the same
-- school, even taught by different teachers, become one shared Class.
insert into public.class_groups (school_id, name)
select distinct school_id, name
from public.classes
on conflict (school_id, name) do nothing;

update public.classes c
set class_group_id = g.id
from public.class_groups g
where g.school_id = c.school_id and g.name = c.name and c.class_group_id is null;

alter table public.classes alter column class_group_id set not null;

-- on delete cascade so deleting a Class removes its subject offerings (and,
-- via their own existing cascades, assignments/materials/schedule) — needed
-- so a teacher can delete a whole Class from the app.
alter table public.classes drop constraint if exists classes_class_group_id_fkey;
alter table public.classes add constraint classes_class_group_id_fkey
  foreign key (class_group_id) references public.class_groups (id) on delete cascade;

-- Now that the group carries the "Class 9" identity, a subject offering's
-- own name is redundant — collapse it to the subject name so every existing
-- `classes(name)` join across the app (assignments list, timetable, ...)
-- automatically shows "Maths" / "Science" instead of two identical
-- "Class 9" labels, with no changes needed at those call sites.
update public.classes c
set name = s.name
from public.subjects s
where s.id = c.subject_id;

-- enrollments.class_group_id ---------------------------------------------

alter table public.enrollments add column if not exists class_group_id uuid;

-- Guarded: safe to re-run after class_id has already been dropped below by
-- an earlier successful run of this migration.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollments' and column_name = 'class_id'
  ) then
    update public.enrollments e
    set class_group_id = c.class_group_id
    from public.classes c
    where c.id = e.class_id and e.class_group_id is null;
  end if;
end $$;

-- Merging duplicate classes into one group can produce duplicate
-- (class_group_id, student_id) pairs (the same student enrolled in both old
-- "Class 9" rows) — collapse those before enforcing the new unique
-- constraint below.
delete from public.enrollments e
using public.enrollments e2
where e.class_group_id = e2.class_group_id
  and e.student_id = e2.student_id
  and e.id > e2.id;

-- Drop the old policy before dropping class_id — it references the column.
drop policy if exists "Teachers manage enrollments in own classes" on public.enrollments;

alter table public.enrollments drop constraint if exists enrollments_class_id_student_id_key;
alter table public.enrollments drop constraint if exists enrollments_class_group_student_unique;
alter table public.enrollments add constraint enrollments_class_group_student_unique unique (class_group_id, student_id);
alter table public.enrollments drop column if exists class_id;
alter table public.enrollments alter column class_group_id set not null;

-- on delete cascade so deleting a Class removes its roster too.
alter table public.enrollments drop constraint if exists enrollments_class_group_id_fkey;
alter table public.enrollments add constraint enrollments_class_group_id_fkey
  foreign key (class_group_id) references public.class_groups (id) on delete cascade;

-- helper functions --------------------------------------------------------
-- Defined only now that classes.class_group_id and enrollments.class_group_id
-- both exist — Postgres validates column references in `language sql`
-- function bodies at CREATE FUNCTION time, so these must come after the
-- columns they query.

create or replace function public.owns_class_group(gid uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.classes where class_group_id = gid and teacher_id = uid
  );
$$;

-- is_enrolled(cid, uid) used to check enrollments.class_id directly. Now
-- that enrollments key off the shared class_group instead of the subject
-- offering, resolve through classes.class_group_id so every existing caller
-- (assignments/schedule/materials RLS, all keyed by classes.id) keeps
-- working unchanged.
create or replace function public.is_enrolled(cid uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.classes c
    join public.enrollments e on e.class_group_id = c.class_group_id
    where c.id = cid and e.student_id = uid
  );
$$;

-- RLS: class_groups -------------------------------------------------------

drop policy if exists "Users can view class groups in their school" on public.class_groups;
create policy "Users can view class groups in their school"
  on public.class_groups for select
  using (school_id = public.current_school_id(auth.uid()));

drop policy if exists "Teachers can create class groups in their school" on public.class_groups;
create policy "Teachers can create class groups in their school"
  on public.class_groups for insert
  with check (
    school_id = public.current_school_id(auth.uid())
    and (public.is_teacher(auth.uid()) or public.is_admin(auth.uid()))
  );

drop policy if exists "Teachers manage class groups they teach in" on public.class_groups;
create policy "Teachers manage class groups they teach in"
  on public.class_groups for update
  using (public.owns_class_group(id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_class_group(id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "Teachers delete class groups they teach in" on public.class_groups;
create policy "Teachers delete class groups they teach in"
  on public.class_groups for delete
  using (public.owns_class_group(id, auth.uid()) or public.is_admin(auth.uid()));

-- RLS: enrollments (re-key from class_id to class_group_id; any teacher who
-- teaches a subject in the group can manage its shared roster) ------------

drop policy if exists "Teachers manage enrollments in own class groups" on public.enrollments;
create policy "Teachers manage enrollments in own class groups"
  on public.enrollments for all
  using (public.owns_class_group(class_group_id, auth.uid()))
  with check (public.owns_class_group(class_group_id, auth.uid()));
