-- Apply before deploying the updated submission endpoint.
begin;
drop policy if exists "Students insert own submissions" on public.submissions;
revoke insert on public.submissions from anon, authenticated;

create or replace function public.submit_assignment(p_assignment_id uuid, p_answers jsonb)
returns public.submissions
language plpgsql security definer set search_path = public
as $$
declare
  caller uuid := auth.uid();
  a public.assignments;
  result public.submissions;
  question jsonb;
  answer jsonb;
  answer_key jsonb;
  correct_answer jsonb;
  question_count integer;
  total integer := 0;
  selected integer;
begin
  if caller is null or not exists (
    select 1 from public.profiles where id = caller and role = 'student' and not restricted
  ) then
    raise exception 'Only active students can submit assignments.' using errcode = '42501';
  end if;
  -- Prevent teacher changes racing with validation and scoring.
  select * into a from public.assignments where id = p_assignment_id for share;
  if not found or not public.is_enrolled_in_assignment(p_assignment_id, caller)
    or not exists (select 1 from public.classes c join public.profiles p on p.id = caller
      where c.id = a.class_id and c.school_id = p.school_id) then
    raise exception 'Assignment not found or not enrolled.' using errcode = '42501';
  end if;
  if a.status <> 'active' or (a.due_at is not null and a.due_at <= clock_timestamp()) then
    raise exception 'This assignment is no longer accepting submissions.' using errcode = '22023';
  end if;
  if exists (select 1 from public.submissions where assignment_id = a.id and student_id = caller) then
    raise exception 'You already submitted this assignment.' using errcode = '23505';
  end if;
  if p_answers is null or octet_length(p_answers::text) > 100000 then
    raise exception 'Answers are missing or too large.' using errcode = '22023';
  end if;
  if a.questions is not null and jsonb_typeof(a.questions) <> 'array' then
    raise exception 'Invalid assignment question configuration.' using errcode = '22000';
  end if;
  question_count := coalesce(jsonb_array_length(a.questions), 0);
  if question_count > 0 then
    if jsonb_typeof(p_answers) <> 'array' then
      raise exception 'Answers must be an array.' using errcode = '22023';
    end if;
    if jsonb_array_length(p_answers) <> question_count then
      raise exception 'Answer each question exactly once.' using errcode = '22023';
    end if;
    if (select count(distinct q->>'id') from jsonb_array_elements(a.questions) q) <> question_count then
      raise exception 'Invalid assignment question IDs.' using errcode = '22000';
    end if;
    if (select count(distinct x->>'id') from jsonb_array_elements(p_answers) x) <> question_count then
      raise exception 'Duplicate or missing answer IDs.' using errcode = '22023';
    end if;
    select answers into answer_key from public.assignment_answer_keys where assignment_id = a.id;
    if answer_key is null or jsonb_typeof(answer_key) <> 'array' then
      raise exception 'Answer key missing for this test.' using errcode = '22000';
    end if;
    if jsonb_array_length(answer_key) <> question_count
      or (select count(distinct k->>'id') from jsonb_array_elements(answer_key) k) <> question_count then
      raise exception 'Invalid answer key.' using errcode = '22000';
    end if;
    for question in select value from jsonb_array_elements(a.questions) loop
      select value into answer from jsonb_array_elements(p_answers) where value->>'id' = question->>'id';
      if answer is null or jsonb_typeof(answer->'selected_index') is distinct from 'number'
        or (answer->>'selected_index') !~ '^[0-9]{1,3}$' then
        raise exception 'Invalid question or option index.' using errcode = '22023';
      end if;
      selected := (answer->>'selected_index')::integer;
      if jsonb_typeof(question->'options') is distinct from 'array' then
        raise exception 'Invalid question options.' using errcode = '22000';
      end if;
      if selected >= jsonb_array_length(question->'options') then
        raise exception 'Option index is out of range.' using errcode = '22023';
      end if;
      select value into correct_answer from jsonb_array_elements(answer_key) where value->>'id' = question->>'id';
      if correct_answer is null or jsonb_typeof(correct_answer->'correct_index') is distinct from 'number'
        or (correct_answer->>'correct_index') !~ '^[0-9]{1,3}$' then
        raise exception 'Invalid answer key.' using errcode = '22000';
      end if;
      if (correct_answer->>'correct_index')::integer >= jsonb_array_length(question->'options') then
        raise exception 'Invalid answer key option.' using errcode = '22000';
      end if;
      if selected = (correct_answer->>'correct_index')::integer then total := total + 1; end if;
    end loop;
    insert into public.submissions (assignment_id, student_id, answers, score, max_score, passed, status, graded_at)
      values (a.id, caller, p_answers, total, question_count,
        case when a.pass_score is null then null else total >= a.pass_score end, 'graded', now()) returning * into result;
  else
    if jsonb_typeof(p_answers) <> 'object' or jsonb_typeof(p_answers->'text') is distinct from 'string'
      or length(btrim(p_answers->>'text')) = 0 or length(p_answers->>'text') > 20000 then
      raise exception 'A text answer of 1 to 20000 characters is required.' using errcode = '22023';
    end if;
    insert into public.submissions (assignment_id, student_id, answers, status)
      values (a.id, caller, jsonb_build_object('text', btrim(p_answers->>'text')), 'submitted') returning * into result;
  end if;
  -- Do not reveal an auto-grade in the submission response. The existing SELECT
  -- policy still needs a separate result-release redesign (tracked in docs).
  result.score := null;
  result.max_score := null;
  result.passed := null;
  result.graded_at := null;
  result.status := 'submitted';
  return result;
end;
$$;
revoke all on function public.submit_assignment(uuid, jsonb) from public, anon;
grant execute on function public.submit_assignment(uuid, jsonb) to authenticated;
commit;
