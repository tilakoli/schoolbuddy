-- School Buddy: class/subject/roster structure moves to admin control.
--
-- A teacher now has exactly one subject (0012_subject_teacher.sql), taught
-- across whichever classes admin assigns it to. Teachers stopped being the
-- ones who create classes, attach a subject to one, manage the roster, or
-- delete a class — that's all structural/administrative now. A teacher's
-- remaining scope is exactly what they still fully own per subject
-- offering: materials, assignments/tests, and grading (unchanged, still
-- owns_class()-gated) — plus read-only visibility into the roster.
--
-- Vice principals get the same "admin-lite" split established in
-- 0013_vice_principal.sql: operational/reversible actions (create a class,
-- assign a subject to it, manage the roster) go to is_staff() (admin + VP);
-- the irreversible one (deleting a class, which cascades through its
-- roster/subjects/assignments/materials) stays is_admin()-only.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0014_ai_rate_limits.sql.

-- class_groups --------------------------------------------------------------

drop policy if exists "Teachers can create class groups in their school" on public.class_groups;
create policy "Staff can create class groups in their school"
  on public.class_groups for insert
  with check (
    school_id = public.current_school_id(auth.uid())
    and public.is_staff(auth.uid())
  );

drop policy if exists "Teachers manage class groups they teach in" on public.class_groups;
create policy "Admins update class groups"
  on public.class_groups for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Teachers delete class groups they teach in" on public.class_groups;
create policy "Admins delete class groups"
  on public.class_groups for delete
  using (public.is_admin(auth.uid()));

-- classes (subject offerings) ------------------------------------------------
-- Was one `for all` policy keyed on teacher_id = auth.uid(); split so a
-- teacher keeps read access to their own offering (needed for materials/
-- assignments/schedule, all scoped off this same table) but structural
-- writes (attaching/detaching a subject to a class) move to staff.

drop policy if exists "Teachers manage own classes" on public.classes;

create policy "Teachers view own classes"
  on public.classes for select
  using (teacher_id = auth.uid());

create policy "Staff manage classes"
  on public.classes for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- enrollments -----------------------------------------------------------
-- Was one `for all` policy keyed on owns_class_group(); split so a teacher
-- keeps read access to the roster of classes they teach in (view-only) but
-- adding/removing a student moves to staff.

drop policy if exists "Teachers manage enrollments in own class groups" on public.enrollments;

create policy "Teachers view roster of own class groups"
  on public.enrollments for select
  using (public.owns_class_group(class_group_id, auth.uid()));

create policy "Staff manage enrollments"
  on public.enrollments for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));
