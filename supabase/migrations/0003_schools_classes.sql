-- School Buddy: schools (multi-tenant foundation), classes, enrollments, assignments.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0001_roles.sql and 0002_account_management.sql.
--
-- All tables are created first, then RLS is enabled and policies are added —
-- classes/enrollments policies reference each other, so both tables must
-- already exist before either policy set is created.

-- tables --------------------------------------------------------------------

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  subject text,
  period text,
  room text,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  description text,
  assessment_type text not null default 'homework' check (assessment_type in ('homework', 'test', 'discussion', 'revision')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'expert')),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

-- default school + profiles.school_id ----------------------------------

insert into public.schools (name)
select 'School Buddy Academy'
where not exists (select 1 from public.schools);

alter table public.profiles add column if not exists school_id uuid references public.schools (id);

update public.profiles
set school_id = (select id from public.schools order by created_at limit 1)
where school_id is null;

alter table public.profiles alter column school_id set not null;

-- helper functions ------------------------------------------------------

create or replace function public.is_teacher(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'teacher'
  );
$$;

create or replace function public.current_school_id(uid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select school_id from public.profiles where id = uid;
$$;

-- update handle_new_user to also stamp school_id ------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    case
      when new.raw_user_meta_data ->> 'role' in ('admin', 'teacher', 'student')
        then new.raw_user_meta_data ->> 'role'
      else 'student'
    end,
    (select id from public.schools order by created_at limit 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- RLS: profiles ---------------------------------------------------------

-- teachers can see students in their own school, to build a class roster
drop policy if exists "Teachers can view students in their school" on public.profiles;
create policy "Teachers can view students in their school"
  on public.profiles for select
  using (
    role = 'student'
    and public.is_teacher(auth.uid())
    and school_id = public.current_school_id(auth.uid())
  );

-- RLS: schools ------------------------------------------------------------

alter table public.schools enable row level security;

drop policy if exists "Authenticated users can view schools" on public.schools;
create policy "Authenticated users can view schools"
  on public.schools for select
  using (auth.role() = 'authenticated');

-- RLS: classes --------------------------------------------------------------

alter table public.classes enable row level security;

drop policy if exists "Teachers manage own classes" on public.classes;
create policy "Teachers manage own classes"
  on public.classes for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "Students view enrolled classes" on public.classes;
create policy "Students view enrolled classes"
  on public.classes for select
  using (
    exists (
      select 1 from public.enrollments
      where enrollments.class_id = classes.id and enrollments.student_id = auth.uid()
    )
  );

drop policy if exists "Admins view all classes" on public.classes;
create policy "Admins view all classes"
  on public.classes for select
  using (public.is_admin(auth.uid()));

-- RLS: enrollments ------------------------------------------------------

alter table public.enrollments enable row level security;

drop policy if exists "Teachers manage enrollments in own classes" on public.enrollments;
create policy "Teachers manage enrollments in own classes"
  on public.enrollments for all
  using (exists (select 1 from public.classes where classes.id = enrollments.class_id and classes.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classes where classes.id = enrollments.class_id and classes.teacher_id = auth.uid()));

drop policy if exists "Students view own enrollments" on public.enrollments;
create policy "Students view own enrollments"
  on public.enrollments for select
  using (student_id = auth.uid());

drop policy if exists "Admins view all enrollments" on public.enrollments;
create policy "Admins view all enrollments"
  on public.enrollments for select
  using (public.is_admin(auth.uid()));

-- RLS: assignments --------------------------------------------------------

alter table public.assignments enable row level security;

drop policy if exists "Teachers manage assignments in own classes" on public.assignments;
create policy "Teachers manage assignments in own classes"
  on public.assignments for all
  using (exists (select 1 from public.classes where classes.id = assignments.class_id and classes.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classes where classes.id = assignments.class_id and classes.teacher_id = auth.uid()));

drop policy if exists "Students view assignments in enrolled classes" on public.assignments;
create policy "Students view assignments in enrolled classes"
  on public.assignments for select
  using (
    exists (
      select 1 from public.enrollments
      where enrollments.class_id = assignments.class_id and enrollments.student_id = auth.uid()
    )
  );

drop policy if exists "Admins view all assignments" on public.assignments;
create policy "Admins view all assignments"
  on public.assignments for select
  using (public.is_admin(auth.uid()));
