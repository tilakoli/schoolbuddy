-- School Buddy: student submissions + grading, layered on top of
-- scripts/seed-full-dataset.sql — for testing Performance, the Students
-- detail page, and the teacher grading flow without submitting/grading by
-- hand through the UI for every student.
--
-- Deliberately mixes states across both assignment types so every branch of
-- those screens has something to show: not-submitted, submitted-awaiting-
-- grade, graded-and-passed, and graded-and-failed.
--
-- Safe to re-run any time, including after manually submitting/grading
-- something through the app yourself in the meantime — every insert below
-- upserts on (assignment_id, student_id) instead of erroring on the
-- conflict, so re-running always lands on exactly the state described here.
--
-- Run in Supabase Dashboard -> SQL Editor, after scripts/seed-full-dataset.sql.

do $$
declare
  -- students (see seed-full-dataset.sql for who's in which class)
  s1 uuid; -- Aarav Patel    (Class 9)
  s2 uuid; -- Diya Shah      (Class 9)
  s3 uuid; -- Kabir Mehta    (Class 9)
  s4 uuid; -- Isha Reddy     (Class 9)
  s5 uuid; -- Arjun Nair     (Class 10)
  s6 uuid; -- Meera Iyer     (Class 10)
  s7 uuid; -- Rohan Joshi    (Class 10)
  s8 uuid; -- Sneha Rao      (Class 10)

  -- assignments, looked up by title (unique within this seed dataset)
  asg_maths_quiz   uuid;
  asg_english_quiz uuid;
  asg_science_essay uuid;
  asg_history_essay uuid;
begin
  select id into s1 from public.profiles where email = 'aarav.patel.test@schoolbuddy.dev';
  select id into s2 from public.profiles where email = 'diya.shah.test@schoolbuddy.dev';
  select id into s3 from public.profiles where email = 'kabir.mehta.test@schoolbuddy.dev';
  select id into s4 from public.profiles where email = 'isha.reddy.test@schoolbuddy.dev';
  select id into s5 from public.profiles where email = 'arjun.nair.test@schoolbuddy.dev';
  select id into s6 from public.profiles where email = 'meera.iyer.test@schoolbuddy.dev';
  select id into s7 from public.profiles where email = 'rohan.joshi.test@schoolbuddy.dev';
  select id into s8 from public.profiles where email = 'sneha.rao.test@schoolbuddy.dev';

  select id into asg_maths_quiz from public.assignments where title = 'Linear Equations Quiz';
  select id into asg_english_quiz from public.assignments where title = 'Poetry Analysis Quiz';
  select id into asg_science_essay from public.assignments where title = 'States of Matter — Short Answer';
  select id into asg_history_essay from public.assignments where title = 'World War I Essay';

  if s1 is null or asg_maths_quiz is null then
    raise exception 'Run scripts/seed-full-dataset.sql first.';
  end if;

  -- 1. Maths MCQ quiz (Class 9 — s1..s4). Correct answers per the answer key
  -- in seed-full-dataset.sql: q1=1, q2=1, q3=2, q4=1. pass_score=3.
  -- Mirrors exactly what POST /api/submissions/submit computes and writes,
  -- so this data is indistinguishable from a real submission.
  insert into public.submissions (assignment_id, student_id, answers, score, max_score, passed, status, graded_at) values
    -- Aarav: all correct — 4/4, passed
    (asg_maths_quiz, s1,
     '[{"id":"q1","selected_index":1},{"id":"q2","selected_index":1},{"id":"q3","selected_index":2},{"id":"q4","selected_index":1}]'::jsonb,
     4, 4, true, 'graded', now() - interval '2 days'),
    -- Diya: 3 correct — right at the pass line
    (asg_maths_quiz, s2,
     '[{"id":"q1","selected_index":1},{"id":"q2","selected_index":1},{"id":"q3","selected_index":2},{"id":"q4","selected_index":0}]'::jsonb,
     3, 4, true, 'graded', now() - interval '2 days'),
    -- Kabir: 2 correct — below the pass line
    (asg_maths_quiz, s3,
     '[{"id":"q1","selected_index":1},{"id":"q2","selected_index":0},{"id":"q3","selected_index":2},{"id":"q4","selected_index":0}]'::jsonb,
     2, 4, false, 'graded', now() - interval '2 days')
  on conflict (assignment_id, student_id) do update set
    answers = excluded.answers, score = excluded.score, max_score = excluded.max_score,
    passed = excluded.passed, status = excluded.status, graded_at = excluded.graded_at, feedback = null;
    -- Isha: no submission — leaves "Not submitted" visible on her row.

  -- 2. English MCQ quiz (Class 10 — s5..s8). Correct answers: q1=1, q2=2,
  -- q3=1. pass_score=2.
  insert into public.submissions (assignment_id, student_id, answers, score, max_score, passed, status, graded_at) values
    -- Arjun: all correct — 3/3
    (asg_english_quiz, s5,
     '[{"id":"q1","selected_index":1},{"id":"q2","selected_index":2},{"id":"q3","selected_index":1}]'::jsonb,
     3, 3, true, 'graded', now() - interval '1 day'),
    -- Meera: 1 correct — below the pass line
    (asg_english_quiz, s6,
     '[{"id":"q1","selected_index":0},{"id":"q2","selected_index":2},{"id":"q3","selected_index":0}]'::jsonb,
     1, 3, false, 'graded', now() - interval '1 day'),
    -- Sneha: all correct — 3/3
    (asg_english_quiz, s8,
     '[{"id":"q1","selected_index":1},{"id":"q2","selected_index":2},{"id":"q3","selected_index":1}]'::jsonb,
     3, 3, true, 'graded', now() - interval '1 day')
  on conflict (assignment_id, student_id) do update set
    answers = excluded.answers, score = excluded.score, max_score = excluded.max_score,
    passed = excluded.passed, status = excluded.status, graded_at = excluded.graded_at, feedback = null;
    -- Rohan: no submission.

  -- 3. Science freeform essay (Class 9 — no rubric, plain teacher-entered
  -- score, matching what GradeForm writes when an assignment has no rubric).
  insert into public.submissions (assignment_id, student_id, answers, score, max_score, passed, status, feedback, graded_at) values
    -- Aarav: graded, passed
    (asg_science_essay, s1, '{"text":"Solids have particles packed tightly in a fixed pattern, like ice. Liquids have particles close together but able to move past each other, like water. Gases have particles far apart moving freely, like the air we breathe."}'::jsonb,
     8, 10, true, 'graded', 'Good examples for each state — mention what happens during the transitions (melting, evaporation) for full marks next time.', now() - interval '1 day'),
    -- Isha: graded, failed
    (asg_science_essay, s4, '{"text":"Solid is hard. Liquid is wet. Gas is air."}'::jsonb,
     4, 10, false, 'graded', 'Too brief — each answer needs to explain the particle arrangement, not just describe the state in one word, and include a real-world example.', now() - interval '1 day')
  on conflict (assignment_id, student_id) do update set
    answers = excluded.answers, score = excluded.score, max_score = excluded.max_score,
    passed = excluded.passed, status = excluded.status, feedback = excluded.feedback, graded_at = excluded.graded_at;
  -- Diya: submitted, awaiting grade (tests the teacher's "needs grading" queue).
  insert into public.submissions (assignment_id, student_id, answers, status) values
    (asg_science_essay, s2, '{"text":"Solids keep their shape because their particles are packed closely in a fixed arrangement and only vibrate in place. Liquids take the shape of their container since particles can slide past each other while staying close together — water is a good example. Gases spread out to fill any container because their particles move fast and are far apart, like the air in a balloon."}'::jsonb,
     'submitted')
  on conflict (assignment_id, student_id) do update set
    answers = excluded.answers, status = excluded.status,
    score = null, max_score = null, passed = null, feedback = null, graded_at = null;
  -- Kabir: no submission.

  -- 4. History freeform essay (Class 10).
  insert into public.submissions (assignment_id, student_id, answers, score, max_score, passed, status, feedback, graded_at) values
    -- Arjun: graded, passed
    (asg_history_essay, s5, '{"text":"World War I began in 1914 after the assassination of Archduke Franz Ferdinand, which set off a chain reaction through Europe''s alliance system. Trench warfare on the Western Front caused massive casualties for little territorial gain, and new weapons like machine guns, poison gas, and tanks changed how wars were fought. The war ended in 1918, and the Treaty of Versailles placed harsh terms on Germany that left lasting resentment — a major factor in the outbreak of World War II two decades later."}'::jsonb,
     9, 10, true, 'graded', 'Strong essay — clear cause-and-effect structure and you connected it to WWII well.', now() - interval '3 hours'),
    -- Rohan: graded, failed
    (asg_history_essay, s7, '{"text":"The war started because of an assassination and countries had alliances so they all got pulled in. It was fought in trenches and a lot of people died. It ended in 1918."}'::jsonb,
     4, 10, false, 'graded', 'This is under the word count and missing the required detail — expand on the causes, the new technologies used, and the lasting impact of the Treaty of Versailles.', now() - interval '3 hours')
  on conflict (assignment_id, student_id) do update set
    answers = excluded.answers, score = excluded.score, max_score = excluded.max_score,
    passed = excluded.passed, status = excluded.status, feedback = excluded.feedback, graded_at = excluded.graded_at;
  -- Meera: submitted, awaiting grade.
  insert into public.submissions (assignment_id, student_id, answers, status) values
    (asg_history_essay, s6, '{"text":"World War I broke out in 1914 following the assassination of Archduke Franz Ferdinand of Austria-Hungary, which triggered a web of alliances that pulled in most of Europe''s major powers. The Western Front became known for brutal trench warfare, where armies traded enormous casualties for minimal territorial gains. The introduction of machine guns, poison gas, and tanks made this the first major conflict shaped by industrial-era military technology. When the war ended in 1918, the Treaty of Versailles imposed heavy reparations and territorial losses on Germany, breeding resentment that historians point to as a key cause of World War II just over twenty years later."}'::jsonb,
     'submitted')
  on conflict (assignment_id, student_id) do update set
    answers = excluded.answers, status = excluded.status,
    score = null, max_score = null, passed = null, feedback = null, graded_at = null;
  -- Sneha: no submission.
end $$;

-- Verify:
-- select a.title, p.full_name, s.status, s.score, s.max_score, s.passed
-- from public.submissions s
-- join public.assignments a on a.id = s.assignment_id
-- join public.profiles p on p.id = s.student_id
-- order by a.title, p.full_name;
