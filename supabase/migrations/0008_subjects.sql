-- School Buddy: promote classes.subject from free text to a real subjects
-- catalog (per school), so it's consistent/filterable instead of prone to
-- "Math" vs "Mathematics" vs "math" drift. Assignments and materials don't
-- get their own subject_id — they already inherit a trustworthy subject
-- transitively via class_id -> classes.subject_id, so a separate field on
-- either would risk silently disagreeing with its own class's subject.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0007_materials.sql.

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

alter table public.subjects enable row level security;

drop policy if exists "Users can view subjects in their school" on public.subjects;
create policy "Users can view subjects in their school"
  on public.subjects for select
  using (school_id = public.current_school_id(auth.uid()));

drop policy if exists "Teachers can create subjects in their school" on public.subjects;
create policy "Teachers can create subjects in their school"
  on public.subjects for insert
  with check (
    school_id = public.current_school_id(auth.uid())
    and (public.is_teacher(auth.uid()) or public.is_admin(auth.uid()))
  );

-- classes.subject_id --------------------------------------------------------

alter table public.classes add column if not exists subject_id uuid references public.subjects (id);

-- Backfill: one subjects row per distinct (school, subject text) pair that
-- actually exists today, then point each class at it.
insert into public.subjects (school_id, name)
select distinct school_id, subject
from public.classes
where subject is not null and trim(subject) <> ''
on conflict (school_id, name) do nothing;

update public.classes c
set subject_id = s.id
from public.subjects s
where s.school_id = c.school_id and s.name = c.subject and c.subject_id is null;

alter table public.classes drop column if exists subject;
