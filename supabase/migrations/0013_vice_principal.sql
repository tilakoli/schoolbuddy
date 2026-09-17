-- School Buddy: Vice Principal role — "admin-lite".
--
-- A real school has a VP who oversees everything (all classes, rosters,
-- grades) and handles day-to-day teacher/student account management,
-- without holding the same irreversible power as Admin — e.g. deleting or
-- reassigning a whole Class stays admin-only, and a VP can never act on an
-- admin account (there's no UI to browse admin accounts at all today, for
-- either role, so this mostly guards direct API calls).
--
-- Run in Supabase Dashboard -> SQL Editor, after 0012_subject_teacher.sql.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'vice_principal', 'teacher', 'student'));

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
      when new.raw_user_meta_data ->> 'role' in ('admin', 'vice_principal', 'teacher', 'student')
        then new.raw_user_meta_data ->> 'role'
      else 'student'
    end,
    (select id from public.schools order by created_at limit 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- helper: admin OR vice_principal — "staff-level" view/manage access -------

create or replace function public.is_staff(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role in ('admin', 'vice_principal')
  );
$$;

-- RLS: widen the "view everything" policies from admin-only to staff -------

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_staff(auth.uid()));

drop policy if exists "Admins view all classes" on public.classes;
create policy "Admins view all classes"
  on public.classes for select
  using (public.is_staff(auth.uid()));

drop policy if exists "Admins view all enrollments" on public.enrollments;
create policy "Admins view all enrollments"
  on public.enrollments for select
  using (public.is_staff(auth.uid()));

drop policy if exists "Admins view all assignments" on public.assignments;
create policy "Admins view all assignments"
  on public.assignments for select
  using (public.is_staff(auth.uid()));

drop policy if exists "Admins view all schedule" on public.class_schedule;
create policy "Admins view all schedule"
  on public.class_schedule for select
  using (public.is_staff(auth.uid()));

drop policy if exists "Admins view all materials" on public.materials;
create policy "Admins view all materials"
  on public.materials for select
  using (public.is_staff(auth.uid()));

drop policy if exists "Admins view all materials in storage" on storage.objects;
create policy "Admins view all materials in storage"
  on storage.objects for select
  using (bucket_id = 'materials' and public.is_staff(auth.uid()));

drop policy if exists "Admins view all answer keys" on public.assignment_answer_keys;
create policy "Admins view all answer keys"
  on public.assignment_answer_keys for select
  using (public.is_staff(auth.uid()));

drop policy if exists "Admins view all submissions" on public.submissions;
create policy "Admins view all submissions"
  on public.submissions for select
  using (public.is_staff(auth.uid()));

-- A VP can also help set up a new Class (non-destructive); updating/deleting
-- a Class someone else teaches in stays admin-only — deliberately NOT
-- widened here, since that's the "most destructive" action a VP shouldn't have.
drop policy if exists "Teachers can create class groups in their school" on public.class_groups;
create policy "Teachers can create class groups in their school"
  on public.class_groups for insert
  with check (
    school_id = public.current_school_id(auth.uid())
    and (public.is_teacher(auth.uid()) or public.is_staff(auth.uid()))
  );
