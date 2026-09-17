-- School Buddy: student submissions + grading.
--
-- A submission ties one student to one assignment, one row each (no
-- resubmitting once graded — matches "you can't change your answers after
-- turning in a test"). For an AI-generated MCQ test (assignments.questions
-- is set), the score is computed server-side the moment the student submits
-- (POST /api/submissions/submit), by comparing their answers against
-- assignment_answer_keys — which has no student-facing RLS policy at all,
-- so that comparison can only ever happen server-side, never in the client.
-- A plain teacher-authored assignment (no questions) just takes a freeform
-- text answer and sits as 'submitted' until a teacher manually scores it.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0010_assignment_generation.sql.

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb,
  score numeric,
  max_score numeric,
  passed boolean,
  status text not null default 'submitted' check (status in ('submitted', 'graded')),
  feedback text,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  graded_by uuid references public.profiles (id),
  unique (assignment_id, student_id)
);

alter table public.submissions enable row level security;

-- helper functions -----------------------------------------------------

create or replace function public.owns_submission_class(aid uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = aid and public.owns_class(a.class_id, uid)
  );
$$;

create or replace function public.is_enrolled_in_assignment(aid uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = aid and public.is_enrolled(a.class_id, uid)
  );
$$;

-- RLS ---------------------------------------------------------------------

drop policy if exists "Students insert own submissions" on public.submissions;
create policy "Students insert own submissions"
  on public.submissions for insert
  with check (student_id = auth.uid() and public.is_enrolled_in_assignment(assignment_id, auth.uid()));

drop policy if exists "Students view own submissions" on public.submissions;
create policy "Students view own submissions"
  on public.submissions for select
  using (student_id = auth.uid());

drop policy if exists "Teachers view submissions for own classes" on public.submissions;
create policy "Teachers view submissions for own classes"
  on public.submissions for select
  using (public.owns_submission_class(assignment_id, auth.uid()));

drop policy if exists "Teachers grade submissions for own classes" on public.submissions;
create policy "Teachers grade submissions for own classes"
  on public.submissions for update
  using (public.owns_submission_class(assignment_id, auth.uid()))
  with check (public.owns_submission_class(assignment_id, auth.uid()));

drop policy if exists "Admins view all submissions" on public.submissions;
create policy "Admins view all submissions"
  on public.submissions for select
  using (public.is_admin(auth.uid()));
