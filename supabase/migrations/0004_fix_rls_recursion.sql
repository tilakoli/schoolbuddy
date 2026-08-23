-- School Buddy: fix infinite RLS recursion between classes/enrollments/assignments.
--
-- Bug: "Students view enrolled classes" (on classes) queries enrollments, and
-- "Teachers manage enrollments in own classes" (on enrollments) queries
-- classes right back — Postgres evaluates RLS on every nested query, so this
-- recurses forever ("infinite recursion detected in policy for relation
-- classes"). Same class of bug 0001_roles.sql already solved for profiles.role
-- via is_admin() — the fix is the same: security definer helper functions
-- that bypass RLS internally, breaking the cycle.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0003_schools_classes.sql.

create or replace function public.owns_class(cid uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.classes where id = cid and teacher_id = uid
  );
$$;

create or replace function public.is_enrolled(cid uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.enrollments where class_id = cid and student_id = uid
  );
$$;

-- classes: replace the enrollments-referencing policy
drop policy if exists "Students view enrolled classes" on public.classes;
create policy "Students view enrolled classes"
  on public.classes for select
  using (public.is_enrolled(id, auth.uid()));

-- enrollments: replace the classes-referencing policy
drop policy if exists "Teachers manage enrollments in own classes" on public.enrollments;
create policy "Teachers manage enrollments in own classes"
  on public.enrollments for all
  using (public.owns_class(class_id, auth.uid()))
  with check (public.owns_class(class_id, auth.uid()));

-- assignments: replace both classes- and enrollments-referencing policies
drop policy if exists "Teachers manage assignments in own classes" on public.assignments;
create policy "Teachers manage assignments in own classes"
  on public.assignments for all
  using (public.owns_class(class_id, auth.uid()))
  with check (public.owns_class(class_id, auth.uid()));

drop policy if exists "Students view assignments in enrolled classes" on public.assignments;
create policy "Students view assignments in enrolled classes"
  on public.assignments for select
  using (public.is_enrolled(class_id, auth.uid()));
