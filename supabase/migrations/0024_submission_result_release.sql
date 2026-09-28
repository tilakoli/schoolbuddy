begin;

-- Row policies cannot hide individual columns. Students therefore lose direct
-- access to active/cancelled submission rows and use get_my_submissions(),
-- which masks all result fields until the assignment has effectively ended.
drop policy if exists "Students view own submissions" on public.submissions;
create policy "Students view released own submissions"
  on public.submissions for select
  using (
    student_id = auth.uid()
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and (a.status = 'ended' or (a.status = 'active' and a.due_at is not null and a.due_at <= now()))
    )
  );

create or replace function public.get_my_submissions(p_assignment_id uuid default null)
returns setof public.submissions
language sql
security definer
set search_path = public
stable
as $$
  select
    s.id,
    s.assignment_id,
    s.student_id,
    s.answers,
    case when released.ok then s.score else null end,
    case when released.ok then s.max_score else null end,
    case when released.ok then s.passed else null end,
    case when released.ok then s.status else 'submitted' end,
    case when released.ok then s.feedback else null end,
    s.submitted_at,
    case when released.ok then s.graded_at else null end,
    case when released.ok then s.graded_by else null end,
    case when released.ok then s.rubric_scores else null end
  from public.submissions s
  join public.assignments a on a.id = s.assignment_id
  cross join lateral (
    select a.status = 'ended'
      or (a.status = 'active' and a.due_at is not null and a.due_at <= now()) as ok
  ) released
  join public.profiles me on me.id = auth.uid()
  where s.student_id = auth.uid()
    and me.role = 'student'
    and not me.restricted
    and (p_assignment_id is null or s.assignment_id = p_assignment_id);
$$;

revoke all on function public.get_my_submissions(uuid) from public, anon;
grant execute on function public.get_my_submissions(uuid) to authenticated;

commit;
