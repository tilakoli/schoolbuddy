-- School Buddy: AI-generated (multiple-choice) tests from uploaded materials.
--
-- `assignments.questions` holds the public question content — prompt +
-- options, no correct answer — so it's safe for students to read via the
-- same row-level policies assignments already has. The correct answers live
-- in a separate `assignment_answer_keys` table with NO student-facing
-- policy at all (default-deny), so a student can never read them, even via
-- `select('*')` on assignments — Postgres RLS is per-row, not per-column,
-- so keeping the answer key in its own table is what actually enforces
-- this, not just hiding the field in the UI.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0009_class_groups.sql.

alter table public.assignments add column if not exists questions jsonb;
alter table public.assignments add column if not exists pass_score integer;
alter table public.assignments add column if not exists source_material_ids uuid[];

create table if not exists public.assignment_answer_keys (
  assignment_id uuid primary key references public.assignments (id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.assignment_answer_keys enable row level security;

drop policy if exists "Teachers manage answer keys for own classes" on public.assignment_answer_keys;
create policy "Teachers manage answer keys for own classes"
  on public.assignment_answer_keys for all
  using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_answer_keys.assignment_id and public.owns_class(a.class_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_answer_keys.assignment_id and public.owns_class(a.class_id, auth.uid())
    )
  );

drop policy if exists "Admins view all answer keys" on public.assignment_answer_keys;
create policy "Admins view all answer keys"
  on public.assignment_answer_keys for select
  using (public.is_admin(auth.uid()));
