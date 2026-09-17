-- School Buddy: a subject has exactly one teacher, school-wide.
--
-- Reality check: a school doesn't have teachers who teach every subject in a
-- class — it has one teacher per subject, who teaches that same subject
-- across many different classes (the Maths teacher teaches Maths to Class 9,
-- 10, and 11). `classes.teacher_id` already supported that shape (the same
-- teacher can appear on many classes rows for the same subject_id), but
-- nothing actually tied a subject to its one teacher as a fact — it just
-- happened to be true if everyone filled the form out consistently.
--
-- This adds subjects.teacher_id and a trigger that keeps classes.teacher_id
-- permanently in sync with it, so every existing helper/policy/query that
-- already reads classes.teacher_id (owns_class(), owns_class_group(), every
-- "my classes" query across both apps) keeps working completely unchanged —
-- the sync happens once, at the column, not by touching every call site.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0011_submissions.sql.

alter table public.subjects add column if not exists teacher_id uuid references public.profiles (id);

-- Backfill: one subject can only end up with one teacher now, so if a
-- subject was (inconsistently) used by classes with different teacher_ids,
-- pick the earliest one as the subject's official teacher.
update public.subjects s
set teacher_id = c.teacher_id
from (
  select distinct on (subject_id) subject_id, teacher_id
  from public.classes
  order by subject_id, created_at
) c
where c.subject_id = s.id and s.teacher_id is null;

-- Retroactively fix any existing classes row whose teacher_id didn't match
-- what we just decided is that subject's one real teacher.
update public.classes c
set teacher_id = s.teacher_id
from public.subjects s
where s.id = c.subject_id and s.teacher_id is not null and c.teacher_id is distinct from s.teacher_id;

-- trigger: classes.teacher_id always mirrors subjects.teacher_id -----------

create or replace function public.sync_class_teacher_from_subject()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select teacher_id into new.teacher_id from public.subjects where id = new.subject_id;
  return new;
end;
$$;

drop trigger if exists sync_class_teacher_from_subject on public.classes;
create trigger sync_class_teacher_from_subject
  before insert or update of subject_id on public.classes
  for each row
  execute function public.sync_class_teacher_from_subject();

-- RLS: a subject's teacher is fixed at creation, by a teacher, to themself -

drop policy if exists "Teachers can create subjects in their school" on public.subjects;
create policy "Teachers can create subjects in their school"
  on public.subjects for insert
  with check (
    school_id = public.current_school_id(auth.uid())
    and teacher_id = auth.uid()
    and public.is_teacher(auth.uid())
  );
